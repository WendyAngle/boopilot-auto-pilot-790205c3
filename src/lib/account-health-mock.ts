// 账号健康看板：状态映射、处置台账、趋势数据（前端 mock + 轻量 store）
import { useSyncExternalStore } from "react";
import {
  seedManagedAccounts,
  type AccountStatus,
  type ManagedAccount,
  type Platform,
  OPERATORS,
} from "@/lib/managed-account-mock";

/** 平台侧状态文案（附件表 1） */
export const PLATFORM_STATUS_MAP: Record<
  AccountStatus,
  Record<Platform, string>
> = {
  pending: {
    Facebook: "——",
    Tiktok: "——",
    "Twitter/X": "——",
    WhatsApp: "——",
    Instagram: "——",
  },
  normal: {
    Facebook: "正常 (Active)",
    Tiktok: "正常 (Active)",
    "Twitter/X": "正常 (Active)",
    WhatsApp: "正常 (Active)",
    Instagram: "正常 (Active)",
  },
  disabled: {
    Facebook: "功能受限 (Restricted)",
    Tiktok: "功能受限 (Feature Restriction)",
    "Twitter/X": "锁定 (Locked) / 只读受限 (Limited / Read-only)",
    WhatsApp: "受限 (Restricted)",
    Instagram: "功能受限 (Feature Restriction)",
  },
  risk: {
    Facebook: "安全锁定 (Locked/Checkpoint) / 暂停 (Suspended)",
    Tiktok: "临时暂停 (Temporary Suspension)",
    "Twitter/X": "临时暂停 (Temporary Suspension)",
    WhatsApp: "临时封禁 (Temporarily Banned)",
    Instagram: "暂停 (Suspended)",
  },
  fail: {
    Facebook: "已禁用 (Disabled) / 已封禁 (Banned)",
    Tiktok: "永久封禁 (Permanent Ban)",
    "Twitter/X": "永久暂停 (Permanent Suspension)",
    WhatsApp: "永久封禁 (Banned)",
    Instagram: "禁用 (Disabled) / 删除 (Deleted)",
  },
};

/** 状态整体说明（附件表 1 最后一列） */
export const STATUS_EXPLAIN: Record<AccountStatus, string> = {
  pending: "首次导入运营系统，需要运营人工确认账号状态并标记为与平台一致的状态",
  normal: "可登录，功能操作不受限",
  disabled: "可登录，功能受限，可申诉或验证或等待期满【需要人工介入：处理并标记说明】",
  risk: "不可登录，可申诉或验证或等待期满【需要人工介入：处理并标记说明】",
  fail: "永久封号，不可申诉",
};

/** 受限/风控的典型说明（附件表 2 的“不可操作”归纳） */
const NOTE_POOL: Record<Platform, { disabled: string[]; risk: string[] }> = {
  Facebook: {
    disabled: [
      "功能受限-不可发帖",
      "功能受限-不可评论",
      "功能受限-不可创建 Page / 投放广告",
    ],
    risk: ["安全锁定-需完成身份验证后解锁", "暂停-违反社区准则，全部功能不可用"],
  },
  Tiktok: {
    disabled: ["功能受限-不可发帖", "功能受限-不可私信", "功能受限-不可评论"],
    risk: ["临时暂停-违规累计/内容审查中"],
  },
  "Twitter/X": {
    disabled: ["只读受限-不可发帖/转推/点赞", "锁定-需完成验证后发帖"],
    risk: ["临时暂停-首次违规，通常 24 小时~7 天"],
  },
  WhatsApp: {
    disabled: ["受限-不可给新联系人发起聊天/建群"],
    risk: ["临时封禁-检测到第三方 App / 批量抓取"],
  },
  Instagram: {
    disabled: ["功能受限-部分功能不可用（内容被移除）"],
    risk: ["暂停-违反社区准则或服务条款"],
  },
};

/** 附件表 2：申诉 / 恢复方式 */
export const HANDLE_METHODS = [
  "等待期满",
  "发起申诉",
  "身份验证",
  "换设备/IP 重登",
  "更换官方 App",
  "停用账号",
  "其他",
] as const;
export type HandleMethod = (typeof HANDLE_METHODS)[number];

export const HANDLE_RESULTS = ["已恢复", "仍受限", "永久封禁", "待观察"] as const;
export type HandleResult = (typeof HANDLE_RESULTS)[number];

/** 平台 + 状态 → 推荐恢复方式提示（附件表 2） */
export function recommendMethods(
  platform: Platform,
  status: AccountStatus,
): HandleMethod[] {
  if (status === "disabled") {
    if (platform === "WhatsApp") return ["等待期满", "更换官方 App"];
    if (platform === "Twitter/X") return ["身份验证", "等待期满"];
    return ["等待期满", "发起申诉"];
  }
  if (status === "risk") {
    if (platform === "Facebook") return ["身份验证", "发起申诉", "换设备/IP 重登"];
    if (platform === "WhatsApp") return ["等待期满", "更换官方 App"];
    return ["等待期满", "发起申诉"];
  }
  if (status === "fail") return ["停用账号"];
  return ["其他"];
}

export type MarkSource = "system" | "manual";
export type HandleState = "todo" | "doing" | "done";

export const MARK_SOURCE_LABEL: Record<MarkSource, string> = {
  system: "系统标记",
  manual: "人工确认",
};
export const HANDLE_STATE_LABEL: Record<HandleState, string> = {
  todo: "待处理",
  doing: "处理中",
  done: "已处理",
};
export const HANDLE_STATE_CLS: Record<HandleState, string> = {
  todo: "bg-destructive/10 text-destructive border-destructive/30",
  doing: "bg-warning/10 text-warning border-warning/30",
  done: "bg-success/10 text-success border-success/30",
};

export interface HealthTimelineItem {
  at: string;
  text: string;
  by: string;
}

export interface AccountHealthRecord {
  accountId: string;
  platform: Platform;
  username: string;
  platformId: string;
  avatar: string;
  tenantId: string;
  tenantName: string;
  status: AccountStatus;
  platformStatus: string;
  markSource: MarkSource;
  statusNote: string;
  needsManual: boolean;
  handleState: HandleState;
  handleMethod?: HandleMethod;
  handleResult?: HandleResult;
  handleNote?: string;
  handler?: string;
  markedAt: string;
  handledAt?: string;
  timeline: HealthTimelineItem[];
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dayStr(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowStr() {
  const d = new Date();
  return `${dayStr(0)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildRecord(a: ManagedAccount, i: number): AccountHealthRecord {
  const needsManual = a.accountStatus === "disabled" || a.accountStatus === "risk";
  const pool = NOTE_POOL[a.platform];
  const statusNote =
    a.accountStatus === "disabled"
      ? pool.disabled[i % pool.disabled.length]
      : a.accountStatus === "risk"
        ? pool.risk[i % pool.risk.length]
        : a.accountStatus === "fail"
          ? "永久封号，不可申诉"
          : a.accountStatus === "pending"
            ? "首次导入，待运营确认平台真实状态"
            : "可登录，功能操作不受限";
  const markSource: MarkSource =
    a.accountStatus === "pending" ? "system" : i % 3 === 0 ? "manual" : "system";
  const handleState: HandleState = !needsManual
    ? "done"
    : i % 3 === 0
      ? "done"
      : i % 3 === 1
        ? "doing"
        : "todo";
  const methods = recommendMethods(a.platform, a.accountStatus);
  const markedAt = `${dayStr((i % 12) + 1)} ${pad(9 + (i % 9))}:${pad((i * 7) % 60)}`;
  const handler = OPERATORS[i % OPERATORS.length];
  const rec: AccountHealthRecord = {
    accountId: a.id,
    platform: a.platform,
    username: a.username,
    platformId: a.platformId,
    avatar: a.avatar,
    tenantId: a.tenantId,
    tenantName: a.tenantName,
    status: a.accountStatus,
    platformStatus: PLATFORM_STATUS_MAP[a.accountStatus][a.platform],
    markSource,
    statusNote,
    needsManual,
    handleState: needsManual ? handleState : "done",
    markedAt,
    timeline: [
      {
        at: markedAt,
        text: `${markSource === "system" ? "系统监测" : "人工确认"}标记为「${statusNote}」`,
        by: markSource === "system" ? "系统" : handler,
      },
    ],
  };
  if (needsManual && handleState !== "todo") {
    rec.handleMethod = methods[i % methods.length];
    rec.handler = handler;
    rec.handledAt = `${dayStr(i % 6)} ${pad(10 + (i % 8))}:${pad((i * 13) % 60)}`;
    rec.handleNote =
      handleState === "done"
        ? `已按「${rec.handleMethod}」处置完成`
        : `已提交「${rec.handleMethod}」，等待平台响应`;
    rec.handleResult =
      handleState === "done" ? (i % 4 === 0 ? "仍受限" : "已恢复") : "待观察";
    rec.timeline.push({
      at: rec.handledAt,
      text: `${HANDLE_STATE_LABEL[handleState]} · ${rec.handleMethod} · 结果：${rec.handleResult}`,
      by: handler,
    });
  }
  return rec;
}

let state: AccountHealthRecord[] = seedManagedAccounts().map(buildRecord);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const healthActions = {
  /** 人工确认状态 */
  confirmStatus(
    id: string,
    input: { status: AccountStatus; platformStatus: string; note: string; by: string },
  ) {
    state = state.map((r) =>
      r.accountId !== id
        ? r
        : {
            ...r,
            status: input.status,
            platformStatus: input.platformStatus,
            statusNote: input.note,
            markSource: "manual",
            needsManual: input.status === "disabled" || input.status === "risk",
            handleState:
              input.status === "disabled" || input.status === "risk" ? "todo" : "done",
            markedAt: nowStr(),
            timeline: [
              ...r.timeline,
              {
                at: nowStr(),
                text: `人工确认状态为「${input.platformStatus}」：${input.note}`,
                by: input.by,
              },
            ],
          },
    );
    emit();
  },
  /** 登记人工处理 */
  registerHandling(
    ids: string[],
    input: {
      handleState: HandleState;
      method: HandleMethod;
      result: HandleResult;
      note: string;
      by: string;
    },
  ) {
    const set = new Set(ids);
    state = state.map((r) =>
      !set.has(r.accountId)
        ? r
        : {
            ...r,
            handleState: input.handleState,
            handleMethod: input.method,
            handleResult: input.result,
            handleNote: input.note,
            handler: input.by,
            handledAt: nowStr(),
            timeline: [
              ...r.timeline,
              {
                at: nowStr(),
                text: `${HANDLE_STATE_LABEL[input.handleState]} · ${input.method} · 结果：${input.result}${input.note ? ` · ${input.note}` : ""}`,
                by: input.by,
              },
            ],
          },
    );
    emit();
  },
};

export function useAccountHealth(): AccountHealthRecord[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/* ---------------- 趋势数据 ---------------- */

export const STATUS_ORDER: AccountStatus[] = [
  "pending",
  "normal",
  "disabled",
  "risk",
  "fail",
];

export const STATUS_COLOR: Record<AccountStatus, string> = {
  pending: "var(--warning)",
  normal: "var(--success)",
  disabled: "#E6A23C",
  risk: "#9B5CFF",
  fail: "var(--destructive)",
};

export type TrendRange = "7d" | "14d" | "30d" | "custom";

export const RANGE_LABEL: Record<TrendRange, string> = {
  "7d": "近 7 天",
  "14d": "近两周",
  "30d": "近一个月",
  custom: "自定义",
};

function seededNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export type TrendPoint = { date: string } & Record<string, number | string>;

function counts(records: AccountHealthRecord[]) {
  const c: Record<AccountStatus, number> = {
    pending: 0,
    normal: 0,
    disabled: 0,
    risk: 0,
    fail: 0,
  };
  records.forEach((r) => (c[r.status] += 1));
  return c;
}

/** 生成 days 天的趋势序列，末日与当前真实统计对齐 */
export function buildTrend(
  records: AccountHealthRecord[],
  days: number,
  seedKey = 0,
): TrendPoint[] {
  const target = counts(records);
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const p: TrendPoint = { date: dayStr(i).slice(5) };
    STATUS_ORDER.forEach((s, si) => {
      if (i === 0) {
        p[s] = target[s];
        return;
      }
      const base = target[s];
      const drift = Math.round(
        (seededNoise(i * 7 + si * 31 + seedKey * 97) - 0.45) * Math.max(2, base * 0.35),
      );
      p[s] = Math.max(0, base + drift);
    });
    out.push(p);
  }
  return out;
}

export function daysOfRange(range: TrendRange, from?: string, to?: string): number {
  if (range === "7d") return 7;
  if (range === "14d") return 14;
  if (range === "30d") return 30;
  if (from && to) {
    const d = Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
    );
    return Math.min(90, Math.max(1, d + 1));
  }
  return 7;
}
