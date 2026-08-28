// 任务诊断中心 mock 数据
//
// 设计要点（产品口径）：
// 所有板块（KPI / 趋势 / 分布 / 原因聚类 / 异常聚集 / 目标完成度 / 明细）
// 都从同一份「子任务执行记录」派生，保证任意筛选下各卡片数字互相自洽，
// 不会出现原型稿里「失败子任务 127 / 2.9%」与「失败率 28.6%」口径冲突的问题。

import { PLATFORMS, type Platform, type TaskCategory } from "./operations-store";

/* ---------------- 常量字典 ---------------- */

export type CauseKey =
  | "risk"
  | "detect"
  | "ai"
  | "device"
  | "session"
  | "network"
  | "timeout"
  | "business";

export const CAUSE_META: Record<
  CauseKey,
  { label: string; color: string; keywords: string; advice: string }
> = {
  risk: {
    label: "风控拦截",
    color: "var(--destructive)",
    keywords: "checkpoint / captcha / blocked / restricted",
    advice: "核查受影响账号是否批量触发风控，暂停该批账号的高频动作并更换代理出口",
  },
  detect: {
    label: "页面/元素检测失败",
    color: "#f59e0b",
    keywords: "首页检测失败 / not found / selector timeout",
    advice: "检查主页检测重试策略与选择器版本，必要时升级执行端脚本",
  },
  ai: {
    label: "智能体(AI)调用失败",
    color: "#8b5cf6",
    keywords: "智能体调用失败 / 工作流异常",
    advice: "查看 AI 工作流实例日志与模型配额，确认工作流版本是否回滚",
  },
  device: {
    label: "设备异常",
    color: "#06b6d4",
    keywords: "设备异常 / device error / 设备掉线",
    advice: "确认执行机心跳与占用释放，离线执行机从调度池摘除",
  },
  session: {
    label: "登录/会话失效",
    color: "#64748b",
    keywords: "登录失效 / session expired / token",
    advice: "触发批量重登校验，失效账号进入账号健康看板人工处置",
  },
  network: {
    label: "网络超时",
    color: "#94a3b8",
    keywords: "timeout / connection refused",
    advice: "检查代理延迟与出口连通性，高延迟代理暂时下线",
  },
  timeout: {
    label: "任务超时",
    color: "#eab308",
    keywords: "超过最长执行时间",
    advice: "评估单任务时长上限与并发峰值，拆分超大批次",
  },
  business: {
    label: "业务失败",
    color: "#ec4899",
    keywords: "目标账号异常 / 内容违规",
    advice: "校验目标账号有效性与文案合规，剔除失效目标",
  },
};

export const CAUSE_ORDER: CauseKey[] = [
  "risk", "detect", "ai", "device", "session", "network", "timeout", "business",
];

/** 权重：决定失败原因分布（风控 > 页面检测 > AI ...） */
const CAUSE_WEIGHT: [CauseKey, number][] = [
  ["risk", 30], ["detect", 20], ["ai", 14], ["device", 10],
  ["session", 8], ["network", 7], ["timeout", 6], ["business", 5],
];

export const DIAG_CATEGORIES: TaskCategory[] = [
  "nurture", "dm", "coview", "social-reach",
];

export const STEPS = [
  "任务落库", "任务接收", "设备占用校验", "设备准备", "代理准备", "任务转发",
  "浏览器启动", "AI工作流启动", "AI工作流执行", "主页检测", "账号运行态回写",
  "小Server终态处理", "设备锁释放",
] as const;

export const LOG_SOURCES = ["任务平台", "小Server", "执行网关", "AI工作流"] as const;

export const ACTIONS = [
  "浏览信息流", "点赞帖子", "发布评论", "发帖", "加好友", "发私信", "关注用户", "采集未读消息",
] as const;

/** 失败原因 → 高发步骤（保证归因链路合理） */
const CAUSE_STEPS: Record<CauseKey, string[]> = {
  risk: ["主页检测", "AI工作流执行"],
  detect: ["主页检测", "浏览器启动"],
  ai: ["AI工作流启动", "AI工作流执行"],
  device: ["设备准备", "设备占用校验", "设备锁释放"],
  session: ["主页检测", "账号运行态回写"],
  network: ["代理准备", "任务转发"],
  timeout: ["AI工作流执行", "小Server终态处理"],
  business: ["AI工作流执行", "账号运行态回写"],
};

const CAUSE_SOURCE: Record<CauseKey, (typeof LOG_SOURCES)[number]> = {
  risk: "AI工作流",
  detect: "AI工作流",
  ai: "AI工作流",
  device: "小Server",
  session: "执行网关",
  network: "执行网关",
  timeout: "任务平台",
  business: "AI工作流",
};

const CAUSE_TEXT: Record<CauseKey, string> = {
  risk: "current page is not Facebook home: https://www.facebook.com/checkpoint/1501092823525282/ — 账号被要求安全验证",
  detect: "首页检测失败（耗时16秒）：retry home detection after navigation 仍未命中主页特征元素",
  ai: "智能体调用失败：状态=页面滚动，workflow instance 未返回终态",
  device: "设备异常超过 20 分钟，Agent 心跳丢失",
  session: "登录态过期（session expired），需重新登录校验",
  network: "proxy connect timeout：出口代理 10s 内未建立连接",
  timeout: "超过最长执行时间，任务被系统强制终止",
  business: "目标账号异常：目标主页不存在或已注销",
};

export const KEYWORDS: { word: string; hot?: boolean }[] = [
  { word: "checkpoint", hot: true },
  { word: "home detection", hot: true },
  { word: "智能体调用失败", hot: true },
  { word: "设备异常" },
  { word: "session expired" },
  { word: "selector timeout" },
  { word: "proxy connect timeout" },
  { word: "超过最长执行时间" },
];

export const REGIONS = [
  "US/California", "US/Texas", "JP/Tokyo", "SG/Singapore",
  "ID/Jakarta", "MY/Kuala Lumpur", "DE/Frankfurt",
];

export type ProxyHealth = "可用" | "不可用" | "黑名单" | "高延迟";
export type MachineState = "运行中" | "已停止" | "离线";

/* ---------------- 确定性伪随机 ---------------- */

function h(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return (x >>> 0) / 4294967295;
}
const pick = <T,>(arr: readonly T[], seed: string): T =>
  arr[Math.floor(h(seed) * arr.length) % arr.length];
const int = (seed: string, min: number, max: number) =>
  min + Math.floor(h(seed) * (max - min + 1));

function pickCause(seed: string): CauseKey {
  const total = CAUSE_WEIGHT.reduce((s, [, w]) => s + w, 0);
  let r = h(seed) * total;
  for (const [k, w] of CAUSE_WEIGHT) {
    if ((r -= w) <= 0) return k;
  }
  return "risk";
}

/* ---------------- 资源池 ---------------- */

const ACCOUNT_POOL = [
  "boo.emily", "sunny_lin", "mika.chen", "alex.wong", "tina_lu", "kevin.zhao",
  "nina.park", "leo.tan", "cara.wu", "ryan.ho", "maya.sun", "eric.qin",
  "julia.deng", "sam.ito", "iris.feng", "noah.lim", "vera.cao", "ken.suzuki",
];

export const PROXY_POOL = Array.from({ length: 24 }, (_, i) => {
  const ip = `199.239.${4 + (i % 6)}.${20 + i * 7}`;
  const health: ProxyHealth =
    h(`ph${ip}`) > 0.86 ? "不可用" : h(`ph2${ip}`) > 0.92 ? "高延迟" : "可用";
  return {
    ip,
    region: pick(REGIONS, `pr${ip}`),
    latency: int(`pl${ip}`, 260, 1600),
    health,
  };
});

export const MACHINE_POOL = Array.from({ length: 9 }, (_, i) => {
  const name = i === 3 ? "DESKTOP-2UC77HF" : `WINDOWS-FKIHST${String.fromCharCode(65 + i)}`;
  return {
    name,
    type: i < 8 ? ("Windows虚拟机" as const) : ("云机" as const),
    ip: `10.20.${i + 1}.${11 + i * 3}`,
    state: (i === 3 ? "已停止" : "运行中") as MachineState,
  };
});

/** 任务名基础词（不含平台，运行时按实际平台拼接，避免"TikTok 养号"落在 Facebook 上） */
const TASK_NAME_BY_CATEGORY: Record<TaskCategory, string[]> = {
  nurture: ["日常养号", "养号计划", "冷启动养号"],
  dm: ["新客私信触达", "老客召回私信"],
  coview: ["账号同屏巡检", "同屏批量互动"],
  "social-reach": ["新品社媒触达", "达人社媒触达"],
  "friend-approve": ["好友申请自动通过"],
  "friend-reject": ["好友申请自动拒绝"],
};

/* ---------------- 子任务记录 ---------------- */

export interface SubTaskRec {
  id: string;
  taskId: string;
  taskName: string;
  category: TaskCategory;
  platform: Platform;
  account: string;
  action: string;
  step: string;
  logSource: string;
  cause: CauseKey | null;
  causeText: string;
  level: "ERROR" | "WARN";
  durationSec: number;
  retries: number;
  ts: number;
  state: "success" | "failed" | "running";
  proxyIp: string;
  machine: string;
  goalLabel: string;
  goalUnit: number;
}

const DAY = 86400_000;
/** 固定"当前时间"，保证 SSR / CSR 一致 */
export const NOW = new Date("2026-08-28T18:00:00+08:00").getTime();

function buildSubTasks(): SubTaskRec[] {
  const out: SubTaskRec[] = [];
  const TOTAL = 1800;
  for (let i = 0; i < TOTAL; i++) {
    const s = `st${i}`;
    const category = pick(DIAG_CATEGORIES, `c${s}`);
    // Facebook 占比更高，符合实测数据
    const platform: Platform =
      h(`p${s}`) < 0.5 ? "Facebook" : pick(PLATFORMS, `p2${s}`);
    const taskIdx = int(`ti${s}`, 1, 26);
    const names = TASK_NAME_BY_CATEGORY[category];
    const taskName = `${names[taskIdx % names.length]} #${String(taskIdx).padStart(2, "0")}`;
    // 近 30 天，越近越密
    const ts = NOW - Math.floor(Math.pow(h(`t${s}`), 1.4) * 30 * DAY);
    const rnd = h(`r${s}`);
    // Facebook / 养号失败率更高
    const failBase =
      0.16 + (platform === "Facebook" ? 0.12 : 0) + (category === "nurture" ? 0.06 : 0);
    const state: SubTaskRec["state"] =
      rnd < failBase ? "failed" : rnd > 0.985 ? "running" : "success";
    const cause = state === "failed" ? pickCause(`cz${s}`) : null;
    const step = cause
      ? pick(CAUSE_STEPS[cause], `sp${s}`)
      : "小Server终态处理";
    const goalLabel =
      category === "nurture"
        ? `会话时长：${int(`g${s}`, 5, 12)} 分钟`
        : category === "dm"
          ? `触达账号数：${int(`g${s}`, 20, 80)}`
          : category === "social-reach"
            ? `发帖/点赞目标：${int(`g${s}`, 10, 40)}`
            : `同屏账号数：${int(`g${s}`, 4, 12)}`;
    out.push({
      id: `SUB${String(100000 + i)}`,
      taskId: `T${String(taskIdx).padStart(4, "0")}-${category}`,
      taskName,
      category,
      platform,
      account: pick(ACCOUNT_POOL, `a${s}`),
      action: pick(ACTIONS, `ac${s}`),
      step,
      logSource: cause ? CAUSE_SOURCE[cause] : "小Server",
      cause,
      causeText: cause ? CAUSE_TEXT[cause] : "",
      level: cause === "network" || cause === "timeout" ? "WARN" : "ERROR",
      durationSec: int(`d${s}`, 45, 900),
      retries: h(`rt${s}`) > 0.86 ? int(`rt2${s}`, 1, 3) : 0,
      ts,
      state,
      proxyIp: PROXY_POOL[int(`px${s}`, 0, PROXY_POOL.length - 1)].ip,
      machine: MACHINE_POOL[int(`mc${s}`, 0, MACHINE_POOL.length - 1)].name,
      goalLabel,
      goalUnit: 1,
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

let _cache: SubTaskRec[] | null = null;
export function getSubTasks(): SubTaskRec[] {
  if (!_cache) _cache = buildSubTasks();
  return _cache;
}

/* ---------------- 筛选与聚合 ---------------- */

export type RangeKey = "24h" | "7d" | "30d";
export const RANGE_LABEL: Record<RangeKey, string> = {
  "24h": "近 24 小时",
  "7d": "近 7 天",
  "30d": "近 30 天",
};
export const RANGE_MS: Record<RangeKey, number> = {
  "24h": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
};

export interface DiagFilter {
  range: RangeKey;
  category: TaskCategory | "all";
  platform: Platform | "all";
  account: string;
  cause: CauseKey | "all";
  step?: string;
  logSource?: string;
  action?: string;
  proxyIp?: string;
  machine?: string;
}

export const EMPTY_FILTER: DiagFilter = {
  range: "7d",
  category: "all",
  platform: "all",
  account: "",
  cause: "all",
};

/** 主筛选（不含失败原因，用于计算基数类指标） */
export function applyScope(rows: SubTaskRec[], f: DiagFilter, offsetPeriods = 0) {
  const span = RANGE_MS[f.range];
  const end = NOW - offsetPeriods * span;
  const start = end - span;
  const kw = f.account.trim().toLowerCase();
  return rows.filter(
    (r) =>
      r.ts > start &&
      r.ts <= end &&
      (f.category === "all" || r.category === f.category) &&
      (f.platform === "all" || r.platform === f.platform) &&
      (!kw || r.account.toLowerCase().includes(kw) || r.id.toLowerCase().includes(kw)) &&
      (!f.step || r.step === f.step) &&
      (!f.logSource || r.logSource === f.logSource) &&
      (!f.action || r.action === f.action) &&
      (!f.proxyIp || r.proxyIp === f.proxyIp) &&
      (!f.machine || r.machine === f.machine),
  );
}

/** 失败集合（叠加失败原因筛选） */
export function failuresOf(rows: SubTaskRec[], f: DiagFilter) {
  return rows.filter(
    (r) => r.state === "failed" && (f.cause === "all" || r.cause === f.cause),
  );
}

export interface Kpi {
  subTotal: number;
  failed: number;
  failRate: number;
  partialTasks: number;
  avgDurationSec: number;
  retryRate: number;
  running: number;
}

export function computeKpi(rows: SubTaskRec[], f: DiagFilter): Kpi {
  const settled = rows.filter((r) => r.state !== "running");
  const failed = failuresOf(rows, f);
  const byTask = new Map<string, { ok: number; bad: number }>();
  settled.forEach((r) => {
    const e = byTask.get(r.taskId) ?? { ok: 0, bad: 0 };
    if (r.state === "failed") e.bad++;
    else e.ok++;
    byTask.set(r.taskId, e);
  });
  return {
    subTotal: rows.length,
    failed: failed.length,
    failRate: settled.length ? (failed.length / settled.length) * 100 : 0,
    partialTasks: [...byTask.values()].filter((e) => e.ok > 0 && e.bad > 0).length,
    avgDurationSec: settled.length
      ? Math.round(settled.reduce((s, r) => s + r.durationSec, 0) / settled.length)
      : 0,
    retryRate: settled.length
      ? (settled.filter((r) => r.retries > 0).length / settled.length) * 100
      : 0,
    running: rows.filter((r) => r.state === "running").length,
  };
}

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}分${String(s).padStart(2, "0")}秒` : `${s}秒`;
}

/** 趋势：24h 按小时，7d 按天，30d 按周 */
export function buildTrend(rows: SubTaskRec[], f: DiagFilter) {
  const gran = f.range === "24h" ? "hour" : f.range === "7d" ? "day" : "week";
  const buckets = gran === "hour" ? 24 : gran === "day" ? 7 : 5;
  const size = gran === "hour" ? 3600_000 : gran === "day" ? DAY : 7 * DAY;
  const end = NOW;
  const out: { label: string; failed: number; total: number; rate: number }[] = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const hi = end - i * size;
    const lo = hi - size;
    const seg = rows.filter((r) => r.ts > lo && r.ts <= hi);
    const settled = seg.filter((r) => r.state !== "running");
    const failed = failuresOf(seg, f).length;
    const d = new Date(hi);
    const label =
      gran === "hour"
        ? `${String(d.getHours()).padStart(2, "0")}:00`
        : gran === "day"
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `${d.getMonth() + 1}/${d.getDate()} 周`;
    out.push({
      label,
      failed,
      total: seg.length,
      rate: settled.length ? Number(((failed / settled.length) * 100).toFixed(1)) : 0,
    });
  }
  return out;
}

export type DimKey = "category" | "platform" | "action" | "step" | "logSource" | "account";
export const DIM_LABEL: Record<DimKey, string> = {
  category: "业务类型",
  platform: "平台",
  action: "动作类型",
  step: "执行步骤",
  logSource: "日志来源",
  account: "账号",
};

export function buildDistribution(failed: SubTaskRec[], dim: DimKey, topN = 8) {
  const map = new Map<string, number>();
  failed.forEach((r) => {
    const k = String(r[dim]);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  const total = failed.length || 1;
  return [...map.entries()]
    .map(([name, value]) => ({ name, value, pct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

export function buildCauseCluster(failed: SubTaskRec[]) {
  const total = failed.length || 1;
  return CAUSE_ORDER.map((k) => {
    const n = failed.filter((r) => r.cause === k).length;
    return { key: k, ...CAUSE_META[k], value: n, pct: (n / total) * 100 };
  })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}

export interface RankRow {
  key: string;
  extra: string;
  extra2?: string;
  total: number;
  success: number;
  failed: number;
  failRate: number;
  topCause: CauseKey | null;
  status?: string;
}

function rank(
  rows: SubTaskRec[],
  f: DiagFilter,
  keyOf: (r: SubTaskRec) => string,
  meta: (key: string) => { extra: string; extra2?: string; status?: string },
): RankRow[] {
  const map = new Map<string, SubTaskRec[]>();
  rows.forEach((r) => {
    const k = keyOf(r);
    (map.get(k) ?? map.set(k, []).get(k)!).push(r);
  });
  return [...map.entries()]
    .map(([key, list]) => {
      const settled = list.filter((r) => r.state !== "running");
      const failed = failuresOf(list, f);
      const causeCount = new Map<CauseKey, number>();
      failed.forEach((r) => r.cause && causeCount.set(r.cause, (causeCount.get(r.cause) ?? 0) + 1));
      const topCause =
        [...causeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        key,
        ...meta(key),
        total: list.length,
        success: settled.filter((r) => r.state === "success").length,
        failed: failed.length,
        failRate: settled.length ? (failed.length / settled.length) * 100 : 0,
        topCause,
      };
    })
    .sort((a, b) => b.failed - a.failed || b.failRate - a.failRate);
}

export function buildAccountRank(rows: SubTaskRec[], f: DiagFilter) {
  const platformOf = new Map<string, string>();
  rows.forEach((r) => platformOf.set(r.account, r.platform));
  return rank(rows, f, (r) => r.account, (k) => ({ extra: platformOf.get(k) ?? "-" }));
}

export function buildProxyRank(rows: SubTaskRec[], f: DiagFilter) {
  const byIp = new Map(PROXY_POOL.map((p) => [p.ip, p]));
  return rank(rows, f, (r) => r.proxyIp, (k) => {
    const p = byIp.get(k);
    return { extra: p?.region ?? "-", extra2: `${p?.latency ?? 0}ms`, status: p?.health };
  });
}

export function buildMachineRank(rows: SubTaskRec[], f: DiagFilter) {
  const byName = new Map(MACHINE_POOL.map((m) => [m.name, m]));
  return rank(rows, f, (r) => r.machine, (k) => {
    const m = byName.get(k);
    return { extra: m?.type ?? "-", extra2: m?.ip, status: m?.state };
  });
}

/** 高危阈值 */
export const HIGH_RISK_RATE = 40;

export interface GoalRow {
  taskId: string;
  taskName: string;
  category: TaskCategory;
  platform: Platform;
  goalType: string;
  goalTotal: number;
  done: number;
  failed: number;
  running: number;
  rate: number;
  result: "success" | "partial" | "failed" | "none";
}

export function buildGoalRows(rows: SubTaskRec[], f: DiagFilter): GoalRow[] {
  const map = new Map<string, SubTaskRec[]>();
  rows.forEach((r) => (map.get(r.taskId) ?? map.set(r.taskId, []).get(r.taskId)!).push(r));
  return [...map.entries()]
    .map(([taskId, list]) => {
      const first = list[0];
      const done = list.filter((r) => r.state === "success").length;
      const failed = failuresOf(list, f).length;
      const running = list.filter((r) => r.state === "running").length;
      const rate = (done / list.length) * 100;
      const result: GoalRow["result"] =
        done === 0 && failed === 0
          ? "none"
          : failed === 0
            ? "success"
            : done === 0
              ? "failed"
              : "partial";
      return {
        taskId,
        taskName: first.taskName,
        category: first.category,
        platform: first.platform,
        goalType: first.goalLabel.split("：")[0],
        goalTotal: list.length,
        done,
        failed,
        running,
        rate,
        result,
      };
    })
    .sort((a, b) => a.rate - b.rate);
}

export const GOAL_RESULT_LABEL: Record<GoalRow["result"], string> = {
  success: "全部成功",
  partial: "部分成功",
  failed: "全部失败",
  none: "暂无结果",
};

export function fmtTs(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
