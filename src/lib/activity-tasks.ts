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
function seedTs(dayOffset: number, hour: number, minute: number): string {
  const d = new Date(2026, 4, 15 + dayOffset, hour, minute, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// 私信内容模版池（覆盖成功/失败多语义场景）
const DM_SUCCESS_TEMPLATES = [
  "感谢您的咨询，我们已收到消息，稍后专员会与您联系。",
  "促销活动详情请查看主页置顶帖，本周下单额外 9 折。",
  "您好，该款商品目前有现货，支持全球直邮，预计 5-7 个工作日送达。",
  "已为您登记需求，稍后我们会通过邮件发送详细报价单。",
  "感谢关注，新品将在下周一上架，敬请期待。",
  "这是我们的官方客服渠道，请放心沟通，如需发票请提供抬头。",
  "已收到您的反馈，我们会在 24 小时内跟进处理。",
  "您好，订单号已核对，正在为您加急处理，感谢耐心等待。",
  "促销码 WELCOME10 可享首单立减，有效期至月底。",
  "很高兴认识您，如有合作意向可加我们商务微信详聊。",
];
const DM_FAIL_TEMPLATES = [
  "网络异常，消息未送达，请稍后重试。",
  "对方账号临时限制接收私信，发送失败。",
  "触发平台风控，本条消息未成功送达。",
  "会话已被对方关闭，消息发送失败。",
];

// 好友通过欢迎语模版池
const APPROVE_TEMPLATES = [
  "感谢通过好友申请，期待与您进一步交流。",
  "您好，欢迎加为好友，如有产品咨询随时联系。",
  "很高兴认识您，稍后会发送品牌资料供您参考。",
  "已通过您的申请，欢迎关注我们的最新动态。",
  "感谢添加，我们正在筹备线上活动，欢迎参与。",
  "已通过好友申请，日常会分享行业资讯，希望对您有帮助。",
];
// 好友拒绝对外说明模版池
const REJECT_TEMPLATES = [
  "感谢关注，本账号暂不接受陌生好友，请通过官方渠道联系。",
  "抱歉，好友名额已满，如有业务合作请联系商务邮箱。",
  "您好，该账号仅用于品牌发布，暂不添加个人好友。",
  "感谢申请，请通过主页链接进入官网了解更多。",
  "近期账号频繁维护，暂不通过新好友申请，敬请谅解。",
];

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
      // ---- 私信台账：覆盖前 8 个账号，每账号最多 3 个会话，每会话 3-6 条子任务 ----
      const { accounts: msgAccounts, conversations } = getInboxData();
      msgAccounts.slice(0, 8).forEach((acc, ai) => {
        const convs = conversations.filter((c) => c.accountId === acc.id).slice(0, 3);
        convs.forEach((conv, ci) => {
          // 每个会话 3-6 条历史子任务
          const count = 3 + ((ai + ci) % 4); // 3~6
          for (let i = 0; i < count; i++) {
            // 每个会话最后一条 20% 概率失败，前面均为成功
            const isFail = i === count - 1 && (ai + ci) % 5 === 0;
            const pool = isFail ? DM_FAIL_TEMPLATES : DM_SUCCESS_TEMPLATES;
            const detail = pool[(ai * 7 + ci * 3 + i) % pool.length];
            recordActivity({
              accountId: acc.id,
              accountName: acc.username,
              platform: acc.platform,
              source: "dm",
              target: conv.peerName,
              status: isFail ? "failed" : "success",
              detail,
              createdAt: seedTs(ai, 9 + ci * 2, i * 7 + ci),
            });
          }
        });
      });

      // ---- 好友通过/拒绝台账：覆盖前 8 个账号 ----
      const { accounts: frAccounts, requests } = getFriendData();
      frAccounts.slice(0, 8).forEach((acc, ai) => {
        const accepted = requests
          .filter((r) => r.accountId === acc.id && r.status === "accepted")
          .slice(0, 5);
        const rejected = requests
          .filter((r) => r.accountId === acc.id && r.status === "rejected")
          .slice(0, 4);
        accepted.forEach((r, i) => {
          // 通过操作偶发失败（平台校验失败等）
          const isFail = i > 0 && (ai + i) % 7 === 0;
          recordActivity({
            accountId: acc.id,
            accountName: acc.username,
            platform: acc.platform,
            source: "friend-approve",
            target: r.peerName,
            status: isFail ? "failed" : "success",
            detail: isFail
              ? "平台校验未通过，通过操作失败，请稍后重试。"
              : r.welcomeZh ?? APPROVE_TEMPLATES[(ai + i) % APPROVE_TEMPLATES.length],
            createdAt: seedTs(ai, 14, i * 5),
          });
        });
        rejected.forEach((r, i) => {
          const isFail = i > 0 && (ai + i) % 6 === 0;
          recordActivity({
            accountId: acc.id,
            accountName: acc.username,
            platform: acc.platform,
            source: "friend-reject",
            target: r.peerName,
            status: isFail ? "failed" : "success",
            detail: isFail
              ? "请求已过期，拒绝操作失败。"
              : r.publicReasonZh ?? REJECT_TEMPLATES[(ai + i) % REJECT_TEMPLATES.length],
            createdAt: seedTs(ai, 16, i * 6),
          });
        });
      });
    } catch (err) {
      console.warn("[activity-tasks] seed failed", err);
    }
  })();
}
