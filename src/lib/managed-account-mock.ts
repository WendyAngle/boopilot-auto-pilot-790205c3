// 共享的「托管账号」mock 数据 / 类型 / 常量
// 列表页与详情页都从此处取，保证两端数据一致。
import { TENANTS_SEED } from "@/lib/tenants";
import { getUsableTags } from "@/lib/systemTags";

export type Platform =
  | "Facebook"
  | "Tiktok"
  | "Instagram"
  | "Twitter/X"
  | "WhatsApp";

export type AccountStatus =
  | "normal"
  | "pending"
  | "risk"
  | "disabled"
  | "fail";
export type DeviceType = "云机" | "Windows虚拟机";

export interface ManagedAccount {
  id: string;
  platform: Platform;
  username: string;
  platformId: string;
  avatar: string;
  remark: string;
  cookieValue?: string;
  /** Facebook 专用：6 位 PIN 码 */
  pinCode?: string;
  followers: number;
  following: number;
  likes: number;
  accountStatus: AccountStatus;
  tags: string[];
  deviceType?: DeviceType;
  country: string;
  accountCountry: string;
  personaName?: string;
  ownerName?: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  pending?: { msg: number; friend: number };
}

export const PLATFORMS: Platform[] = [
  "Facebook",
  "Tiktok",
  "Instagram",
  "Twitter/X",
  "WhatsApp",
];

export const PLATFORM_META: Record<Platform, { cls: string; letter: string }> = {
  Facebook: { cls: "bg-blue-600 text-white", letter: "F" },
  Tiktok: { cls: "bg-foreground text-background", letter: "T" },
  Instagram: {
    cls: "bg-gradient-to-br from-pink-500 to-yellow-400 text-white",
    letter: "I",
  },
  "Twitter/X": { cls: "bg-sky-500 text-white", letter: "X" },
  WhatsApp: { cls: "bg-emerald-500 text-white", letter: "W" },
};

export const ACCOUNT_STATUS_META: Record<
  AccountStatus,
  { label: string; cls: string }
> = {
  pending: {
    label: "待确认",
    cls: "bg-warning/10 text-warning border-warning/30",
  },
  normal: {
    label: "正常",
    cls: "bg-success/10 text-success border-success/30",
  },
  disabled: {
    label: "功能受限",
    cls: "bg-warning/10 text-warning border-warning/30",
  },
  risk: {
    label: "风控",
    cls: "bg-warning/10 text-warning border-warning/30",
  },
  fail: {
    label: "账号被封",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
  },
};


export const ACTIVE_TENANTS = TENANTS_SEED.filter((t) => t.status === "active");
export const OPERATORS = ["陈晓明", "李雨欣", "王浩然", "张梦琪", "刘子轩"];
export const OPERATOR_RECORDS: { name: string; phone: string }[] = OPERATORS.map(
  (name, i) => ({ name, phone: `138${String(10000000 + i * 137).slice(0, 8)}` }),
);
export const PERSONAS = ["个人主号", "工作IP号", "Boo小宇", "品牌主线", "客服主线"];
export const COUNTRIES = ["美国", "日本", "新加坡", "印度尼西亚", "中国", "马来西亚"];
export const USERNAMES = [
  "TechFlow Global",
  "Boo Studio",
  "boo.daily",
  "@boo_shorts",
  "客服-小美",
  "@zhang_ip",
  "海风出海",
  "云尚美妆",
  "极客SaaS",
  "悦己生活",
  "星航跨境",
  "Boo小宇",
  "Marketing Hub",
  "DTC Brand",
  "Cross-Border",
  "Lifestyle 365",
  "BeautyDaily",
  "GadgetReview",
];

export function seedManagedAccounts(): ManagedAccount[] {
  const rows: ManagedAccount[] = [];
  const tenantPendingCount = new Map<string, number>();
  for (let i = 1; i <= 24; i++) {
    const platform = PLATFORMS[i % PLATFORMS.length];
    const username = USERNAMES[i % USERNAMES.length];
    const tenant = ACTIVE_TENANTS[i % ACTIVE_TENANTS.length];
    const statusPool: AccountStatus[] = [
      "normal",
      "pending",
      "risk",
      "disabled",
      "fail",
    ];
    // 多数账号为「正常」，其余覆盖各种状态以便演示
    const status: AccountStatus =
      i % 4 === 0 ? statusPool[(i / 4) % statusPool.length] : "normal";
    const tagPool = getUsableTags().map((t) => t.name);
    const tags =
      tagPool.length > 0
        ? Array.from(
            { length: (i % 2) + 1 },
            (_, k) => tagPool[(i + k * 3) % tagPool.length],
          )
        : [];
    // 每个租户至少保证 2 个账号有待处理事项，覆盖「仅加好友 / 仅私信 / 两者均有」三种情况
    const tenantKey = tenant?.id ?? "__none__";
    const orderInTenant = tenantPendingCount.get(tenantKey) ?? 0;
    tenantPendingCount.set(tenantKey, orderInTenant + 1);
    let pending: { msg: number; friend: number } | undefined;
    if (orderInTenant === 0) {
      pending = { msg: 3 + (i % 6), friend: 2 + (i % 4) };
    } else if (orderInTenant === 1) {
      pending = { msg: 0, friend: 1 + (i % 5) };
    } else if (orderInTenant === 2) {
      pending = { msg: 2 + (i % 7), friend: 0 };
    }
    rows.push({
      id: `m-${i}`,
      platform,
      username,
      platformId: `${1000123456 + i * 7919}`,
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=managed-${i}`,
      remark: i % 4 === 0 ? "重点托管账号" : i % 3 === 0 ? "矩阵号" : "--",
      followers: 800 + ((i * 137) % 99000),
      following: 50 + ((i * 17) % 1200),
      likes: 1200 + ((i * 211) % 580000),
      accountStatus: status,
      tags,
      deviceType: i % 2 === 0 ? "云机" : "Windows虚拟机",
      country: COUNTRIES[i % COUNTRIES.length],
      accountCountry: COUNTRIES[(i + 2) % COUNTRIES.length],
      personaName: i % 3 === 0 ? undefined : PERSONAS[i % PERSONAS.length],
      ownerName: i % 5 === 0 ? undefined : OPERATORS[i % OPERATORS.length],
      tenantId: tenant?.id ?? "",
      tenantName: tenant?.name ?? "未分配",
      createdAt: `2026-04-${String((i % 27) + 1).padStart(2, "0")} ${String(
        20 - (i % 12),
      ).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
      pending,
    });
  }
  return rows;
}

export function findManagedAccountById(id: string): ManagedAccount | undefined {
  return seedManagedAccounts().find((r) => r.id === id);
}
