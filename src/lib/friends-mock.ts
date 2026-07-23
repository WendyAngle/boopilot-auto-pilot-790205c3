// 好友管理 mock 数据
// 三种状态：pending（待处理）/ accepted（好友）/ rejected（已拒绝）
import {
  seedManagedAccounts,
  PLATFORM_META,
  type ManagedAccount,
  type Platform,
} from "@/lib/managed-account-mock";
import { getTenantScope } from "@/lib/tenant-scope";
import { LANG_LABEL, translateZhTo, type MsgLang } from "@/lib/messages-mock";

export { LANG_LABEL, translateZhTo };
export type { MsgLang };

export type FriendStatus = "pending" | "accepted" | "rejected";
export type FriendSource =
  | "profile_visit"
  | "post_engagement"
  | "mutual_friend"
  | "group"
  | "search"
  | "recommend";

export const SOURCE_LABEL: Record<FriendSource, string> = {
  profile_visit: "主页访问",
  post_engagement: "帖子互动",
  mutual_friend: "共同好友推荐",
  group: "群组成员",
  search: "搜索关注",
  recommend: "平台推荐",
};

export interface FriendRequest {
  id: string;
  accountId: string;
  status: FriendStatus;
  peerName: string;
  peerHandle: string;
  peerAvatar: string;
  peerLang: MsgLang;
  /** 申请留言原文 */
  requestText?: string;
  /** 申请留言中文翻译（非中文时提供） */
  requestTranslation?: string;
  mutualFriends: number;
  source: FriendSource;
  /** 申请时间 */
  requestedAt: string;
  /** 处理时间（通过/拒绝） */
  decidedAt?: string;
  /** 成为好友后的最近互动 */
  lastInteractAt?: string;
  /** 通过时发送给对方的欢迎语（中文原文） */
  welcomeZh?: string;
  /** 欢迎语实际发送译文 */
  welcomeText?: string;
  /** 内部备注（通过/拒绝均可填） */
  note?: string;
  /** 拒绝时对外说明（中文原文，展示给对方） */
  publicReasonZh?: string;
  /** 拒绝时对外说明（对方语种译文） */
  publicReasonText?: string;
}

const PEER_POOL: Array<{
  name: string;
  handle: string;
  lang: MsgLang;
  text?: string;
  zh?: string;
}> = [
  { name: "Emily Carter", handle: "@emily.c", lang: "en", text: "Hi! We met at the design meetup last week — mind if we connect?", zh: "嗨！我们上周在设计聚会上见过，可以加个好友吗？" },
  { name: "Kenji Tanaka", handle: "@kenji_t", lang: "ja", text: "はじめまして、いつも投稿を拝見しています。よろしくお願いします。", zh: "初次见面，一直有看你的帖子，请多关照。" },
  { name: "Rina Putri", handle: "@rina.p", lang: "id", text: "Halo kak, saya suka konten kamu. Boleh berteman?", zh: "你好，我很喜欢你的内容，可以加好友吗？" },
  { name: "Aidil Rahman", handle: "@aidil_r", lang: "ms", text: "Hai, kita ada kawan yang sama. Nak add friend ya.", zh: "嗨，我们有共同好友，想加你为好友。" },
  { name: "李婷婷", handle: "@liting", lang: "zh" },
  { name: "Somchai P.", handle: "@somchai", lang: "th", text: "สวัสดีค่ะ ขอเป็นเพื่อนด้วยนะคะ", zh: "你好，想加你做朋友。" },
  { name: "Marcus Lee", handle: "@marcuslee", lang: "en", text: "Loved your recent post about product design. Let's connect!", zh: "很喜欢你最近关于产品设计的帖子，交个朋友吧！" },
  { name: "小林 花子", handle: "@hanako_k", lang: "ja", text: "共通の友人がいるようです。仲良くしてください。", zh: "我们好像有共同好友，请多多关照。" },
  { name: "Nadia Salim", handle: "@nadia_s", lang: "id", text: "Kita satu grup komunitas kreator ya, salam kenal!", zh: "我们同在创作者社群，很高兴认识你！" },
  { name: "陈志远", handle: "@chenzhiyuan", lang: "zh", text: "你好，一直在关注你的内容，希望能认识一下。", zh: "你好，一直在关注你的内容，希望能认识一下。" },
];

const SOURCES: FriendSource[] = [
  "profile_visit",
  "post_engagement",
  "mutual_friend",
  "group",
  "search",
  "recommend",
];

function timeAgo(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

let _cache: FriendRequest[] | null = null;
let _accounts: ManagedAccount[] | null = null;

function build(): { accounts: ManagedAccount[]; requests: FriendRequest[] } {
  if (_cache && _accounts) return { accounts: _accounts, requests: _cache };

  const all = seedManagedAccounts();
  // 含好友申请或有互动潜力的账号（friend 或 msg 有一项非 0）
  const targetAccounts = all.filter(
    (a) => (a.pending?.friend ?? 0) > 0 || (a.pending?.msg ?? 0) > 0,
  );

  const requests: FriendRequest[] = [];
  targetAccounts.forEach((acc, aIdx) => {
    const pendingCount = Math.min(acc.pending?.friend ?? 0, 6);
    // 待处理
    for (let i = 0; i < pendingCount; i++) {
      const seed = PEER_POOL[(aIdx * 3 + i) % PEER_POOL.length];
      const src = SOURCES[(aIdx + i) % SOURCES.length];
      requests.push({
        id: `fr-${acc.id}-p${i}`,
        accountId: acc.id,
        status: "pending",
        peerName: seed.name,
        peerHandle: seed.handle,
        peerAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed.handle + "-p" + i)}`,
        peerLang: seed.lang,
        requestText: seed.text,
        requestTranslation: seed.lang === "zh" ? undefined : seed.zh,
        mutualFriends: (aIdx * 2 + i * 3) % 18,
        source: src,
        requestedAt: timeAgo(60 * (i + 1) + aIdx * 30),
      });
    }
    // 已通过（历史好友） 2 条
    for (let i = 0; i < 2; i++) {
      const seed = PEER_POOL[(aIdx * 5 + i + 3) % PEER_POOL.length];
      const src = SOURCES[(aIdx + i + 2) % SOURCES.length];
      const welcomeZh = "感谢添加，很高兴认识你，之后多交流～";
      requests.push({
        id: `fr-${acc.id}-a${i}`,
        accountId: acc.id,
        status: "accepted",
        peerName: seed.name,
        peerHandle: seed.handle,
        peerAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed.handle + "-a" + i)}`,
        peerLang: seed.lang,
        requestText: seed.text,
        requestTranslation: seed.lang === "zh" ? undefined : seed.zh,
        mutualFriends: 3 + ((aIdx + i) % 12),
        source: src,
        requestedAt: timeAgo(60 * 24 * (i + 2) + aIdx * 40),
        decidedAt: timeAgo(60 * 24 * (i + 2) - 30),
        lastInteractAt: timeAgo(60 * (i * 3 + 4) + aIdx * 15),
        welcomeZh,
        welcomeText: seed.lang === "zh" ? welcomeZh : translateZhTo(seed.lang, welcomeZh),
        note: i === 0 ? "潜在合作对象，保持互动" : undefined,
      });
    }
    // 已拒绝 1 条
    {
      const seed = PEER_POOL[(aIdx * 7 + 1) % PEER_POOL.length];
      requests.push({
        id: `fr-${acc.id}-r0`,
        accountId: acc.id,
        status: "rejected",
        peerName: seed.name + " Jr.",
        peerHandle: seed.handle + "_jr",
        peerAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed.handle + "-r0")}`,
        peerLang: seed.lang,
        requestText: seed.text,
        requestTranslation: seed.lang === "zh" ? undefined : seed.zh,
        mutualFriends: 0,
        source: "search",
        requestedAt: timeAgo(60 * 24 * 3 + aIdx * 20),
        decidedAt: timeAgo(60 * 24 * 3 - 60),
        note: "疑似营销账号，暂不通过",
      });
    }
  });

  requests.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
  _accounts = targetAccounts;
  _cache = requests;
  return { accounts: targetAccounts, requests };
}

export function getFriendData() {
  const { accounts, requests } = build();
  const scope = getTenantScope();
  const filteredAccounts =
    scope === "all" ? accounts : accounts.filter((a) => a.tenantId === scope);
  const validIds = new Set(filteredAccounts.map((a) => a.id));
  const filteredReqs = requests.filter((r) => validIds.has(r.accountId));
  return { accounts: filteredAccounts, requests: filteredReqs };
}

export function platformMeta(p: Platform) {
  return PLATFORM_META[p];
}
