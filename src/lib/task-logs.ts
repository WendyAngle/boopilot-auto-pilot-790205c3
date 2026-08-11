import { type Platform, type TaskRow } from "@/lib/operations-store";
import { USERNAMES } from "@/lib/managed-account-mock";
import { buildPosts } from "@/lib/post-stats";

export type LogStatus = "success" | "failed" | "running" | "pending";

export const STATUS_LABEL: Record<LogStatus, string> = {
  success: "执行成功", failed: "执行失败", running: "执行中", pending: "待执行",
};
export const STATUS_CLS: Record<LogStatus, string> = {
  success: "bg-success/10 text-success border-success/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  running: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-muted text-muted-foreground border-border",
};

export const ACTION_TYPES = [
  "gather_friend_list", "gather_unread_message", "visit_no_target",
  "send_message", "register_account", "like_post", "comment_post",
  "follow_user", "share_post", "browse_feed",
] as const;

export const EVENT_TYPES = [
  "WORK_DISPATCH_SUCCEEDED",
  "ACTION_CREATED",
  "WORK_ACK",
  "ACTION_EXECUTION",
  "RESULT_CALLBACK",
  "WORK_COMPLETED",
  "WORK_FAILED",
] as const;

type CodeDef = { code: string; desc: string };
// 不同事件类型使用差异化的 6 位成功状态码
const SUCCESS_CODES: Record<string, CodeDef> = {
  WORK_DISPATCH_SUCCEEDED: { code: "200001", desc: "调度下发成功" },
  ACTION_CREATED: { code: "200002", desc: "动作创建成功" },
  WORK_ACK: { code: "200003", desc: "节点已接收" },
  ACTION_EXECUTION: { code: "200004", desc: "动作执行回调成功" },
  RESULT_CALLBACK: { code: "200005", desc: "结果回调成功" },
  WORK_COMPLETED: { code: "200006", desc: "作业完成" },
};
const FAIL_CODES: CodeDef[] = [
  { code: "999900", desc: "不支持的操作类型" },
  { code: "100401", desc: "登录态过期" },
  { code: "100503", desc: "请求被平台限流" },
  { code: "100404", desc: "目标内容不存在" },
  { code: "100500", desc: "执行节点超时" },
];

export type LogRow = {
  id: string;
  subTaskId: string;
  subIndex: number;
  account: string;
  actionType: string;
  eventType: string;
  target: string;
  targetUrl?: string;
  targetTitle?: string;
  platform: string;
  statusCode: string;
  statusCodeDesc: string;
  content: string;
  ts: string;
  status: LogStatus;
  platformBadge: Platform;
};


export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export function platformText(p: string) {
  const map: Record<string, string> = {
    "Facebook": "facebook", "TikTok": "tiktok", "Instagram": "instagram",
    "X": "x", "Twitter": "x", "微信": "wechat", "抖音": "douyin",
    "小红书": "xiaohongshu", "快手": "kuaishou", "微博": "weibo",
    "B站": "bilibili", "哔哩哔哩": "bilibili",
  };
  return map[p] ?? p.toLowerCase();
}

function mkRow(
  subId: string, evt: string, account: string, actionType: string, eventType: string,
  target: string, platform: string, platformBadge: Platform,
  code: string, codeDesc: string, content: string, ts: string, status: LogStatus,
): LogRow {
  return {
    id: `${subId}-${evt}`, subTaskId: subId, subIndex: 0, account, actionType, eventType,
    target, platform, platformBadge, statusCode: code, statusCodeDesc: codeDesc,
    content, ts, status,
  };
}

export function buildLogs(t: TaskRow): LogRow[] {
  const rows: LogRow[] = [];
  const total = t.total;
  const done = t.done;
  const failed = t.failed;
  const running = t.status === "running" ? Math.min(2, total - done - failed) : 0;
  const baseDate = (t.createdAt.split(" ")[0] || "2026-04-22");
  const [bh, bm, bs] = (t.createdAt.split(" ")[1] || "14:12:00").split(":").map(Number);
  

  const fmt = (offset: number) => {
    const total2 = (bh * 3600 + bm * 60 + bs + offset) % 86400;
    return `${baseDate} ${pad(Math.floor(total2 / 3600))}:${pad(Math.floor((total2 % 3600) / 60))}:${pad(total2 % 60)}`;
  };

  for (let i = 0; i < total; i++) {
    const before = rows.length;
    const h = hash(`${t.id}|${i}`);
    const platform = t.platforms[h % t.platforms.length];
    const baseAcc = USERNAMES[i % USERNAMES.length];
    const accRound = Math.floor(i / USERNAMES.length);
    const accountNo = accRound === 0 ? baseAcc : `${baseAcc}-${accRound + 1}`;
    const subId = `${t.id}-${String(i + 1).padStart(3, "0")}`;
    let subStatus: LogStatus;
    if (i < done) subStatus = "success";
    else if (i < done + failed) subStatus = "failed";
    else if (i < done + failed + running) subStatus = "running";
    else subStatus = "pending";

    const hasTargetJson = (h >>> 12) % 4 !== 0;
    const target = hasTargetJson
      ? `{"account": "6${String(1500000000000 + ((h >>> 15) % 99999999999)).slice(0, 13)}"}`
      : "--";
    const pf = platformText(platform);

    // 每个账号子任务包含 2~3 个动作，覆盖整次任务的多种操作
    // 社媒触达任务只做拓客类动作（私信/加好友/拉取列表等），不含关注、发帖、点赞、评论
    const pool = isReach ? REACH_ACTION_TYPES : ACTION_TYPES;
    const actionCount = 2 + ((h >>> 21) % 2); // 2 或 3
    const actions: string[] = [];
    for (let a = 0; a < actionCount; a++) {
      actions.push(pool[((h >>> (3 + a * 4)) + a) % pool.length]);
    }


    const sDispatch = SUCCESS_CODES.WORK_DISPATCH_SUCCEEDED;
    const sCreated = SUCCESS_CODES.ACTION_CREATED;
    const sAck = SUCCESS_CODES.WORK_ACK;
    const sExec = SUCCESS_CODES.ACTION_EXECUTION;
    const sResult = SUCCESS_CODES.RESULT_CALLBACK;
    const sCompleted = SUCCESS_CODES.WORK_COMPLETED;

    for (let a = 0; a < actions.length; a++) {
      const actionType = actions[a];
      const failCode = FAIL_CODES[((h >>> 9) + a) % FAIL_CODES.length];
      const baseOffset = i * 60 + a * 18;
      // 每个动作的最终状态：
      // success → 全部动作成功；failed → 仅最后一个动作失败；
      // running → 前面动作成功、最后一个动作运行中；pending → 全部待执行
      let actionStatus: LogStatus = "success";
      if (subStatus === "pending") actionStatus = "pending";
      else if (subStatus === "running") actionStatus = a === actions.length - 1 ? "running" : "success";
      else if (subStatus === "failed") actionStatus = a === actions.length - 1 ? "failed" : "success";

      rows.push(mkRow(subId, `a${a + 1}-e1`, accountNo, actionType, "WORK_DISPATCH_SUCCEEDED",
        target, pf, platform, sDispatch.code, sDispatch.desc,
        "Work dispatched successfully", fmt(baseOffset + 0), "success"));
      rows.push(mkRow(subId, `a${a + 1}-e2`, accountNo, actionType, "ACTION_CREATED",
        target, pf, platform, sCreated.code, sCreated.desc,
        `自动调度创建 ${actionType} Work,时长 7 分钟`, fmt(baseOffset + 1), "success"));

      if (actionStatus === "pending") {
        rows.push(mkRow(subId, `a${a + 1}-e3`, accountNo, actionType, "WORK_ACK",
          target, pf, platform, "--", "--",
          "work pending dispatch", fmt(baseOffset + 2), "pending"));
        continue;
      }
      rows.push(mkRow(subId, `a${a + 1}-e3`, accountNo, actionType, "WORK_ACK",
        target, pf, platform, sAck.code, sAck.desc,
        "work received", fmt(baseOffset + 2), "success"));

      if (actionStatus === "running") {
        rows.push(mkRow(subId, `a${a + 1}-e4`, accountNo, actionType, "ACTION_EXECUTION",
          target, pf, platform, "--", "--",
          `${actionType} executing on node`, fmt(baseOffset + 8), "running"));
        continue;
      }
      rows.push(mkRow(subId, `a${a + 1}-e4`, accountNo, actionType, "ACTION_EXECUTION",
        target, pf, platform, sExec.code, sExec.desc,
        "收到 ACTION_EXECUTION 回调", fmt(baseOffset + 10), "success"));

      if (actionStatus === "success") {
        rows.push(mkRow(subId, `a${a + 1}-e5`, accountNo, actionType, "RESULT_CALLBACK",
          target, pf, platform, sResult.code, sResult.desc,
          `${actionType} executed successfully`, fmt(baseOffset + 12), "success"));
        rows.push(mkRow(subId, `a${a + 1}-e6`, accountNo, actionType, "WORK_COMPLETED",
          target, pf, platform, sCompleted.code, sCompleted.desc,
          "Work completed", fmt(baseOffset + 14), "success"));
      } else {
        rows.push(mkRow(subId, `a${a + 1}-e5`, accountNo, actionType, "RESULT_CALLBACK",
          target, pf, platform, failCode.code, failCode.desc,
          `${actionType} failed: ${failCode.desc}`, fmt(baseOffset + 12), "failed"));
        rows.push(mkRow(subId, `a${a + 1}-e6`, accountNo, actionType, "WORK_FAILED",
          target, pf, platform, failCode.code, failCode.desc,
          `Work failed: ${failCode.desc}`, fmt(baseOffset + 14), "failed"));
      }
    }
    for (let k = before; k < rows.length; k++) rows[k].subIndex = i;
  }
  rows.push(...buildPostLogs(t));
  rows.sort((a, b) => a.ts.localeCompare(b.ts));
  return rows;
}

// 贴文操作 → 子任务日志（与统计详情·贴文维度列表对应）
const POST_ACTION_TYPE_MAP: Record<string, string> = {
  点赞: "like_post", 评论: "comment_post", 发帖: "post_create", 关注: "follow_user",
  私信: "send_message", 兴趣分析: "analyze_interest", 浏览阅读: "browse_post",
  打开贴文: "open_post", 返回流程主页面: "back_to_home",
};

export function buildPostLogs(t: TaskRow): LogRow[] {
  const posts = buildPosts(t);
  const rows: LogRow[] = [];
  const baseDate = (t.createdAt.split(" ")[0] || "2026-04-22");
  posts.forEach((post, pIdx) => {
    const pf = platformText(post.platform);
    // 将贴文操作分配到对应账号子任务上，使账号子任务日志中可见这些事件
    const subIdx = t.total > 0 ? pIdx % t.total : 0;
    const subId = `${t.id}-${String(subIdx + 1).padStart(3, "0")}`;
    const baseAcc = USERNAMES[subIdx % USERNAMES.length];
    const accRound = Math.floor(subIdx / USERNAMES.length);
    const account = accRound === 0 ? baseAcc : `${baseAcc}-${accRound + 1}`;
    // 用 ingestedAt 作为基准时间，每个动作 +2s
    const [datePart, timePart] = post.ingestedAt.split(" ");
    const [bh, bm] = (timePart || "10:00").split(":").map(Number);
    const bs = 0;
    const fmt = (offset: number) => {
      const total = (bh * 3600 + bm * 60 + bs + offset) % 86400;
      return `${datePart || baseDate} ${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
    };
    post.actions.forEach((a, aIdx) => {
      if (t.subtype === "nurture" && (a.action === "发帖" || a.action === "私信")) return;
      const ok = a.ok;

      const code = ok ? "200010" : "100503";
      const desc = ok ? "贴文操作成功" : "请求被平台限流";
      rows.push({
        id: `${post.id}-${aIdx + 1}`,
        subTaskId: subId,
        subIndex: subIdx,
        account,
        actionType: POST_ACTION_TYPE_MAP[a.action] ?? a.action,
        eventType: a.action,
        target: post.title,
        targetUrl: post.url,
        targetTitle: post.title,
        platform: pf,
        platformBadge: post.platform,
        statusCode: code,
        statusCodeDesc: desc,
        content: `针对贴文《${post.title}》执行 [${a.action}]，结果：${ok ? "成功" : "失败"}`,
        ts: fmt(aIdx * 2),
        status: ok ? "success" : "failed",
      });
    });
  });
  return rows;
}

