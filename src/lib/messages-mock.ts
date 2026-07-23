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
  /** 是否标星（重点关注） */
  starred?: boolean;
  /** 标星备注（可选，仅内部可见） */
  starredNote?: string;
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

      // 追加不同发送状态的出站消息（mock 覆盖 sending/failed）
      // 规则：c===1 追加发送失败，c===2 追加发送中，其他保持已发送
      if (c === 1) {
        const failZh = "好的，稍后为您处理，请稍候片刻～";
        const failOrig = seed.lang === "zh" ? failZh : translateZhTo(seed.lang, failZh);
        msgs.push({
          id: `${convId}-m-fail`,
          direction: "out",
          lang: seed.lang,
          text: failOrig,
          sourceZh: failZh,
          time: timeAgo(t0 - 90),
          status: "failed",
          failReason: "网络异常，消息未送达",
        });
      } else if (c === 2) {
        const sendingZh = "感谢您的耐心等待，正在为您核实中。";
        const sendingOrig = seed.lang === "zh" ? sendingZh : translateZhTo(seed.lang, sendingZh);
        msgs.push({
          id: `${convId}-m-sending`,
          direction: "out",
          lang: seed.lang,
          text: sendingOrig,
          sourceZh: sendingZh,
          time: timeAgo(t0 - 90),
          status: "sending",
        });
      }


      const lastMsg = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => m.direction === "in" && !m.read).length;
      // Seed starred：每个账号的第 0 条会话默认标星；每 3 个账号的第 2 条也标星，覆盖跨账号场景
      const starred = c === 0 || (aIdx % 3 === 0 && c === 2);
      const starredNote = starred
        ? c === 0
          ? seed.topic === "shop"
            ? "客户咨询下单，等回复"
            : seed.topic === "collab"
              ? "合作意向，待发资料"
              : seed.topic === "support"
                ? "售后跟进中"
                : "重点客户"
          : undefined
        : undefined;
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
        starred,
        starredNote,
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

// ---- 假装翻译（zh -> peerLang），mock 用途，尽量让译文"看起来像"目标语言 ----
const PHRASE_DICT: Record<string, Partial<Record<MsgLang, string>>> = {
  "好的，稍后为您处理。": {
    en: "Sure, I'll take care of it shortly.",
    ja: "承知しました、のちほど対応いたします。",
    id: "Baik, akan segera saya proses.",
    ms: "Baik, saya akan uruskan sebentar lagi.",
    th: "รับทราบค่ะ เดี๋ยวจัดการให้นะคะ",
  },
  "好的，稍后为您处理，请稍候片刻～": {
    en: "Got it, I'll handle it for you shortly — please hold on for a moment.",
    ja: "承知しました。少々お待ちくださいませ、すぐに対応いたします。",
    id: "Baik, akan segera saya proses—mohon tunggu sebentar ya.",
    ms: "Baik, saya akan uruskan sebentar lagi—harap tunggu sekejap ya.",
    th: "รับทราบค่ะ กำลังดำเนินการให้อยู่ รบกวนรอสักครู่นะคะ",
  },
  "感谢您的关注！": {
    en: "Thanks for reaching out!",
    ja: "お問い合わせありがとうございます！",
    id: "Terima kasih sudah menghubungi!",
    ms: "Terima kasih kerana menghubungi kami!",
    th: "ขอบคุณที่ติดต่อเรานะคะ",
  },
  "感谢您的耐心等待，正在为您核实中。": {
    en: "Thanks for your patience — we're checking the details for you right now.",
    ja: "お待たせして申し訳ございません、ただいま確認しております。",
    id: "Terima kasih atas kesabarannya, sedang kami periksa ya.",
    ms: "Terima kasih atas kesabaran anda, kami sedang menyemaknya.",
    th: "ขอบคุณที่รอสักครู่นะคะ กำลังตรวจสอบให้อยู่ค่ะ",
  },
  "您好，M/L/XL 均有现货，稍后为您发一份完整尺码表。": {
    en: "Hi! M / L / XL are all in stock. I'll send over the full size chart shortly.",
    ja: "こんにちは！M・L・XL いずれも在庫がございます。のちほどサイズ表をお送りします。",
    id: "Halo! Ukuran M / L / XL semua tersedia, akan saya kirimkan panduan ukuran lengkapnya.",
    ms: "Hai! Saiz M / L / XL semuanya ada stok, saya akan hantar carta saiz penuh sebentar lagi.",
    th: "สวัสดีค่ะ ไซซ์ M / L / XL มีของครบเลยค่ะ เดี๋ยวส่งตารางไซซ์ให้นะคะ",
  },
  "好的，尺码表已在准备中，1 分钟内发给您～": {
    en: "Sure — the size chart is on its way, I'll send it within a minute.",
    ja: "承知しました。サイズ表を準備中で、1 分以内にお送りします。",
    id: "Baik, panduan ukuran sedang saya siapkan, dalam 1 menit akan saya kirim ya.",
    ms: "Baik, carta saiz sedang disiapkan, dalam masa 1 minit saya akan hantar.",
    th: "รับทราบค่ะ กำลังจัดตารางไซซ์ให้ ภายใน 1 นาทีจะส่งให้นะคะ",
  },
  "请问您平时的身高体重方便告诉我们吗？我们可以更精准推荐尺码。": {
    en: "Would you mind sharing your usual height and weight? That will help us recommend the right size.",
    ja: "普段の身長と体重を教えていただけますか？より正確なサイズをご提案いたします。",
    id: "Boleh info tinggi dan berat badan Anda? Biar kami bantu rekomendasikan ukurannya lebih pas.",
    ms: "Boleh kongsikan tinggi dan berat biasa? Supaya kami boleh syorkan saiz yang lebih tepat.",
    th: "รบกวนแจ้งส่วนสูงและน้ำหนักได้ไหมคะ จะได้แนะนำไซซ์ได้แม่นยำขึ้นค่ะ",
  },
  "已帮您查询，包裹预计明天送达，请注意查收。": {
    en: "I've checked for you — the parcel should arrive tomorrow. Please keep an eye out.",
    ja: "確認いたしました。お荷物は明日到着予定です。お受け取りをお願いいたします。",
    id: "Sudah saya cek, paketnya diperkirakan sampai besok, mohon ditunggu ya.",
    ms: "Saya sudah semak, bungkusan dijangka tiba esok. Sila pantau penghantaran ya.",
    th: "ตรวจสอบให้แล้วนะคะ พัสดุน่าจะถึงพรุ่งนี้ รบกวนรอรับด้วยค่ะ",
  },
  "订单已在派送中，稍后我把物流单号发给您。": {
    en: "Your order is out for delivery — I'll share the tracking number shortly.",
    ja: "ご注文は現在配送中です。追跡番号はのちほどお送りします。",
    id: "Pesanan sedang dalam pengiriman, nomor resi akan saya kirim menyusul.",
    ms: "Pesanan sedang dalam penghantaran, nombor penjejakan akan saya hantar sebentar lagi.",
    th: "ออเดอร์กำลังจัดส่งค่ะ เดี๋ยวส่งเลขพัสดุให้อีกทีนะคะ",
  },
  "非常抱歉给您带来困扰，我们已优先加急处理。": {
    en: "So sorry for the trouble — we've prioritised your case and are handling it urgently.",
    ja: "ご迷惑をおかけし大変申し訳ございません。優先的に対応させていただいております。",
    id: "Mohon maaf atas ketidaknyamanannya, kami sudah tangani sebagai prioritas.",
    ms: "Maaf atas kesulitan yang dialami, kami sudah utamakan dan uruskan segera.",
    th: "ขออภัยในความไม่สะดวกค่ะ เราเร่งดำเนินการให้เป็นกรณีเร่งด่วนแล้วนะคะ",
  },
  "感谢您的关注！方便留下邮箱吗？我把合作简介发给您。": {
    en: "Thanks for reaching out! Could you share your email? I'll send over our collaboration brief.",
    ja: "ご興味をお持ちいただきありがとうございます！メールアドレスを教えていただけますか？資料をお送りいたします。",
    id: "Terima kasih atas ketertarikannya! Boleh minta email-nya? Saya kirimkan proposal kerjasamanya.",
    ms: "Terima kasih atas minat anda! Boleh kongsi emel? Saya akan hantarkan ringkasan kerjasama.",
    th: "ขอบคุณที่สนใจนะคะ ขออีเมลได้ไหมคะ จะส่งข้อมูลความร่วมมือให้ค่ะ",
  },
  "很高兴收到您的邀请，我们的商务同事会在 24 小时内联系您。": {
    en: "Great to hear from you — our BD team will get in touch within 24 hours.",
    ja: "お声掛けいただき光栄です。ビジネス担当より 24 時間以内にご連絡いたします。",
    id: "Senang menerima undangan Anda, tim BD kami akan menghubungi dalam 24 jam.",
    ms: "Gembira menerima jemputan anda, pasukan BD kami akan menghubungi dalam 24 jam.",
    th: "ยินดีมากค่ะ ทีม BD ของเราจะติดต่อกลับภายใน 24 ชั่วโมงนะคะ",
  },
  "可以先介绍下品牌与合作形式吗？我们内部快速评估一下。": {
    en: "Could you share more about your brand and the collaboration format? We'll evaluate it internally.",
    ja: "貴ブランドと希望する協業形態を簡単に教えていただけますか？社内で速やかに検討いたします。",
    id: "Boleh info singkat tentang brand dan bentuk kerjasamanya? Kami akan review secara internal.",
    ms: "Boleh kongsikan sedikit tentang jenama dan bentuk kerjasama? Kami akan nilai secara dalaman.",
    th: "รบกวนเล่ารายละเอียดแบรนด์และรูปแบบความร่วมมือได้ไหมคะ เราจะประเมินภายในให้เร็วที่สุด",
  },
  "您好，感谢您的关注！请问有什么可以帮到您？": {
    en: "Hi there, thanks for reaching out! How can I help?",
    ja: "こんにちは、お問い合わせありがとうございます！何かお手伝いできることはございますか？",
    id: "Halo, terima kasih sudah menghubungi! Ada yang bisa saya bantu?",
    ms: "Hai, terima kasih kerana menghubungi kami! Ada yang boleh saya bantu?",
    th: "สวัสดีค่ะ ขอบคุณที่ติดต่อมานะคะ มีอะไรให้ช่วยเหลือไหมคะ",
  },
  "收到，稍后为您详细回复～": {
    en: "Got it — I'll get back to you with the details shortly.",
    ja: "承知しました、のちほど詳しくご返信いたします。",
    id: "Baik, akan saya balas lebih detail sebentar lagi.",
    ms: "Baik, saya akan balas dengan lebih terperinci sebentar lagi.",
    th: "รับทราบค่ะ เดี๋ยวตอบกลับแบบละเอียดให้อีกทีนะคะ",
  },
  "好的，我这边核实一下再回复您，请稍等。": {
    en: "Sure, let me verify on my side and get back to you — please hold on.",
    ja: "承知しました。こちらで確認のうえご返信いたしますので、少々お待ちください。",
    id: "Baik, saya cek dulu di sisi kami lalu segera balas, mohon tunggu ya.",
    ms: "Baik, biar saya semak dahulu dan akan balas kemudian. Sila tunggu sebentar.",
    th: "รับทราบค่ะ ขอเช็คทางเราก่อนแล้วจะตอบกลับ รบกวนรอสักครู่นะคะ",
  },
};

/** 未匹配到词条时使用的兜底：至少让输出看起来像目标语言的一句话 */
const FALLBACK_TEMPLATE: Record<MsgLang, (zh: string) => string> = {
  en: (zh) => `(Auto-translated) Reply to your message: ${zh}`,
  ja: (zh) => `（自動翻訳）ご返信いたします：${zh}`,
  id: (zh) => `(Terjemahan otomatis) Balasan untuk pesan Anda: ${zh}`,
  ms: (zh) => `(Terjemahan automatik) Balasan untuk mesej anda: ${zh}`,
  th: (zh) => `(แปลอัตโนมัติ) ตอบกลับข้อความของคุณ: ${zh}`,
  zh: (zh) => zh,
};

export function translateZhTo(lang: MsgLang, zh: string): string {
  const trimmed = zh.trim();
  if (!trimmed) return "";
  if (lang === "zh") return trimmed;
  const hit = PHRASE_DICT[trimmed]?.[lang];
  return hit ?? FALLBACK_TEMPLATE[lang](trimmed);
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
