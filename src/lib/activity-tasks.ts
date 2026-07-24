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

function deriveParentStatus(
  list: Pick<ActivitySubTask, "status">[],
): TaskRow["status"] {
  if (list.length === 0) return "success";
  const done = list.filter((s) => s.status === "success").length;
  const failed = list.filter((s) => s.status === "failed").length;
  if (failed === 0) return "success";
  if (done === 0) return "failed";
  return "partial";
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
    status: "success",
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
  tasksActions.update(parent.id, {
    total: list.length,
    done,
    failed,
    status: deriveParentStatus(list),
    endTime: sub.createdAt,
  });
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

/* ============================================================ */
/* 初始种子：与 messages-mock / friends-mock 完全一致                */
/* ============================================================ */

let _seeded = false;

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

      // ---- 私信台账：以 messages-mock 中的实际出站消息为准 ----
      // 出站 status: sent -> 成功；failed -> 失败；sending -> 暂不入台账（尚未终态）
      const { accounts: msgAccounts, conversations } = getInboxData();
      const accById = new Map(msgAccounts.map((a) => [a.id, a]));
      // 按时间升序，保持子任务插入顺序与实际发生顺序一致
      const dmRecords: Array<{
        accId: string;
        peerName: string;
        text: string;
        status: "success" | "failed";
        time: string;
        failReason?: string;
      }> = [];
      conversations.forEach((conv) => {
        conv.messages.forEach((m) => {
          if (m.direction !== "out") return;
          if (m.status === "sending") return; // 未落地
          const st: "success" | "failed" = m.status === "failed" ? "failed" : "success";
          dmRecords.push({
            accId: conv.accountId,
            peerName: conv.peerName,
            text: m.sourceZh ?? m.text,
            status: st,
            time: m.time,
            failReason: m.failReason,
          });
        });
      });
      dmRecords.sort((a, b) => (a.time < b.time ? -1 : 1));
      dmRecords.forEach((r) => {
        const acc = accById.get(r.accId);
        if (!acc) return;
        recordActivity({
          accountId: acc.id,
          accountName: acc.username,
          platform: acc.platform,
          source: "dm",
          target: r.peerName,
          status: r.status,
          detail: r.status === "failed" && r.failReason
            ? `${r.text}（${r.failReason}）`
            : r.text,
          createdAt: r.time,
        });
      });

      // ---- 好友通过/拒绝台账：以 friends-mock 中已处理的申请为准 ----
      const { accounts: frAccounts, requests } = getFriendData();
      const frAccById = new Map(frAccounts.map((a) => [a.id, a]));
      const decided = requests
        .filter((r) => r.status === "accepted" || r.status === "rejected")
        .slice()
        .sort((a, b) => ((a.decidedAt ?? "") < (b.decidedAt ?? "") ? -1 : 1));
      decided.forEach((r) => {
        const acc = frAccById.get(r.accountId);
        if (!acc) return;
        const isApprove = r.status === "accepted";
        recordActivity({
          accountId: acc.id,
          accountName: acc.username,
          platform: acc.platform,
          source: isApprove ? "friend-approve" : "friend-reject",
          target: r.peerName,
          status: "success",
          detail: isApprove
            ? r.welcomeZh ?? r.note ?? "已通过好友申请"
            : r.publicReasonZh ?? r.note ?? "已拒绝好友申请",
          createdAt: r.decidedAt ?? r.requestedAt,
        });
      });
    } catch (err) {
      console.warn("[activity-tasks] seed failed", err);
    }
  })();
}
