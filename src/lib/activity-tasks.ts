// 手动运营台账（私信/好友通过/好友拒绝）→ 任务列表 父任务/子任务 桥接
//
// 设计说明（作为产品经理的评估）：
// 现有「任务列表」承载的是「批量运营任务」，字段带 total/done/failed、可终止、可编辑，
// 语义偏向"计划性批量执行"。而私信管理、好友管理里的每一次「回复 / 通过 / 拒绝」，
// 语义偏向"人工手动动作的台账 / 操作日志"。直接把每次动作当作独立父任务会污染列表，
// 而完全脱离任务列表又失去了统一审计视角。
//
// 折衷方案：按（账号 × 来源）聚合父任务，一次动作 = 一条子任务：
//   · 每个「有私信」的账号 → 1 个「XXX · 私信手动回复」父任务
//   · 每个执行过通过的账号 → 1 个「XXX · 通过好友申请」父任务
//   · 每个执行过拒绝的账号 → 1 个「XXX · 拒绝好友申请」父任务
// 父任务 status 恒为 running（持续存在的运营台账），total 随子任务累加，done/failed
// 反映成功/失败次数。这样在任务列表中不会为每次动作创建新的父任务。

import { useSyncExternalStore } from "react";
import {
  tasksActions,
  fmtNow,
  genTaskId,
  type TaskRow,
  type Platform,
} from "./operations-store";

export type ActivitySource = "dm" | "friend-approve" | "friend-reject";

export const ACTIVITY_SOURCE_LABEL: Record<ActivitySource, string> = {
  dm: "私信手动回复",
  "friend-approve": "通过好友申请",
  "friend-reject": "拒绝好友申请",
};

export const ACTIVITY_ACTION_LABEL: Record<ActivitySource, string> = {
  dm: "发送私信",
  "friend-approve": "通过好友申请",
  "friend-reject": "拒绝好友申请",
};

export interface ActivitySubTask {
  id: string;
  parentId: string;
  accountId: string;
  accountName: string;
  platform: Platform;
  action: string;
  /** 对方昵称/账号，用于「目标」列展示 */
  target: string;
  status: "success" | "failed";
  createdAt: string;
  /** 摘要：私信内容 / 欢迎语 / 拒绝说明 */
  detail?: string;
}

const _byParent = new Map<string, ActivitySubTask[]>();
const _parentIdByKey = new Map<string, string>();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const keyOf = (accountId: string, source: ActivitySource) => `${accountId}::${source}`;

export function findActivityParentId(
  accountId: string,
  source: ActivitySource,
): string | undefined {
  return _parentIdByKey.get(keyOf(accountId, source));
}

export function isActivityParent(parentId: string): boolean {
  return _byParent.has(parentId);
}

function ensureActivityParent(params: {
  accountId: string;
  accountName: string;
  platform: Platform;
  source: ActivitySource;
  createdAt?: string;
}): TaskRow {
  const key = keyOf(params.accountId, params.source);
  const existingId = _parentIdByKey.get(key);
  if (existingId) {
    const t = tasksActions.get().find((x) => x.id === existingId);
    if (t) return t;
  }
  const parent: TaskRow = {
    id: genTaskId(),
    name: `${params.accountName} · ${ACTIVITY_SOURCE_LABEL[params.source]}`,
    subtype: "action",
    platforms: [params.platform],
    total: 0,
    done: 0,
    failed: 0,
    status: "running",
    description: `账号「${params.accountName}」在 ${params.platform} 上${ACTIVITY_SOURCE_LABEL[params.source]}的运营台账，每次${ACTIVITY_ACTION_LABEL[params.source]}都会记录为子任务，便于统一审计与日志追溯。`,
    createdBy: "系统",
    createdAt: params.createdAt ?? fmtNow(),
    source: params.source,
    sourceAccountId: params.accountId,
  };
  tasksActions.add(parent);
  _parentIdByKey.set(key, parent.id);
  _byParent.set(parent.id, []);
  return parent;
}

export function recordActivity(params: {
  accountId: string;
  accountName: string;
  platform: Platform;
  source: ActivitySource;
  target: string;
  status: "success" | "failed";
  detail?: string;
  createdAt?: string;
}): ActivitySubTask {
  const parent = ensureActivityParent(params);
  const list = _byParent.get(parent.id) ?? [];
  const subId = `${parent.id}-${String(list.length + 1).padStart(3, "0")}`;
  const sub: ActivitySubTask = {
    id: subId,
    parentId: parent.id,
    accountId: params.accountId,
    accountName: params.accountName,
    platform: params.platform,
    action: ACTIVITY_ACTION_LABEL[params.source],
    target: params.target,
    status: params.status,
    createdAt: params.createdAt ?? fmtNow(),
    detail: params.detail,
  };
  list.push(sub);
  _byParent.set(parent.id, list);
  const done = list.filter((s) => s.status === "success").length;
  const failed = list.filter((s) => s.status === "failed").length;
  tasksActions.update(parent.id, { total: list.length, done, failed });
  emit();
  return sub;
}

const EMPTY: ActivitySubTask[] = [];
export function useActivitySubtasks(parentId: string): ActivitySubTask[] {
  return useSyncExternalStore(
    subscribe,
    () => _byParent.get(parentId) ?? EMPTY,
    () => _byParent.get(parentId) ?? EMPTY,
  );
}

/* ============================================================ */
/* 初始种子：为已有 mock 会话/好友数据补齐历史台账                */
/* ============================================================ */

let _seeded = false;

/** 用确定的时间戳，避免 SSR/CSR 水合不一致 */
function seedTs(dayOffset: number, minute: number): string {
  const d = new Date(2026, 4, 20 + dayOffset, 10, minute, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function ensureActivityTasksSeeded() {
  if (_seeded) return;
  _seeded = true;
  if (typeof window === "undefined") return;
  (async () => {
    try {
      const [{ getInboxData }, { getFriendData }] = await Promise.all([
        import("./messages-mock"),
        import("./friends-mock"),
      ]);
      const { accounts: msgAccounts, conversations } = getInboxData();
      msgAccounts.slice(0, 4).forEach((acc, ai) => {
        const convs = conversations.filter((c) => c.accountId === acc.id).slice(0, 2);
        convs.forEach((conv, ci) => {
          const base = ai * 6 + ci * 3;
          recordActivity({
            accountId: acc.id, accountName: acc.username, platform: acc.platform,
            source: "dm", target: conv.peerName, status: "success",
            detail: "感谢您的咨询，我们已收到消息，稍后专员会与您联系。",
            createdAt: seedTs(ai, base),
          });
          recordActivity({
            accountId: acc.id, accountName: acc.username, platform: acc.platform,
            source: "dm", target: conv.peerName, status: "success",
            detail: "促销活动详情请查看主页置顶帖。",
            createdAt: seedTs(ai, base + 1),
          });
          if (ci === 0) {
            recordActivity({
              accountId: acc.id, accountName: acc.username, platform: acc.platform,
              source: "dm", target: conv.peerName, status: "failed",
              detail: "网络异常，消息未送达。",
              createdAt: seedTs(ai, base + 2),
            });
          }
        });
      });
      const { accounts: frAccounts, requests } = getFriendData();
      frAccounts.slice(0, 4).forEach((acc, ai) => {
        const accepted = requests.filter((r) => r.accountId === acc.id && r.status === "accepted").slice(0, 3);
        const rejected = requests.filter((r) => r.accountId === acc.id && r.status === "rejected").slice(0, 2);
        accepted.forEach((r, i) => {
          recordActivity({
            accountId: acc.id, accountName: acc.username, platform: acc.platform,
            source: "friend-approve", target: r.peerName, status: "success",
            detail: r.welcomeZh ?? "已通过好友申请",
            createdAt: seedTs(ai, i * 2),
          });
        });
        rejected.forEach((r, i) => {
          recordActivity({
            accountId: acc.id, accountName: acc.username, platform: acc.platform,
            source: "friend-reject", target: r.peerName, status: "success",
            detail: r.publicReasonZh ?? "已拒绝好友申请",
            createdAt: seedTs(ai, 10 + i * 2),
          });
        });
      });
    } catch (err) {
      console.warn("[activity-tasks] seed failed", err);
    }
  })();
}
