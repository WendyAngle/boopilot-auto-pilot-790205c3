import { useSyncExternalStore } from "react";

/* ============================================================ */
/* 类型与常量                                                   */
/* ============================================================ */

export type TaskSubType = "nurture" | "action";
export type TaskStatus = "pending" | "running" | "success" | "failed" | "partial";
export type Platform = "Facebook" | "Tiktok" | "WhatsApp" | "Instagram" | "Twitter/X";

export interface TaskRow {
  id: string;
  name: string;
  subtype: TaskSubType;
  platforms: Platform[];
  total: number;
  done: number;
  failed: number;
  status: TaskStatus;
  description: string;
  createdBy: string;
  createdAt: string;
  endTime?: string;
  fromTemplate?: string;
  /** 创建/编辑任务表单的快照，便于编辑时回显完整字段 */
  draft?: Record<string, unknown>;
  /** 是否被手动终止 */
  aborted?: boolean;
  /** 任务来源：私信/好友通过/好友拒绝等手动运营台账 */
  source?: "dm" | "friend-approve" | "friend-reject";
  /** 手动台账任务对应的托管账号 ID */
  sourceAccountId?: string;
}

export type ExecState = "completed" | "running" | "pending" | "aborted";

export const EXEC_STATE_LABEL: Record<ExecState, string> = {
  completed: "已完成",
  running: "执行中",
  pending: "待执行",
  aborted: "手动终止",
};

export const EXEC_STATE_CLS: Record<ExecState, string> = {
  completed: "bg-success/10 text-success border-success/30",
  running: "bg-info/10 text-info border-info/30",
  pending: "bg-primary/10 text-primary border-primary/30",
  aborted: "bg-destructive/10 text-destructive border-destructive/30",
};

export function getExecState(t: Pick<TaskRow, "status" | "aborted">): ExecState {
  if (t.aborted) return "aborted";
  if (t.status === "running") return "running";
  if (t.status === "pending") return "pending";
  return "completed";
}

export type TemplateStatus = "enabled" | "draft";
export type TemplateAction =
  | "like" | "comment" | "follow" | "post" | "addFriend" | "dm" | "share" | "view";

export const TEMPLATE_ACTION_LABEL: Record<TemplateAction, string> = {
  like: "点赞",
  comment: "评论",
  follow: "关注",
  post: "发帖",
  addFriend: "加好友",
  dm: "发私信",
  share: "转发/分享",
  view: "浏览/观看",
};

export const TEMPLATE_ACTIONS: TemplateAction[] = [
  "like", "comment", "follow", "post", "addFriend", "dm", "share", "view",
];

export interface TaskTemplate {
  id: string;
  name: string;
  subtype: TaskSubType;
  platforms: Platform[];
  total: number;
  description: string;
  createdAt: string;
  uses: number;
  status?: TemplateStatus;
  agentName?: string;
  actions?: TemplateAction[];
  tags?: string[];
  monthlyUses?: number;
}

export const PLATFORMS: Platform[] = ["Facebook", "Tiktok", "WhatsApp", "Instagram", "Twitter/X"];

export const PLATFORM_CHIP: Record<Platform, string> = {
  Facebook: "bg-blue-500/10 text-blue-600 border-blue-300/40",
  Tiktok: "bg-foreground/10 text-foreground border-foreground/20",
  WhatsApp: "bg-emerald-500/10 text-emerald-600 border-emerald-300/40",
  Instagram: "bg-pink-500/10 text-pink-600 border-pink-300/40",
  "Twitter/X": "bg-sky-500/10 text-sky-600 border-sky-300/40",
};

export const SUBTYPE_LABEL: Record<TaskSubType, string> = {
  nurture: "周期性",
  action: "单次触达",
};

export const SUBTYPE_CLS: Record<TaskSubType, string> = {
  nurture: "bg-violet-500/10 text-violet-600 border-violet-300/40",
  action: "bg-amber-500/10 text-amber-600 border-amber-300/40",
};

/** 任务分类（面向用户展示的任务类型）：养号任务 / 通过好友申请 / 拒绝好友申请 / 私信 */
export type TaskCategory = "nurture" | "friend-approve" | "friend-reject" | "dm" | "coview";

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  nurture: "养号任务",
  "friend-approve": "通过好友申请",
  "friend-reject": "拒绝好友申请",
  dm: "私信",
  coview: "账号同屏",
};

export const TASK_CATEGORY_CLS: Record<TaskCategory, string> = {
  nurture: "bg-violet-500/10 text-violet-600 border-violet-300/40",
  "friend-approve": "bg-emerald-500/10 text-emerald-600 border-emerald-300/40",
  "friend-reject": "bg-rose-500/10 text-rose-600 border-rose-300/40",
  dm: "bg-sky-500/10 text-sky-600 border-sky-300/40",
  coview: "bg-amber-500/10 text-amber-600 border-amber-300/40",
};

export function getTaskCategory(t: Pick<TaskRow, "source">): TaskCategory {
  if (t.source === "dm") return "dm";
  if (t.source === "friend-approve") return "friend-approve";
  if (t.source === "friend-reject") return "friend-reject";
  return "nurture";
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待执行",
  running: "执行中",
  success: "执行成功",
  failed: "执行失败",
  partial: "部分成功",
};

export const STATUS_CLS: Record<TaskStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  running: "bg-primary/10 text-primary border-primary/30",
  success: "bg-success/10 text-success border-success/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  partial: "bg-warning/10 text-warning border-warning/30",
};

/* ============================================================ */
/* 工具函数                                                     */
/* ============================================================ */

export const pad = (n: number) => n.toString().padStart(2, "0");
export const fmtNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
export const shortTime = (ts: string) => ts.slice(11, 16);
export const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
export const genTaskId = () => `2046834${String(Math.floor(Math.random() * 9e7) + 1e7)}`;

/* ============================================================ */
/* 自然语言解析                                                 */
/* ============================================================ */

export interface ParsedIntent {
  kind: "create" | "use_template" | "save_template" | "execute" | "smalltalk";
  platforms: Platform[];
  subtype: TaskSubType;
  total: number;
  templateName?: string;
  newTemplateName?: string;
  targetTaskId?: string;
}

export function parseUserMessage(text: string, templates: TaskTemplate[], lastTaskId?: string): ParsedIntent {
  const t = text.trim();
  const saveMatch = t.match(/保存(?:上一个|这个|刚才的)?(?:任务)?(?:为|成)模[版板](?:[，,。.\s]*(?:命名为|叫|名为|名称为)\s*[「""'']?([^「」""''\s，。,.]+))?/);
  if (saveMatch) {
    return { kind: "save_template", platforms: [], subtype: "action", total: 0, newTemplateName: saveMatch[1], targetTaskId: lastTaskId };
  }
  const useMatch = t.match(/(?:使用|用|套用|按照|根据)\s*[「""'']?([^「」""''\s，。,.]+?)[」""'']?\s*(?:任务)?模[版板]/);
  if (useMatch) {
    const name = useMatch[1];
    const tpl = templates.find((x) => x.name.includes(name) || name.includes(x.name));
    return { kind: "use_template", platforms: tpl?.platforms ?? [], subtype: tpl?.subtype ?? "action", total: tpl?.total ?? 10, templateName: tpl?.name ?? name };
  }
  const platforms: Platform[] = [];
  const platformAliases: Record<string, Platform> = {
    facebook: "Facebook", fb: "Facebook", "脸书": "Facebook",
    tiktok: "Tiktok", "抖音国际": "Tiktok",
    whatsapp: "WhatsApp", wa: "WhatsApp",
    instagram: "Instagram", ins: "Instagram", ig: "Instagram",
    twitter: "Twitter/X", x: "Twitter/X", "推特": "Twitter/X",
  };
  const lower = t.toLowerCase();
  for (const [k, v] of Object.entries(platformAliases)) {
    if (lower.includes(k) && !platforms.includes(v)) platforms.push(v);
  }
  const subtype: TaskSubType = /周期|养号|每天|每日|每周|定时|循环/.test(t) ? "nurture" : "action";
  let total = 10;
  const numMatch = t.match(/(\d+)\s*(?:条|个|次|账号)/);
  if (numMatch) total = parseInt(numMatch[1], 10);
  const looksLikeTask = /任务|发帖|互动|评论|点赞|私信|关注|养号|触达|发布|采集|执行/.test(t) || platforms.length > 0;
  if (looksLikeTask) {
    return { kind: "create", platforms: platforms.length ? platforms : ["Facebook"], subtype, total };
  }
  return { kind: "smalltalk", platforms: [], subtype: "action", total: 0 };
}

/* ============================================================ */
/* 初始数据                                                     */
/* ============================================================ */

const initialTasks: TaskRow[] = [
  {
    id: "204683410000001",
    name: "Facebook 周末互动养号",
    subtype: "nurture",
    platforms: ["Facebook"],
    total: 12, done: 12, failed: 0,
    status: "success",
    description: "对 Facebook 上 12 个种子账号执行 7 天周期的轻量互动，每日点赞 5、评论 2。",
    createdBy: "黄雪",
    createdAt: "2026-05-24 10:12:08",
    endTime: "2026-05-24 11:30:42",
    fromTemplate: "Facebook 日常养号",
    draft: {
      name: "Facebook 周末互动养号",
      platforms: ["Facebook"],
      targetMode: "keyword",
      targetKeyword: "旅游、旅游达人的账号",
      targetUrl: "",
      reachTags: ["主账号", "高活跃"],
      reachAccounts: ["acc-001", "acc-002", "acc-003", "acc-004", "acc-005", "acc-006", "acc-007", "acc-008", "acc-009", "acc-010", "acc-011", "acc-012"],
      postTags: [],
      postIds: [],
      execMode: "recurring",
      recurStartDate: "2026-05-24",
      recurStartTime: "09:00",
      recurFreq: "daily",
      recurTimeStart: "09:00",
      recurTimeEnd: "18:00",
      sessionDuration: 30,
      sessionDurationUnit: "min",
      recurDuration: 7,
      recurForever: false,
    },
  },
  {
    id: "204683410000002",
    name: "Tiktok 新品上线触达",
    subtype: "action",
    platforms: ["Tiktok"],
    total: 20, done: 14, failed: 2,
    status: "partial",
    description: "围绕新品上线，对 20 个目标账号一次性发布带话题视频。",
    createdBy: "陈晓明",
    createdAt: "2026-05-25 09:45:13",
    endTime: "2026-05-25 10:20:00",
    fromTemplate: "Facebook发帖",
    draft: {
      name: "Tiktok 新品上线触达",
      platforms: ["Tiktok"],
      reachTags: ["新品种草", "高意向"],
      reachAccounts: ["acc-101", "acc-102", "acc-103", "acc-104", "acc-105"],
      postTags: ["新品促销", "种草"],
      postIds: ["post-201", "post-202", "post-203"],
      execMode: "now",
    },
  },
  {
    id: "204683410000003",
    name: "多平台节日营销触达",
    subtype: "action",
    platforms: ["Facebook", "Instagram", "Twitter/X"],
    total: 30, done: 6, failed: 0,
    status: "running",
    description: "节日活动多平台同步触达，覆盖 Facebook / Instagram / Twitter/X。",
    createdBy: "李雨欣",
    createdAt: "2026-05-26 09:10:00",
    fromTemplate: "Facebook发帖",
    draft: {
      name: "多平台节日营销触达",
      platforms: ["Facebook", "Instagram", "Twitter/X"],
      reachTags: ["节日问候", "品牌"],
      reachAccounts: ["acc-301", "acc-302", "acc-303", "acc-304", "acc-305", "acc-306", "acc-307", "acc-308"],
      postTags: ["节日问候", "品牌"],
      postIds: ["post-401", "post-402", "post-403", "post-404"],
      execMode: "scheduled",
      scheduledDate: "2026-05-26",
      scheduledTime: "20:00",
    },
  },
  {
    id: "204683410000004",
    name: "Instagram 新粉丝问候私信",
    subtype: "action",
    platforms: ["Instagram"],
    total: 25, done: 0, failed: 0,
    status: "pending",
    description: "对近 7 天新增的 25 个 Instagram 粉丝发送一次性问候私信，附品牌主页链接。",
    createdBy: "黄雪",
    createdAt: "2026-05-27 14:20:33",
    fromTemplate: "Facebook发帖",
    draft: {
      name: "Instagram 新粉丝问候私信",
      platforms: ["Instagram"],
      reachTags: ["新粉丝", "加微信"],
      reachAccounts: ["acc-501", "acc-502", "acc-503", "acc-504"],
      postTags: ["品牌"],
      postIds: ["post-601"],
      execMode: "now",
    },
  },
  {
    id: "204683410000005",
    name: "WhatsApp 高意向客户复触达",
    subtype: "action",
    platforms: ["WhatsApp"],
    total: 18, done: 0, failed: 0,
    status: "pending",
    description: "对标记为高意向但 14 天未跟进的 18 位客户进行一次性复触达，发送促销链接。",
    createdBy: "陈晓明",
    createdAt: "2026-05-27 16:05:12",
    fromTemplate: "Facebook发帖",
    draft: {
      name: "WhatsApp 高意向客户复触达",
      platforms: ["WhatsApp"],
      reachTags: ["高意向"],
      reachAccounts: ["acc-701", "acc-702", "acc-703"],
      postTags: ["新品促销"],
      postIds: ["post-801", "post-802"],
      execMode: "scheduled",
      scheduledDate: "2026-05-28",
      scheduledTime: "10:30",
    },
  },
  {
    id: "204683410000006",
    name: "Tiktok 周期性养号互动",
    subtype: "nurture",
    platforms: ["Tiktok"],
    total: 15, done: 0, failed: 0,
    status: "pending",
    description: "对 15 个 Tiktok 种子账号开启 14 天周期养号，每日浏览 10、点赞 4、评论 1。",
    createdBy: "黄雪",
    createdAt: "2026-05-28 09:42:08",
    fromTemplate: "Facebook 日常养号",
    draft: {
      name: "Tiktok 周期性养号互动",
      platforms: ["Tiktok"],
      targetMode: "random",
      targetKeyword: "",
      targetUrl: "",
      reachTags: ["主账号", "高活跃"],
      reachAccounts: ["acc-901", "acc-902", "acc-903", "acc-904", "acc-905", "acc-906", "acc-907", "acc-908", "acc-909", "acc-910"],
      postTags: [],
      postIds: [],
      execMode: "recurring",
      recurStartDate: "2026-05-28",
      recurStartTime: "10:00",
      recurFreq: "daily",
      recurTimeStart: "10:00",
      recurTimeEnd: "20:00",
      sessionDuration: 45,
      sessionDurationUnit: "min",
      recurDuration: 14,
      recurForever: false,
    },
  },
  {
    id: "204683410000007",
    name: "Facebook 日常养号 · 持续运行",
    subtype: "nurture",
    platforms: ["Facebook"],
    total: 20, done: 132, failed: 4,
    status: "running",
    description: "对 20 个 Facebook 种子账号开启持续养号，持续执行直到手动停止。",
    createdBy: "黄雪",
    createdAt: "2026-05-22 08:30:00",
    fromTemplate: "Facebook 日常养号",
    draft: {
      name: "Facebook 日常养号 · 持续运行",
      platforms: ["Facebook"],
      targetMode: "random",
      reachTags: ["主账号", "高活跃"],
      reachAccounts: ["acc-f01", "acc-f02", "acc-f03", "acc-f04", "acc-f05", "acc-f06", "acc-f07", "acc-f08"],
      postTags: [],
      postIds: [],
      execMode: "recurring",
      recurStartDate: "2026-05-22",
      recurStartTime: "08:30",
      recurFreq: "daily",
      recurTimeStart: "08:30",
      recurTimeEnd: "22:00",
      sessionDuration: 30,
      sessionDurationUnit: "min",
      recurDuration: 0,
      recurForever: true,
    },
  },
];

export function isForeverTask(t: Pick<TaskRow, "draft">): boolean {
  const d = (t.draft ?? {}) as Record<string, unknown>;
  return d.execMode === "recurring" && d.recurForever === true;
}

const initialTemplates: TaskTemplate[] = [
  {
    id: uid("tpl"),
    name: "Facebook 日常养号",
    subtype: "nurture",
    platforms: ["Facebook"],
    total: 10,
    description: "对 Facebook 账号执行轻量互动，每日点赞、关注与少量评论。",
    createdAt: "2026-05-10 09:00:00",
    uses: 18,
    status: "enabled",
    agentName: "系统内置",
    actions: ["like", "follow", "comment"],
    tags: ["主账号", "高活跃", "出海"],
    monthlyUses: 6,
  },
];

/* ============================================================ */
/* 全局共享 store                                               */
/* ============================================================ */

let _tasks: TaskRow[] = initialTasks;
let _templates: TaskTemplate[] = initialTemplates;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useTasks() {
  return useSyncExternalStore(subscribe, () => _tasks, () => _tasks);
}
export function useTemplates() {
  return useSyncExternalStore(subscribe, () => _templates, () => _templates);
}

type Updater<T> = T | ((prev: T) => T);
function applyTasks(u: Updater<TaskRow[]>) {
  _tasks = typeof u === "function" ? (u as (p: TaskRow[]) => TaskRow[])(_tasks) : u;
  emit();
}
function applyTemplates(u: Updater<TaskTemplate[]>) {
  _templates = typeof u === "function" ? (u as (p: TaskTemplate[]) => TaskTemplate[])(_templates) : u;
  emit();
}

export const tasksActions = {
  set: applyTasks,
  add: (t: TaskRow) => applyTasks((prev) => [t, ...prev]),
  remove: (id: string) => applyTasks((prev) => prev.filter((t) => t.id !== id)),
  update: (id: string, patch: Partial<TaskRow>) =>
    applyTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
  get: () => _tasks,
};

export const templatesActions = {
  set: applyTemplates,
  add: (t: TaskTemplate) => applyTemplates((prev) => [t, ...prev]),
  remove: (id: string) => applyTemplates((prev) => prev.filter((t) => t.id !== id)),
  update: (id: string, patch: Partial<TaskTemplate>) =>
    applyTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
  get: () => _templates,
};

/* ============================================================ */
/* 业务动作                                                     */
/* ============================================================ */

export function executeTask(taskId: string) {
  tasksActions.update(taskId, { status: "running", done: 0, failed: 0, aborted: false });
  const target = tasksActions.get().find((t) => t.id === taskId);
  const total = target?.total ?? 10;
  let step = 0;
  const tick = () => {
    const cur = tasksActions.get().find((t) => t.id === taskId);
    if (!cur || cur.aborted) return;
    step += 1;
    applyTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const fail = step >= Math.ceil(total * 0.6) && step % 4 === 0 ? t.failed + 1 : t.failed;
        const newDone = Math.min(total - fail, step);
        if (step >= total) {
          const finalFailed = fail;
          const finalDone = total - finalFailed;
          const status: TaskStatus = finalFailed === 0 ? "success" : finalDone === 0 ? "failed" : "partial";
          return { ...t, done: finalDone, failed: finalFailed, status, endTime: fmtNow() };
        }
        return { ...t, done: newDone, failed: fail };
      }),
    );
    if (step < total) setTimeout(tick, 350);
  };
  setTimeout(tick, 400);
}

export function abortTask(taskId: string) {
  tasksActions.update(taskId, { aborted: true, endTime: fmtNow() });
}



export function createTaskFromIntent(intent: ParsedIntent, raw: string): TaskRow {
  const name = `${SUBTYPE_LABEL[intent.subtype]}_${intent.platforms[0] ?? "多平台"}_${pad(new Date().getHours())}${pad(new Date().getMinutes())}`;
  const task: TaskRow = {
    id: genTaskId(),
    name,
    subtype: intent.subtype,
    platforms: intent.platforms,
    total: intent.total,
    done: 0,
    failed: 0,
    status: "pending",
    description: raw,
    createdBy: "黄雪",
    createdAt: fmtNow(),
  };
  tasksActions.add(task);
  return task;
}

export function createTaskFromTemplate(tpl: TaskTemplate): TaskRow {
  const task: TaskRow = {
    id: genTaskId(),
    name: `${tpl.name}_${pad(new Date().getHours())}${pad(new Date().getMinutes())}`,
    subtype: tpl.subtype,
    platforms: tpl.platforms,
    total: tpl.total,
    done: 0,
    failed: 0,
    status: "pending",
    description: tpl.description,
    createdBy: "黄雪",
    createdAt: fmtNow(),
    fromTemplate: tpl.name,
  };
  tasksActions.add(task);
  templatesActions.update(tpl.id, { uses: tpl.uses + 1, monthlyUses: (tpl.monthlyUses ?? 0) + 1 });
  return task;
}
