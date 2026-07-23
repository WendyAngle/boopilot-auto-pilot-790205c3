// 私信管理 mock 数据
// 三级结构：账号 → 会话 → 消息
import {
  seedManagedAccounts,
  PLATFORM_META,
  type ManagedAccount,
  type Platform,
} from "@/lib/managed-account-mock";
import { getTenantScope } from "@/lib/tenant-scope";

export type MsgDirection = "in" | "out";
/** 消息语言：仅示例中出现的语种 */
export type MsgLang = "en" | "ja" | "id" | "ms" | "zh" | "th";

export const LANG_LABEL: Record<MsgLang, string> = {
  en: "English",
  ja: "日本語",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  zh: "中文",
  th: "ไทย",
};

/** 出站消息发送状态 */
export type SendStatus = "sending" | "sent" | "failed";

export interface DirectMessage {
  id: string;
  direction: MsgDirection;
  /** 消息原文语言 */
  lang: MsgLang;
  /** 原文 */
  text: string;
  /** 中文译文（外语消息必带；中文消息可空） */
  translation?: string;
  /** 用于 out 方向：用户输入的中文原稿（可选，仅演示自动翻译回填） */
  sourceZh?: string;
  time: string;
  /** in 方向是否已读 */
  read?: boolean;
  /** out 方向的发送状态 */
  status?: SendStatus;
  /** 发送失败时的原因（仅 status=failed） */
  failReason?: string;
}

export interface Conversation {
  id: string;
  accountId: string;
  /** 对方昵称 */
  peerName: string;
  peerAvatar: string;
  peerHandle: string;
  /** 对方使用的主要语言 */
  peerLang: MsgLang;
  unread: number;
  updatedAt: string;
  messages: DirectMessage[];
}

// ---------- 生成器 ----------

const PEER_SEEDS: Array<{
  name: string;
  handle: string;
  lang: MsgLang;
  topic: "shop" | "collab" | "support" | "greeting";
}> = [
  { name: "Emily Carter", handle: "@emily.c", lang: "en", topic: "shop" },
  { name: "Kenji Tanaka", handle: "@kenji_t", lang: "ja", topic: "collab" },
  { name: "Rina Putri", handle: "@rina.p", lang: "id", topic: "support" },
  { name: "Aidil Rahman", handle: "@aidil_r", lang: "ms", topic: "shop" },
  { name: "李婷婷", handle: "@liting", lang: "zh", topic: "greeting" },
  { name: "Somchai P.", handle: "@somchai", lang: "th", topic: "support" },
  { name: "Marcus Lee", handle: "@marcuslee", lang: "en", topic: "collab" },
  { name: "小林 花子", handle: "@hanako_k", lang: "ja", topic: "shop" },
];

const OPENING_BY_TOPIC: Record<
  "shop" | "collab" | "support" | "greeting",
  Record<MsgLang, { text: string; zh: string }>
> = {
  shop: {
    en: {
      text: "Hi! Is the black hoodie in stock in size M?",
      zh: "你好！那款黑色卫衣还有 M 码现货吗？",
    },
    ja: {
      text: "こんにちは、この商品は日本へ配送できますか？",
      zh: "你好，这个商品可以配送到日本吗？",
    },
    id: {
      text: "Halo, apakah ada diskon untuk pembelian 2 pcs?",
      zh: "你好，买两件有没有优惠？",
    },
    ms: {
      text: "Hai, boleh saya tahu masa penghantaran ke KL?",
      zh: "你好，请问寄到吉隆坡要多久？",
    },
    zh: { text: "你好，这款有其他颜色吗？", zh: "你好，这款有其他颜色吗？" },
    th: { text: "สวัสดีค่ะ สินค้าตัวนี้มีไซซ์ L ไหมคะ", zh: "你好，这款有 L 码吗？" },
  },
  collab: {
    en: {
      text: "Love your content! Are you open to brand collaborations?",
      zh: "很喜欢你的内容！有兴趣做品牌合作吗？",
    },
    ja: {
      text: "コラボのご相談をさせていただけますでしょうか？",
      zh: "方便聊一下合作事宜吗？",
    },
    id: { text: "Kami tertarik untuk kolaborasi konten, boleh?", zh: "我们想做内容合作，方便聊聊吗？" },
    ms: { text: "Kami nak jemput anda buat kolaborasi jenama.", zh: "我们想邀请你做品牌合作。" },
    zh: { text: "方便沟通下联名合作吗？", zh: "方便沟通下联名合作吗？" },
    th: { text: "สนใจร่วมงานกับแบรนด์เราไหมคะ", zh: "有兴趣和我们品牌合作吗？" },
  },
  support: {
    en: {
      text: "My order #A2381 hasn't arrived yet. Any update?",
      zh: "我的订单 A2381 还没到，能查一下吗？",
    },
    ja: {
      text: "注文番号 A2381 の配送状況を教えてください。",
      zh: "请帮我查一下订单 A2381 的物流。",
    },
    id: {
      text: "Pesanan saya belum sampai, bisa dicek?",
      zh: "我的订单还没到，能帮忙查下吗？",
    },
    ms: {
      text: "Pesanan saya masih belum sampai, boleh semak?",
      zh: "我的订单还没到，可以帮忙查一下吗？",
    },
    zh: { text: "客服在吗？我的包裹还没到。", zh: "客服在吗？我的包裹还没到。" },
    th: { text: "พัสดุยังไม่ถึงเลยค่ะ ช่วยเช็คให้หน่อยได้ไหม", zh: "包裹还没到，可以帮我查一下吗？" },
  },
  greeting: {
    en: { text: "Hey! Just followed you 😊", zh: "嗨！刚关注你 😊" },
    ja: { text: "はじめまして、フォローしました！", zh: "你好，刚关注了你！" },
    id: { text: "Halo, salam kenal ya!", zh: "你好，很高兴认识你！" },
    ms: { text: "Hai, baru follow awak!", zh: "你好，刚关注你！" },
    zh: { text: "你好呀，认识一下～", zh: "你好呀，认识一下～" },
    th: { text: "สวัสดีค่ะ ยินดีที่ได้รู้จัก", zh: "你好，很高兴认识你！" },
  },
};

function timeAgo(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

let _cache: Conversation[] | null = null;
let _accounts: ManagedAccount[] | null = null;

function buildAll(): { accounts: ManagedAccount[]; conversations: Conversation[] } {
  if (_cache && _accounts) return { accounts: _accounts, conversations: _cache };

  const all = seedManagedAccounts();
  // 只选取带私信待处理的账号（pending.msg > 0），保证列表有信号可看
  const accountsWithMsg = all.filter((a) => (a.pending?.msg ?? 0) > 0);
  const conversations: Conversation[] = [];

  accountsWithMsg.forEach((acc, aIdx) => {
    const convCount = Math.min(acc.pending?.msg ?? 1, 5); // 最多 5 个会话
    for (let c = 0; c < convCount; c++) {
      const seed = PEER_SEEDS[(aIdx * 3 + c) % PEER_SEEDS.length];
      const opening = OPENING_BY_TOPIC[seed.topic][seed.lang];
      const convId = `conv-${acc.id}-${c}`;
      const msgs: DirectMessage[] = [];

      // 对方开场
      const t0 = 60 * 24 * (c + 1) + aIdx * 7;
      msgs.push({
        id: `${convId}-m0`,
        direction: "in",
        lang: seed.lang,
        text: opening.text,
        translation: seed.lang === "zh" ? undefined : opening.zh,
        time: timeAgo(t0),
        read: false,
      });

      // 若非最新一条，追加账号侧的回复 + 对方追问，模拟多轮
      if (c > 0) {
        const replyZh = seed.topic === "shop"
          ? "在的，M 码有现货，需要帮您下单吗？"
          : seed.topic === "collab"
            ? "感谢关注～可以先发一份合作简介到邮箱吗？"
            : seed.topic === "support"
              ? "已帮您查询，包裹预计明天送达。"
              : "你好，感谢关注～";
        const replyLang = seed.lang;
        const replyOrig =
          replyLang === "en"
            ? "Yes, size M is in stock. Want me to place the order for you?"
            : replyLang === "ja"
              ? "はい、Mサイズ在庫あります。ご注文お手伝いしましょうか？"
              : replyLang === "id"
                ? "Ada kak, ukuran M ready. Mau saya bantu order?"
                : replyLang === "ms"
                  ? "Ada, saiz M ready stock. Nak saya tolong order?"
                  : replyLang === "th"
                    ? "มีค่ะ ไซซ์ M พร้อมส่ง สนใจให้ช่วยสั่งไหมคะ"
                    : replyZh;
        msgs.push({
          id: `${convId}-m1`,
          direction: "out",
          lang: replyLang,
          text: replyOrig,
          sourceZh: replyZh,
          time: timeAgo(t0 - 30),
          status: "sent",
        });

        // 对方追问
        const followUp = seed.lang === "en"
          ? { text: "Great, could you share the size chart?", zh: "太好了，能发下尺码表吗？" }
          : seed.lang === "ja"
            ? { text: "ありがとうございます、サイズ表を送ってください。", zh: "谢谢，能发一下尺码表吗？" }
            : seed.lang === "id"
              ? { text: "Oke, boleh minta ukuran detailnya?", zh: "好的，能发下详细尺码吗？" }
              : seed.lang === "ms"
                ? { text: "Ok, boleh share size chart?", zh: "好的，能发下尺码表吗？" }
                : seed.lang === "th"
                  ? { text: "โอเคค่ะ ขอตารางไซซ์ด้วยนะคะ", zh: "好的，请发一下尺码表。" }
                  : { text: "好的，麻烦发下尺码表～", zh: "好的，麻烦发下尺码表～" };
        msgs.push({
          id: `${convId}-m2`,
          direction: "in",
          lang: seed.lang,
          text: followUp.text,
          translation: seed.lang === "zh" ? undefined : followUp.zh,
          time: timeAgo(t0 - 60),
          read: false,
        });
      }

      const lastMsg = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => m.direction === "in" && !m.read).length;
      conversations.push({
        id: convId,
        accountId: acc.id,
        peerName: seed.name,
        peerAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
          seed.handle,
        )}`,
        peerHandle: seed.handle,
        peerLang: seed.lang,
        unread,
        updatedAt: lastMsg.time,
        messages: msgs,
      });
    }
  });

  conversations.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  _accounts = accountsWithMsg;
  _cache = conversations;
  return { accounts: accountsWithMsg, conversations };
}

export function getInboxData() {
  const { accounts, conversations } = buildAll();
  const scope = getTenantScope();
  const filteredAccounts = scope === "all"
    ? accounts
    : accounts.filter((a) => a.tenantId === scope);
  const validIds = new Set(filteredAccounts.map((a) => a.id));
  const filteredConvs = conversations.filter((c) => validIds.has(c.accountId));
  return { accounts: filteredAccounts, conversations: filteredConvs };
}

export function platformMeta(p: Platform) {
  return PLATFORM_META[p];
}

// ---- 假装翻译（zh <-> peerLang），只做展示用 ----
const ZH_TO_LANG_SAMPLES: Record<MsgLang, (zh: string) => string> = {
  en: (zh) => `[EN] ${zh}`,
  ja: (zh) => `[JA] ${zh}`,
  id: (zh) => `[ID] ${zh}`,
  ms: (zh) => `[MS] ${zh}`,
  th: (zh) => `[TH] ${zh}`,
  zh: (zh) => zh,
};

export function translateZhTo(lang: MsgLang, zh: string): string {
  if (!zh.trim()) return "";
  // 常用短句给一份更像样的示例翻译
  const dict: Record<string, Partial<Record<MsgLang, string>>> = {
    "好的，稍后为您处理。": {
      en: "Sure, I'll take care of it shortly.",
      ja: "承知しました、のちほど対応いたします。",
      id: "Baik, akan segera saya proses.",
      ms: "Baik, saya akan uruskan sebentar lagi.",
      th: "รับทราบค่ะ เดี๋ยวจัดการให้นะคะ",
    },
    "感谢您的关注！": {
      en: "Thanks for reaching out!",
      ja: "お問い合わせありがとうございます！",
      id: "Terima kasih sudah menghubungi!",
      ms: "Terima kasih kerana menghubungi kami!",
      th: "ขอบคุณที่ติดต่อเรานะคะ",
    },
  };
  const hit = dict[zh.trim()]?.[lang];
  return hit ?? ZH_TO_LANG_SAMPLES[lang](zh);
}

// AI 回复候选生成（根据最近一条对方消息）
export function aiSuggestReplies(
  conv: Conversation,
): { zh: string; translated: string }[] {
  const lastIn = [...conv.messages].reverse().find((m) => m.direction === "in");
  const topic = lastIn?.text ?? "";
  const bank: string[] = [];
  if (/size|尺码|サイズ|ukuran|saiz|ไซซ์/i.test(topic)) {
    bank.push(
      "您好，M/L/XL 均有现货，稍后为您发一份完整尺码表。",
      "好的，尺码表已在准备中，1 分钟内发给您～",
      "请问您平时的身高体重方便告诉我们吗？我们可以更精准推荐尺码。",
    );
  } else if (/order|订单|注文|pesanan|พัสดุ/i.test(topic)) {
    bank.push(
      "已帮您查询，包裹预计明天送达，请注意查收。",
      "订单已在派送中，稍后我把物流单号发给您。",
      "非常抱歉给您带来困扰，我们已优先加急处理。",
    );
  } else if (/collab|合作|コラボ|kolaborasi/i.test(topic)) {
    bank.push(
      "感谢您的关注！方便留下邮箱吗？我把合作简介发给您。",
      "很高兴收到您的邀请，我们的商务同事会在 24 小时内联系您。",
      "可以先介绍下品牌与合作形式吗？我们内部快速评估一下。",
    );
  } else {
    bank.push(
      "您好，感谢您的关注！请问有什么可以帮到您？",
      "收到，稍后为您详细回复～",
      "好的，我这边核实一下再回复您，请稍等。",
    );
  }
  return bank.slice(0, 3).map((zh) => ({
    zh,
    translated: translateZhTo(conv.peerLang, zh),
  }));
}
