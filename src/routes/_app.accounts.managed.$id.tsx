import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Calendar,
  Link as LinkIcon,
  Bell,
  Image as ImageIcon,
  Lock,
  Clock,
  Play,
  MessageSquare,
  Repeat2,
  Heart,
  BarChart3,
  RefreshCw,
  Pencil,
  Users2,
  ThumbsUp,
  Eye,
  Building,
  Server,
  Smartphone,
  ShieldCheck,
  Copy,
  EyeOff,
  CheckCircle2,
  KeyRound,
  Inbox,
  Tag as TagIcon,
  UserCircle2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { cn } from "@/lib/utils";
import { findTagByName } from "@/lib/systemTags";

import {
  findManagedAccountById,
  type ManagedAccount,
  type Platform,
  ACCOUNT_STATUS_META,
  PLATFORM_META,
  COUNTRIES,
  OPERATORS,
  ACTIVE_TENANTS,
} from "@/lib/managed-account-mock";
import { InterestPreferenceDialog } from "@/components/interest-preference-dialog";


export const Route = createFileRoute("/_app/accounts/managed/$id")({
  component: ManagedAccountDetailPage,
  head: () => ({ meta: [{ title: "托管账号详情 — BooPilot" }] }),
});

/* ============================================================ */
/* 主页面                                                       */
/* ============================================================ */

function ManagedAccountDetailPage() {
  const { id } = useParams({ from: "/_app/accounts/managed/$id" });
  const account = findManagedAccountById(id);
  const [tab, setTab] = useState("basic");

  if (!account) {
    return (
      <div className="space-y-4">
        <BackBar />
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          未找到对应的托管账号
        </div>
      </div>
    );
  }

  const derived = useMemo(() => deriveAccountDetail(account), [account]);

  return (
    <div className="space-y-4">
      <BackBar />
      <HeaderCard account={account} derived={derived} />
      <KpiStrip account={account} derived={derived} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="bg-card border h-auto p-1">
            <TabTrig value="basic">基础资料</TabTrig>
            <TabTrig value="preview">平台预览</TabTrig>
            <TabTrig value="cred">凭据</TabTrig>
            <TabTrig value="binding">资源</TabTrig>
            <TabTrig value="tags">标签</TabTrig>
          </TabsList>
        </div>

        <TabsContent value="basic" className="space-y-4">
          <PendingBanner account={account} />
          <BasicInfoCard account={account} derived={derived} />
          <InterestPreferenceCard account={account} />
        </TabsContent>


        <TabsContent value="preview">
          <PlatformPreview account={account} />
        </TabsContent>

        <TabsContent value="cred">
          <CredentialCard account={account} derived={derived} />
        </TabsContent>

        <TabsContent value="binding">
          <BindingCard derived={derived} />
        </TabsContent>

        <TabsContent value="tags">
          <TagsCard account={account} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabTrig({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-1.5 text-sm font-medium"
    >
      {children}
    </TabsTrigger>
  );
}

/* ============================================================ */
/* 顶部条                                                       */
/* ============================================================ */
function BackBar() {
  return (
    <div className="flex items-center">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
        <Link to="/accounts/managed">
          <ArrowLeft className="h-4 w-4" />
          返回账号列表
        </Link>
      </Button>
    </div>
  );
}

function HeaderCard({ account, derived }: { account: ManagedAccount; derived: DerivedDetail }) {
  const sm = ACCOUNT_STATUS_META[account.accountStatus];
  const pm = PLATFORM_META[account.platform];
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16 ring-2 ring-border">
              <AvatarImage src={account.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {account.username.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-card",
                pm.cls,
              )}
            >
              {pm.letter}
            </span>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {account.username}
              </h1>
              <Badge
                variant="outline"
                className="rounded-full bg-violet-500/10 text-violet-600 border-violet-300/40 text-[10px]"
              >
                托管账号
              </Badge>
              <Badge variant="outline" className={cn("rounded-full text-[10px]", sm.cls)}>
                {sm.label}
              </Badge>
              <Badge variant="outline" className="rounded-full text-[10px]">
                {account.platform}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <MetaItem label="平台ID" value={account.platformId} mono />
              <MetaItem label="添加时间" value={account.createdAt} />
              <MetaItem label="账号活跃时间" value={derived.activeTime} />
              <MetaItem label="禁/启用执行动作" value={derived.actions.map(a => `${a.label} ${a.enabled ? "已启用" : "已禁用"}`).join(" · ")} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={() => toast.success("已触发同步")}>
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
        </div>

      </div>
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span>{label}:</span>
      <span className={cn("text-foreground", mono && "font-mono")}>{value}</span>
    </span>
  );
}

/* ============================================================ */
/* KPI 数据条                                                   */
/* ============================================================ */
function KpiStrip({ account, derived }: { account: ManagedAccount; derived: DerivedDetail }) {
  const items: { label: string; value: number; tone: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "粉丝", value: account.followers, tone: "text-foreground", icon: Users2 },
    { label: "关注", value: account.following, tone: "text-foreground", icon: UserCircle2 },
    { label: "获赞", value: account.likes, tone: "text-emerald-600", icon: ThumbsUp },
    { label: "播放量", value: derived.views, tone: "text-sky-600", icon: Eye },
    { label: "私信", value: derived.dms, tone: "text-amber-600", icon: MessageSquare },
    { label: "评论", value: derived.comments, tone: "text-rose-600", icon: Inbox },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs text-muted-foreground">{m.label}</span>
            <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className={cn("mt-1 text-2xl font-bold tabular-nums", m.tone)}>
            {formatNum(m.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/* ============================================================ */
/* 基础资料 Tab                                                 */
/* ============================================================ */
function PendingBanner({ account }: { account: ManagedAccount }) {
  if (!account.pending || (account.pending.msg === 0 && account.pending.friend === 0)) return null;
  const { msg, friend } = account.pending;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
      <div className="flex items-center gap-2 text-warning">
        <Bell className="h-4 w-4" />
        <span className="font-medium">该账号有待处理事项</span>
        <span className="text-xs text-muted-foreground">
          {friend > 0 && `${friend} 条加好友`}
          {friend > 0 && msg > 0 && " · "}
          {msg > 0 && `${msg} 条私信`}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={() => toast.success("已标记当日已处理")}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        标记当日已处理
      </Button>
    </div>
  );
}

function BasicInfoCard({ account, derived }: { account: ManagedAccount; derived: DerivedDetail }) {
  const sm = ACCOUNT_STATUS_META[account.accountStatus];

  const initial = {
    username: account.username,
    country: account.country,
    accountCountry: account.accountCountry,
    tenantId: account.tenantId,
    ownerName: account.ownerName ?? "",
    deviceType: account.deviceType ?? "",
    remark: account.remark === "--" ? "" : account.remark,
    accountStatus: account.accountStatus,
  };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startEdit = () => {
    setForm(initial);
    setEditing(true);
  };
  const cancel = () => {
    setForm(initial);
    setEditing(false);
  };
  const onConfirm = () => {
    setConfirmOpen(false);
    setEditing(false);
    toast.success("基础资料已更新（mock）");
  };

  const tenantName =
    ACTIVE_TENANTS.find((t) => t.id === form.tenantId)?.name ?? account.tenantName;

  const editable = (field: keyof typeof form, node: React.ReactNode, viewValue: React.ReactNode) =>
    editing ? node : viewValue;

  const rows: KvRow[] = [
    { label: "账号ID", value: <Mono>{account.id.replace("m-", "20664414804354826")}</Mono> },
    { label: "平台", value: <Badge variant="outline" className="bg-primary/10 text-primary">{account.platform}</Badge> },
    {
      label: "账号名",
      value: editable(
        "username",
        <Input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="h-8"
        />,
        account.username,
      ),
    },
    { label: "平台账号ID", value: <Mono>{account.platformId}</Mono> },
    {
      label: "账号状态",
      value: editable(
        "accountStatus",
        <Select
          value={form.accountStatus}
          onValueChange={(v) => setForm({ ...form, accountStatus: v as typeof form.accountStatus })}
        >
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(ACCOUNT_STATUS_META) as Array<keyof typeof ACCOUNT_STATUS_META>).map((k) => (
              <SelectItem key={k} value={k}>{ACCOUNT_STATUS_META[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>,
        <Badge variant="outline" className={cn("rounded-full", sm.cls)}>{sm.label}</Badge>,
      ),
    },
    {
      label: "账号所属地区",
      value: editable(
        "accountCountry",
        <Select value={form.accountCountry} onValueChange={(v) => setForm({ ...form, accountCountry: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>,
        account.accountCountry,
      ),
    },
    {
      label: "代理国家/地区",
      value: editable(
        "country",
        <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>,
        account.country,
      ),
    },
    { label: "代理IP", value: <Mono>{derived.proxyIp}</Mono> },
    {
      label: "所属租户",
      value: editable(
        "tenantId",
        <Select value={form.tenantId} onValueChange={(v) => setForm({ ...form, tenantId: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTIVE_TENANTS.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>,
        editing ? tenantName : account.tenantName,
      ),
    },
    {
      label: "负责人",
      value: editable(
        "ownerName",
        <Select
          value={form.ownerName || "__none__"}
          onValueChange={(v) => setForm({ ...form, ownerName: v === "__none__" ? "" : v })}
        >
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">未分配</SelectItem>
            {OPERATORS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>,
        account.ownerName ?? "—",
      ),
    },
    {
      label: "设备类型",
      value: editable(
        "deviceType",
        <Select
          value={form.deviceType || "__none__"}
          onValueChange={(v) => setForm({ ...form, deviceType: v === "__none__" ? "" : v })}
        >
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            <SelectItem value="云机">云机</SelectItem>
            <SelectItem value="Windows虚拟机">Windows虚拟机</SelectItem>
          </SelectContent>
        </Select>,
        account.deviceType ?? "—",
      ),
    },
    { label: "最近绑定设备", value: <Mono>{derived.deviceId}</Mono> },
    {
      label: "备注",
      value: editable(
        "remark",
        <Textarea
          value={form.remark}
          onChange={(e) => setForm({ ...form, remark: e.target.value })}
          placeholder="补充说明（可选）"
          className="min-h-[72px]"
        />,
        account.remark === "--" ? "—" : account.remark,
      ),
      span: 2,
    },
    { label: "创建时间", value: account.createdAt },
    { label: "更新时间", value: account.createdAt },
    { label: "账号活跃时间", value: derived.activeTime },
    {
      label: "禁/启用执行动作",
      value: (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {derived.actions.map((a) => (
            <span key={a.label} className="inline-flex items-center gap-1.5">
              <span className="text-foreground">{a.label}</span>
              <Badge variant={a.enabled ? "default" : "secondary"} className="h-5 px-1.5 text-[11px]">
                {a.enabled ? "已启用" : "已禁用"}
              </Badge>
            </span>
          ))}
        </div>
      ),
    },

  ];

  return (
    <SectionCard
      title="账号基础信息"
      action={
        editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cancel}>取消</Button>
            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              确定
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
        )
      }
    >
      <KvGrid rows={rows} />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存修改？</AlertDialogTitle>
            <AlertDialogDescription>
              保存后将立即更新该账号的基础资料，请确认信息无误。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>确认保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}


/* ============================================================ */
/* 兴趣偏好 卡片（基础资料 Tab）                                */
/* 数据结构与「设置兴趣偏好」弹窗保持一致：多组偏好 + 兴趣关键词  */
/* + 搜索 / 点赞 / 关注 / 评论（含比例、情绪、风格）              */
/* ============================================================ */
type InterestPrefGroup = {
  interestKeywords: string[];
  search: { enabled: boolean; keywords: string };
  like: { enabled: boolean; min: number; max: number };
  follow: { enabled: boolean; min: number; max: number };
  comment: {
    enabled: boolean;
    min: number;
    max: number;
    sentiment: string;
    style: string;
  };
};

const INTEREST_KW_POOL = [
  "travel", "food", "parenting", "fitness", "tech",
  "beauty", "finance", "gaming", "pets", "music", "photography", "outdoor",
];
const SEARCH_KW_POOL = ["travel tips", "street food", "family trip", "smart home", "skincare routine", "budget travel"];
const SENTIMENT_POOL = ["warm / specific", "friendly / positive", "calm / rational", "curious / engaging"];
const STYLE_POOL = ["short / natural", "casual / concise", "specific / detail", "warm / relatable"];

function deriveInterestGroups(accountId: string): InterestPrefGroup[] {
  const h = Array.from(accountId).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pick = <T,>(arr: T[], n: number, seed: number) =>
    Array.from({ length: n }, (_, i) => arr[(seed + i * 5) % arr.length]);
  const groupCount = (h % 2) + 1; // 1~2 组
  return Array.from({ length: groupCount }, (_, gi) => {
    const s = h + gi * 97;
    return {
      interestKeywords: pick(INTEREST_KW_POOL, 3, s),
      search: { enabled: true, keywords: SEARCH_KW_POOL[s % SEARCH_KW_POOL.length] },
      like: { enabled: true, min: 5 + (s % 6), max: 15 + (s % 11) },
      follow: { enabled: gi === 0, min: 0, max: 8 + (s % 8) },
      comment: {
        enabled: true,
        min: 3 + (s % 4),
        max: 10 + (s % 10),
        sentiment: SENTIMENT_POOL[s % SENTIMENT_POOL.length],
        style: STYLE_POOL[(s + 2) % STYLE_POOL.length],
      },
    };
  });
}

function InterestPreferenceCard({ account }: { account: ManagedAccount }) {
  const groups = useMemo(() => deriveInterestGroups(account.id), [account.id]);
  const [editing, setEditing] = useState(false);

  const StatItem = ({
    icon,
    title,
    enabled,
    range,
  }: {
    icon: React.ReactNode;
    title: string;
    enabled: boolean;
    range?: { min: number; max: number };
  }) => (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
        enabled ? "border-primary/20 bg-primary/5" : "border-dashed bg-muted/30",
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">
          {enabled ? (range ? `${range.min}% - ${range.max}%` : "已开启") : "未开启"}
        </div>
      </div>
    </div>
  );

  const renderGroup = (g: InterestPrefGroup, idx: number) => (
    <div key={idx} className="space-y-2.5 rounded-lg border p-3">
      <div className="flex items-center justify-between border-b border-dashed pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">第 {idx + 1} 组</Badge>
          <span className="text-[11px] text-muted-foreground">养号任务每次随机选择一组执行</span>
        </div>
      </div>

      {/* 兴趣关键词 */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Eye className="h-3 w-3" />
          兴趣关键词
        </div>
        <div className="flex flex-wrap gap-1.5">
          {g.interestKeywords.map((k) => (
            <Badge key={k} variant="outline" className="bg-primary/5 text-foreground border-primary/20">
              {k}
            </Badge>
          ))}
        </div>
      </div>

      {/* 搜索关键词 */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          搜索关键词
          <span className={cn(
            "ml-1 rounded-sm px-1 text-[10px]",
            g.search.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}>
            {g.search.enabled ? "已开启" : "未开启"}
          </span>
        </div>
        {g.search.enabled && (
          <div className="text-xs text-foreground">{g.search.keywords}</div>
        )}
      </div>

      {/* 互动策略 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatItem icon={<Heart className="h-3.5 w-3.5" />} title="点赞" enabled={g.like.enabled} range={g.like} />
        <StatItem icon={<Users2 className="h-3.5 w-3.5" />} title="关注" enabled={g.follow.enabled} range={g.follow} />
        <StatItem icon={<MessageSquare className="h-3.5 w-3.5" />} title="评论" enabled={g.comment.enabled} range={g.comment} />
      </div>

      {/* 评论情绪 / 风格 */}
      {g.comment.enabled && (
        <div className="grid grid-cols-1 gap-2 rounded-md border border-dashed bg-muted/20 p-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-[11px] text-muted-foreground">评论情绪</span>
            <span className="truncate text-foreground">{g.comment.sentiment}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-[11px] text-muted-foreground">评论风格</span>
            <span className="truncate text-foreground">{g.comment.style}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <SectionCard
        title="兴趣偏好"
        action={
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
        }
      >
        <p className="mb-3 rounded-md bg-muted/40 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          兴趣画像与互动策略将用于养号任务的内容浏览、点赞、关注、评论等选材，共配置 {groups.length} 组偏好。点击右上角「编辑」可调整偏好设置。
        </p>
        <div className="space-y-3">{groups.map(renderGroup)}</div>
      </SectionCard>
      <InterestPreferenceDialog
        account={editing ? account : null}
        onOpenChange={(o) => !o && setEditing(false)}
      />
    </>
  );
}




/* MirrorInstanceCard 已并入 BindingCard 详情面板 */


/* ============================================================ */
/* 凭据与指纹 Tab                                               */
/* ============================================================ */
function CredentialCard({ account, derived }: { account: ManagedAccount; derived: DerivedDetail }) {
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const cred = derived.credential;
  const statusOk = account.accountStatus !== "fail";

  const rows: KvRow[] = [
    {
      label: "凭据状态",
      value: statusOk ? (
        <Badge variant="outline" className="rounded-full bg-success/10 text-success border-success/30">有效</Badge>
      ) : (
        <Badge variant="outline" className="rounded-full bg-destructive/10 text-destructive border-destructive/30">失效</Badge>
      ),
    },
    { label: "最近刷新时间", value: cred.refreshedAt },
    { label: "最近登录时间", value: cred.lastLoginAt ?? "—" },
    { label: "最近失败时间", value: statusOk ? "—" : cred.lastFailAt },
    { label: "失败原因", value: statusOk ? "—" : cred.failReason, span: 2 },
  ];

  return (
    <SectionCard title="凭据状态">
      <KvGrid rows={rows} />
      <Separator className="my-4" />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setRevealed((v) => !v)}>
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealed ? "隐藏凭据明文" : "查看凭据明文"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <KeyRound className="h-3.5 w-3.5" />
          修改凭据
        </Button>
        {revealed && (
          <span className="ml-2 text-xs text-warning">凭据明文查看中，请勿泄露</span>
        )}
      </div>

      {revealed && (
        <div className="mt-4">
          <KvGrid
            rows={[
              { label: "登录用户名", value: <Mono>{account.platformId}</Mono> },
              {
                label: "登录密码",
                value: (
                  <span className="flex items-center gap-2">
                    <Mono>{cred.password}</Mono>
                    <CopyBtn text={cred.password} />
                  </span>
                ),
              },
              {
                label: "Cookie",
                value: (
                  <pre className="max-h-40 overflow-auto rounded-md border bg-muted/50 p-3 text-[11px] leading-relaxed text-foreground/80">
{cred.cookie}
                  </pre>
                ),
                span: 2,
              },
              { label: "2FA密钥", value: <Mono>{cred.totp}</Mono> },
              ...(cred.pinCode
                ? [{
                    label: "PIN码",
                    value: (
                      <span className="flex items-center gap-2">
                        <Mono>{cred.pinCode}</Mono>
                        <CopyBtn text={cred.pinCode} />
                      </span>
                    ),
                  } as KvRow]
                : []),
              { label: "恢复手机号", value: cred.recoveryPhone ?? "—" },
              { label: "恢复邮箱", value: cred.recoveryEmail ?? "—" },
              {
                label: "邮箱密码",
                value: cred.emailPassword ? (
                  <span className="flex items-center gap-2">
                    <Mono>{cred.emailPassword}</Mono>
                    <CopyBtn text={cred.emailPassword} />
                  </span>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </div>
      )}

      <EditCredentialDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        loginName={account.platformId}
        initial={cred}
      />
    </SectionCard>
  );
}

function EditCredentialDialog({
  open,
  onOpenChange,
  loginName,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loginName: string;
  initial: DerivedDetail["credential"];
}) {
  const hasPin = initial.pinCode !== undefined;
  const [form, setForm] = useState(() => ({
    password: initial.password,
    cookie: initial.cookie,
    totp: initial.totp,
    pinCode: initial.pinCode ?? "",
    recoveryEmail: initial.recoveryEmail ?? "",
    emailPassword: initial.emailPassword ?? "",
    recoveryPhone: initial.recoveryPhone ?? "",
  }));
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset form when reopened
  const reset = () =>
    setForm({
      password: initial.password,
      cookie: initial.cookie,
      totp: initial.totp,
      pinCode: initial.pinCode ?? "",
      recoveryEmail: initial.recoveryEmail ?? "",
      emailPassword: initial.emailPassword ?? "",
      recoveryPhone: initial.recoveryPhone ?? "",
    });

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onConfirmSave = () => {
    setConfirmOpen(false);
    onOpenChange(false);
    toast.success("凭据已更新（mock）");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              修改凭据
            </DialogTitle>
            <DialogDescription>
              登录用户名不可修改；其他项保存后旧凭据立即失效，请谨慎操作。
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">登录用户名</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <Mono>{loginName}</Mono>
                <span className="ml-auto text-[11px]">不可修改</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cred-pwd">登录密码</Label>
                <Input
                  id="cred-pwd"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cred-totp">2FA 密钥</Label>
                <Input
                  id="cred-totp"
                  value={form.totp}
                  onChange={(e) => update("totp", e.target.value)}
                />
              </div>
            </div>



            {hasPin && (
              <div className="grid gap-2">
                <Label htmlFor="cred-pin">
                  <span className="mr-1 text-destructive">*</span>PIN 码
                </Label>
                <Input
                  id="cred-pin"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="请输入 6 位数字 PIN 码"
                  value={form.pinCode}
                  onChange={(e) =>
                    update("pinCode", e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Facebook 账号专用，需为 6 位数字
                </p>
              </div>
            )}


            <div className="grid gap-2">
              <Label htmlFor="cred-cookie">Cookie</Label>
              <Textarea
                id="cred-cookie"
                value={form.cookie}
                onChange={(e) => update("cookie", e.target.value)}
                className="min-h-[140px] font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cred-email">恢复邮箱</Label>
                <Input
                  id="cred-email"
                  type="email"
                  placeholder="可选"
                  value={form.recoveryEmail}
                  onChange={(e) => update("recoveryEmail", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cred-phone">恢复手机号</Label>
                <Input
                  id="cred-phone"
                  placeholder="可选"
                  value={form.recoveryPhone}
                  onChange={(e) => update("recoveryPhone", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cred-email-pwd">邮箱密码</Label>
              <Input
                id="cred-email-pwd"
                placeholder="可选，恢复邮箱对应的登录密码"
                value={form.emailPassword}
                onChange={(e) => update("emailPassword", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button onClick={() => setConfirmOpen(true)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存凭据修改？</AlertDialogTitle>
            <AlertDialogDescription>
              保存后旧凭据立即失效，正在执行的任务可能因此中断或需要重新登录。请确认修改内容无误后再继续。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>再检查一下</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmSave}>确认保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ============================================================ */
/* 资源绑定 Tab                                                 */
/* ============================================================ */
type BindingKey = "mirror" | "device" | "proxy";

function BindingCard({ derived }: { derived: DerivedDetail }) {
  const h = derived.hash;
  const deviceBound = !!derived.mirror.cloudVm;
  const items: {
    key: BindingKey;
    icon: typeof Server;
    title: string;
    name: string;
    meta: string;
    to: "/resources/images" | "/resources/devices" | "/resources/ips";
    bound: boolean;
  }[] = [
    {
      key: "mirror",
      icon: Server,
      title: "镜像实例",
      name: derived.mirror.instanceName,
      meta: derived.mirror.instanceId,
      to: "/resources/images",
      bound: true,
    },
    {
      key: "device",
      icon: Smartphone,
      title: "云机 / 设备",
      name: derived.mirror.cloudVm ?? "未绑定",
      meta: deviceBound ? derived.deviceId : "—",
      to: "/resources/devices",
      bound: deviceBound,
    },
    {
      key: "proxy",
      icon: Globe,
      title: "代理 IP",
      name: derived.proxyIp,
      meta: `${derived.mirror.geoCountry} / ${derived.mirror.geoRegion}`,
      to: "/resources/ips",
      bound: true,
    },
  ];

  const [selected, setSelected] = useState<BindingKey>("mirror");
  const current = items.find((it) => it.key === selected)!;

  return (
    <SectionCard title="已绑定资源">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const active = it.key === selected;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => setSelected(it.key)}
              className={cn(
                "group flex items-center gap-3 rounded-lg border bg-background p-4 text-left transition-colors",
                active
                  ? "border-primary/60 bg-primary/5 shadow-[var(--shadow-card)]"
                  : "hover:border-primary/40 hover:bg-primary/5",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                )}
              >
                <it.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{it.title}</span>
                  {!it.bound && (
                    <Badge
                      variant="outline"
                      className="h-4 rounded-full border-border bg-muted px-1.5 text-[10px] text-muted-foreground"
                    >
                      未绑定
                    </Badge>
                  )}
                </div>
                <div
                  className={cn(
                    "truncate text-sm font-medium",
                    it.bound ? "text-foreground" : "text-muted-foreground",
                  )}
                  title={it.name}
                >
                  {it.name}
                </div>
                <div className="truncate text-[11px] text-muted-foreground" title={it.meta}>
                  {it.meta}
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-opacity",
                  active
                    ? "text-primary opacity-100"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-lg border bg-background/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <current.icon className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">{current.title}详情</h4>
          </div>
          {current.bound && (
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-primary">
              <Link to={current.to}>
                前往资源页
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {!current.bound ? (
          <EmptyState icon={current.icon} text="该资源暂未绑定，绑定后将展示详细信息" />
        ) : selected === "mirror" ? (
          <MirrorDetailRows derived={derived} />
        ) : selected === "device" ? (
          <DeviceDetailRows derived={derived} h={h} />
        ) : (
          <ProxyDetailRows derived={derived} h={h} />
        )}
      </div>
    </SectionCard>
  );
}

function MirrorDetailRows({ derived }: { derived: DerivedDetail }) {
  const rows: KvRow[] = [
    { label: "镜像实例ID", value: <Mono>{derived.mirror.instanceId}</Mono> },
    { label: "镜像实例名称", value: derived.mirror.instanceName },
    { label: "服务节点业务ID", value: <Mono>{derived.mirror.nodeIp}</Mono> },
    { label: "服务节点名称", value: derived.mirror.nodeName },
    { label: "当前代理IP", value: <Mono>{derived.proxyIp}</Mono> },
    { label: "当前代理出口IP", value: <Mono>{derived.proxyIp}</Mono> },
    { label: "当前代理端口", value: <Mono>{derived.mirror.proxyPort}</Mono> },
    { label: "当前代理协议", value: derived.mirror.proxyProto },
    { label: "代理IP国家/地区", value: derived.mirror.geoCountry },
    { label: "代理IP区域", value: derived.mirror.geoRegion },
    { label: "当前云机名称", value: derived.mirror.cloudVm ?? "—" },
    {
      label: "镜像代理摘要",
      value: (
        <span className="text-xs text-muted-foreground">
          {derived.mirror.proxyProto} {derived.proxyIp}:{derived.mirror.proxyPort}；
          出口IP {derived.proxyIp}；{derived.mirror.geoCountry} / {derived.mirror.geoRegion}
        </span>
      ),
      span: 2,
    },
    {
      label: "指纹信息",
      value: (
        <pre className="max-h-72 overflow-auto rounded-md border bg-muted/50 p-3 text-[11px] leading-relaxed text-foreground/80">
{derived.fingerprintJson}
        </pre>
      ),
      span: 2,
    },
  ];
  return <KvGrid rows={rows} />;
}

function DeviceDetailRows({ derived, h }: { derived: DerivedDetail; h: number }) {
  const vm = derived.mirror.cloudVm ?? "—";
  const os = ["Windows 11 Pro", "Windows 10 LTSC", "Android 13", "Ubuntu 22.04"][h % 4];
  const spec = ["4C / 8G / 80G", "2C / 4G / 40G", "8C / 16G / 120G"][h % 3];
  const rows: KvRow[] = [
    { label: "设备名称", value: vm },
    { label: "设备ID", value: <Mono>{derived.deviceId}</Mono> },
    { label: "设备类型", value: h % 2 === 0 ? "云机" : "Windows虚拟机" },
    { label: "系统/镜像", value: os },
    { label: "规格", value: spec },
    { label: "归属节点", value: derived.mirror.nodeName },
    { label: "节点业务IP", value: <Mono>{derived.mirror.nodeIp}</Mono> },
    {
      label: "运行状态",
      value: (
        <Badge variant="outline" className="rounded-full bg-success/10 text-success border-success/30">
          运行中
        </Badge>
      ),
    },
    { label: "最近活跃", value: derived.lastSyncAt },
    { label: "绑定时间", value: derived.lastSyncAt },
  ];
  return <KvGrid rows={rows} />;
}

function ProxyDetailRows({ derived, h }: { derived: DerivedDetail; h: number }) {
  const carriers = ["Cloudflare", "AT&T", "NTT Communications", "Singtel", "Telkomsel", "China Telecom"];
  const latency = 40 + (h % 160);
  const rows: KvRow[] = [
    { label: "代理IP", value: <Mono>{derived.proxyIp}</Mono> },
    { label: "出口IP", value: <Mono>{derived.proxyIp}</Mono> },
    { label: "端口", value: <Mono>{derived.mirror.proxyPort}</Mono> },
    { label: "协议", value: derived.mirror.proxyProto },
    { label: "国家/地区", value: derived.mirror.geoCountry },
    { label: "城市/区域", value: derived.mirror.geoRegion },
    { label: "运营商", value: carriers[h % carriers.length] },
    { label: "类型", value: h % 2 === 0 ? "住宅代理" : "数据中心代理" },
    {
      label: "连接状态",
      value: (
        <Badge variant="outline" className="rounded-full bg-success/10 text-success border-success/30">
          连通
        </Badge>
      ),
    },
    { label: "平均延迟", value: `${latency} ms` },
    { label: "最近检测", value: derived.lastSyncAt },
    { label: "绑定时间", value: derived.lastSyncAt },
  ];
  return <KvGrid rows={rows} />;
}



/* ============================================================ */
/* 标签 Tab                                                     */
/* ============================================================ */
function TagsCard({ account }: { account: ManagedAccount }) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState<string[]>(account.tags);
  const [draft, setDraft] = useState<string[]>(account.tags);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startEdit = () => {
    setDraft(tags);
    setEditing(true);
  };
  const cancel = () => {
    setDraft(tags);
    setEditing(false);
  };
  const onConfirm = () => {
    setTags(draft);
    setConfirmOpen(false);
    setEditing(false);
    toast.success("账号标签已更新（mock）");
  };

  return (
    <SectionCard
      title="账号标签"
      action={
        editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cancel}>取消</Button>
            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              确定
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
        )
      }
    >
      {editing ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">选择或创建标签</Label>
          <TagMultiSelect value={draft} onChange={setDraft} />
        </div>
      ) : tags.length === 0 ? (
        <EmptyState icon={TagIcon} text="暂无标签，点击右上角“编辑”添加" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const meta = findTagByName(t);
            return (
              <Badge
                key={t}
                variant="outline"
                className="rounded-full bg-primary/5 text-primary border-primary/20"
                style={meta?.color ? { backgroundColor: `${meta.color}1a`, color: meta.color, borderColor: `${meta.color}55` } : undefined}
              >
                <TagIcon className="mr-1 h-3 w-3" />
                {t}
              </Badge>
            );
          })}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存标签修改？</AlertDialogTitle>
            <AlertDialogDescription>
              保存后将立即更新该账号的标签，请确认无误。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>确认保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}


function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-8 w-8 opacity-60" />
      </div>
      <span className="text-xs">{text}</span>
    </div>
  );
}

/* ============================================================ */
/* 通用排版工具                                                 */
/* ============================================================ */
function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

type KvRow = { label: string; value: React.ReactNode; span?: 1 | 2 };
function KvGrid({ rows }: { rows: KvRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-3 border-b border-dashed border-border/60 py-2.5 last:border-b-0",
            r.span === 2 && "md:col-span-2",
          )}
        >
          <span className="w-28 shrink-0 text-xs text-muted-foreground">{r.label}</span>
          <div className="min-w-0 flex-1 text-sm text-foreground break-all">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[13px] tabular-nums text-foreground", className)}>
      {children}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[11px] text-primary hover:bg-primary/10"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => null);
        toast.success("已复制");
      }}
    >
      <Copy className="h-3 w-3" />
      复制
    </button>
  );
}

/* ============================================================ */
/* Mock 派生数据                                                */
/* ============================================================ */
interface DerivedDetail {
  hash: number;
  views: number;

  dms: number;
  comments: number;
  proxyIp: string;
  password: string;
  deviceId: string;
  lastSyncAt: string;
  activeTime: string;
  actionEnabled: boolean;
  actions: { label: string; enabled: boolean }[];

  mirror: {
    instanceId: string;
    instanceName: string;
    nodeIp: string;
    nodeName: string;
    proxyPort: number;
    proxyProto: string;
    geoCountry: string;
    geoRegion: string;
    cloudVm?: string;
  };
  fingerprintJson: string;
  credential: {
    refreshedAt: string;
    lastLoginAt?: string;
    lastFailAt: string;
    failReason: string;
    password: string;
    cookie: string;
    totp: string;
    pinCode?: string;
    recoveryEmail?: string;
    emailPassword?: string;
    recoveryPhone?: string;
    fpVersion: string;
    fpId: string;
  };
}

function hashId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const REGION_MAP: Record<string, { code: string; region: string; ip: string }> = {
  美国: { code: "US", region: "New York", ip: "23.95.228.6" },
  日本: { code: "JP", region: "Tokyo", ip: "45.32.100.12" },
  新加坡: { code: "SG", region: "Singapore", ip: "139.180.140.5" },
  印度尼西亚: { code: "ID", region: "Jakarta", ip: "182.16.77.10" },
  中国: { code: "CN", region: "Shanghai", ip: "175.45.20.88" },
  马来西亚: { code: "MY", region: "Kuala Lumpur", ip: "203.106.12.5" },
};

function deriveAccountDetail(a: ManagedAccount): DerivedDetail {
  const h = hashId(a.id);
  const region = REGION_MAP[a.country] ?? REGION_MAP["美国"];
  const proxyIp = region.ip;
  const port = 6000 + (h % 1000);
  const mirrorName = `${a.platform.toLowerCase().replace(/[/]/g, "-")}-test-${String((h % 90) + 10).padStart(3, "0")}`;
  const fpJson = `{
  "--enable-test": "1",
  "--fp-useragent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  "--fp-language": "en-US",
  "--fp-lang": "en-US",
  "--fp-timezone": "America/${region.region.replace(/ /g, "_")}",
  "--fp-resolution": "1920*1080",
  "--fp-os-version": "win11",
  "--fp-chrome-version": "146.0.0.0",
  "--fp-firefox-version": "",
  "--fp-geolocation": "ask",
  "--fp-lat": "0.0",
  "--fp-lng": "0.0"
}`;
  return {
    hash: h,
    views: a.likes * 6 + (h % 12000),

    dms: (a.pending?.msg ?? 0) + (h % 240),
    comments: Math.round(a.followers / 80) + (h % 60),
    proxyIp,
    password: `Boo${(h % 10000).toString(36)}@${h % 100}`,
    deviceId: `2066448615153672${String(100 + (h % 900))}`,
    lastSyncAt: a.createdAt,
    activeTime: h % 4 === 0 ? "全天" : `${String(8 + (h % 4)).padStart(2, "0")}:00-${String(20 + (h % 3)).padStart(2, "0")}:00`,
    actionEnabled: a.accountStatus !== "disabled" && a.accountStatus !== "fail",
    actions: [
      { label: "培育任务", enabled: a.accountStatus !== "disabled" && a.accountStatus !== "fail" },
      { label: "发帖任务", enabled: a.accountStatus !== "disabled" && a.accountStatus !== "fail" && h % 5 !== 0 },
    ],

    mirror: {
      instanceId: `2066705322978${String(800000 + (h % 99999))}`,
      instanceName: mirrorName,
      nodeIp: "172.30.11.173",
      nodeName: "boo-node-shenzhen-01",
      proxyPort: port,
      proxyProto: "SOCKS5",
      geoCountry: region.code,
      geoRegion: region.region,
      cloudVm: h % 3 === 0 ? undefined : `cloud-vm-${(h % 50) + 1}`,
    },
    fingerprintJson: fpJson,
    credential: {
      refreshedAt: a.createdAt,
      lastLoginAt: a.accountStatus === "fail" ? undefined : a.createdAt,
      lastFailAt: a.createdAt,
      failReason: "登录态过期，需重新验证",
      password: `Boo${(h % 10000).toString(36)}@${h % 100}`,
      cookie: `[{"name":"datr","value":"aLwnatjm1A77w_XyY5jyyCr7","domain":".${a.platform.toLowerCase()}.com","path":"/","expires":-1,"httpOnly":false,"secure":false,"sameSite":"Lax"},
 {"name":"locale","value":"en_US","domain":".${a.platform.toLowerCase()}.com","path":"/","expires":-1,"httpOnly":false,"secure":false,"sameSite":"Lax"}]`,
      totp: `JDDQTMFLHFIXSI3VMYBT266CYHJ${(h % 9000) + 1000}`,
      pinCode: a.platform === "Facebook" ? (a.pinCode ?? String(100000 + (h % 900000))) : undefined,
      recoveryEmail: h % 2 === 0 ? `${a.platformId}@protonmail.com` : undefined,
      emailPassword: h % 2 === 0 ? `Mail${(h % 10000).toString(36)}#${h % 100}` : undefined,
      recoveryPhone: h % 3 === 0 ? `+1 415 ${String(1000000 + (h % 8999999)).slice(0, 7)}` : undefined,
      fpVersion: `v1.${(h % 12) + 1}.${h % 20}`,
      fpId: `fp-${a.platform.toLowerCase()}-${a.platformId}`,
    },
  };
}

/* ============================================================ */
/* 平台预览 (保留原实现)                                        */
/* ============================================================ */

function PlatformPreview({ account }: { account: ManagedAccount }) {
  switch (account.platform) {
    case "Facebook":
      return <FacebookPreview account={account} />;
    case "Tiktok":
      return <TiktokPreview account={account} />;
    case "Instagram":
      return <InstagramPreview account={account} />;
    case "Twitter/X":
      return <TwitterPreview account={account} />;
    case "WhatsApp":
      return <WhatsAppPreview account={account} />;
  }
}

function PlatformIcon({ platform }: { platform: Platform }) {
  const meta: Record<Platform, { bg: string; text: string; letter: string }> = {
    Facebook: { bg: "bg-blue-600", text: "text-white", letter: "f" },
    Tiktok: { bg: "bg-foreground", text: "text-background", letter: "♪" },
    Instagram: {
      bg: "bg-gradient-to-br from-pink-500 to-yellow-400",
      text: "text-white",
      letter: "◉",
    },
    "Twitter/X": { bg: "bg-foreground", text: "text-background", letter: "𝕏" },
    WhatsApp: { bg: "bg-emerald-500", text: "text-white", letter: "✆" },
  };
  const m = meta[platform];
  return (
    <span
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
        m.bg,
        m.text,
      )}
    >
      {m.letter}
    </span>
  );
}

function FacebookPreview({ account }: { account: ManagedAccount }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <div className="h-48 bg-gradient-to-r from-blue-500 to-blue-700" />
      <div className="relative px-6 pb-4">
        <div className="-mt-16 flex items-end gap-4">
          <Avatar className="h-32 w-32 ring-4 ring-card">
            <AvatarImage src={account.avatar} />
            <AvatarFallback>{account.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-2">
            <h2 className="text-2xl font-bold">{account.username}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {account.followers.toLocaleString()} 好友 · {account.likes.toLocaleString()} 关注者
            </p>
            <div className="mt-2 flex -space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="h-6 w-6 rounded-full bg-muted ring-2 ring-card" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-6 border-b text-sm font-medium">
          {["动态", "关于", "好友", "照片", "视频", "更多"].map((t, i) => (
            <button
              key={t}
              className={cn(
                "px-1 py-3",
                i === 0 ? "border-b-2 border-primary text-primary" : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 px-6 pb-6 md:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-background p-4">
            <h3 className="text-base font-semibold">简介</h3>
            <p className="mt-2 text-sm">{account.remark === "--" ? "暂无简介" : account.remark}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> 居住于 {account.accountCountry}
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> 加入于 {account.createdAt.slice(0, 10)}
              </li>
              <li className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> facebook.com/{account.platformId}
              </li>
            </ul>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">照片</h3>
              <a className="text-xs text-primary">查看全部</a>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={account.avatar} />
                  <AvatarFallback>{account.username.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">{account.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {i === 0 ? "2 小时前" : "昨天"} · 🌐
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm">
                {i === 0 ? "今天天气真好，分享几张照片 ☀️" : "最近忙到飞起，希望大家都好。"}
              </p>
              <div className="mt-3 h-48 rounded-md bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900/40 dark:to-blue-900/40" />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>👍 ❤️ 1.{i + 3}K</span>
                <span>{27 + i * 7} 评论 · {6 + i} 转发</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TiktokPreview({ account }: { account: ManagedAccount }) {
  return (
    <div className="rounded-xl border bg-card p-8 shadow-[var(--shadow-card)]">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-8">
        <Avatar className="h-32 w-32 ring-4 ring-background">
          <AvatarImage src={account.avatar} />
          <AvatarFallback>{account.username.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <h2 className="text-2xl font-bold">{account.username}</h2>
          <p className="text-sm text-muted-foreground">{account.username}</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm sm:justify-start">
            <span><b>{(account.following / 1000).toFixed(1)}K</b> <span className="text-muted-foreground">正在关注</span></span>
            <span><b>{(account.followers / 1000).toFixed(1)}K</b> <span className="text-muted-foreground">粉丝</span></span>
            <span><b>{(account.likes / 1000).toFixed(1)}K</b> <span className="text-muted-foreground">获赞</span></span>
          </div>
          <p className="text-sm">{account.remark === "--" ? "记录生活的美好时刻 ✨" : account.remark}</p>
        </div>
      </div>
      <div className="mt-8 flex justify-center gap-12 border-b text-sm font-medium">
        {["视频", "收藏", "喜欢"].map((t, i) => (
          <button key={t} className={cn("px-3 py-3", i === 0 ? "border-b-2 border-foreground" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "relative aspect-[3/4] overflow-hidden rounded-md",
              i % 3 === 0 ? "bg-gradient-to-br from-rose-400 to-rose-700"
                : i % 3 === 1 ? "bg-gradient-to-br from-cyan-400 to-cyan-700"
                : "bg-gradient-to-br from-amber-400 to-amber-700",
            )}
          >
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white">
              <Play className="h-3 w-3 fill-current" /> {(283 + i * 12)}K
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InstagramPreview({ account }: { account: ManagedAccount }) {
  const handle = account.username.startsWith("@")
    ? account.username
    : `@${account.username.toLowerCase().replace(/\s+/g, ".")}`;
  return (
    <div className="rounded-xl border bg-card p-8 shadow-[var(--shadow-card)]">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
        <div className="rounded-full bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-400 p-1">
          <Avatar className="h-32 w-32 ring-2 ring-background">
            <AvatarImage src={account.avatar} />
            <AvatarFallback>{account.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 space-y-3">
          <h2 className="text-xl font-light">{handle}</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <span><b>{(account.likes / 1000).toFixed(0)}</b> 帖子</span>
            <span><b>{(account.followers / 1000).toFixed(1)}K</b> 粉丝</span>
            <span><b>{(account.following / 1000).toFixed(1)}K</b> 正在关注</span>
          </div>
          <div className="text-sm">
            <p className="font-semibold">{account.username}</p>
            <p>{account.remark === "--" ? "记录每一帧美好 📸" : account.remark}</p>
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {account.accountCountry}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-center gap-12 border-b text-xs font-medium">
        {["⊞ 帖子", "▷ 视频", "✦ 已标记"].map((t, i) => (
          <button key={t} className={cn("px-3 py-3", i === 0 ? "border-b-2 border-foreground" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={cn("aspect-square", i % 3 === 0 ? "bg-pink-400" : i % 3 === 1 ? "bg-amber-400" : "bg-indigo-400")} />
        ))}
      </div>
    </div>
  );
}

function TwitterPreview({ account }: { account: ManagedAccount }) {
  const handle = account.username.startsWith("@")
    ? account.username
    : `@${account.username.toLowerCase().replace(/\s+/g, "_")}`;
  return (
    <div className="overflow-hidden rounded-xl border bg-black text-white shadow-[var(--shadow-card)]">
      <div className="h-44 bg-gradient-to-r from-zinc-700 to-zinc-900" />
      <div className="relative px-6 pb-4">
        <div className="-mt-14 flex items-end gap-4">
          <Avatar className="h-28 w-28 ring-4 ring-black">
            <AvatarImage src={account.avatar} />
            <AvatarFallback>{account.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="mt-3">
          <h2 className="text-xl font-bold">{handle}</h2>
          <p className="text-sm text-zinc-400">{handle}</p>
          <p className="mt-2 text-sm">{account.remark === "--" ? "Just here for the vibes." : account.remark}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {account.accountCountry}</span>
            <span className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /><span className="text-sky-400">x.com/{account.platformId}</span></span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> 加入于 {account.createdAt.slice(0, 10)}</span>
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <span><b>{(account.following / 1000).toFixed(1)}K</b> <span className="text-zinc-400">正在关注</span></span>
            <span><b>{(account.followers / 1000).toFixed(1)}K</b> <span className="text-zinc-400">关注者</span></span>
          </div>
        </div>
        <div className="mt-4 flex justify-around border-b border-zinc-800 text-sm font-medium">
          {["帖子", "回复", "亮点", "媒体", "喜欢"].map((t, i) => (
            <button key={t} className={cn("px-3 py-3", i === 0 ? "border-b-2 border-sky-500" : "text-zinc-400")}>
              {t}
            </button>
          ))}
        </div>
        <div className="divide-y divide-zinc-800">
          {[
            { time: "1h", text: "刚刚发布了新版本 🚀 期待大家的反馈！", c: 12, r: 30, l: 120, v: "2K" },
            { time: "2h", text: "今天阳光不错，出门走走 ☀️", c: 16, r: 41, l: 170, v: "2.8K" },
            { time: "3h", text: "推荐一本最近在读的书：《思考，快与慢》", c: 20, r: 52, l: 220, v: "3.6K" },
          ].map((t, i) => (
            <div key={i} className="flex gap-3 py-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={account.avatar} />
                <AvatarFallback>{account.username.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm"><b>{handle}</b> <span className="text-zinc-400">{handle} · {t.time}</span></div>
                <p className="mt-1 text-sm">{t.text}</p>
                <div className="mt-3 flex justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {t.c}</span>
                  <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" /> {t.r}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {t.l}</span>
                  <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {t.v}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsAppPreview({ account }: { account: ManagedAccount }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-[#0b1419] text-zinc-100 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
        <ArrowLeft className="h-5 w-5 text-emerald-400" />
        <span className="text-emerald-400">联系人信息</span>
      </div>
      <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
        <Avatar className="h-32 w-32 ring-4 ring-zinc-800">
          <AvatarImage src={account.avatar} />
          <AvatarFallback>{account.username.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-semibold">{account.username}</h2>
        <p className="text-sm text-zinc-400">+{account.platformId}</p>
        <p className="text-xs text-zinc-500">最后上线时间：今天 14:23</p>
      </div>
      <div className="space-y-px bg-zinc-900/40">
        <div className="px-6 py-3">
          <div className="text-xs text-emerald-400">关于</div>
          <div className="mt-1 text-sm">{account.remark === "--" ? `${account.username}线上` : account.remark}</div>
        </div>
        <div className="px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <span>媒体、链接和文件</span>
            <span className="text-xs text-zinc-500">478 ›</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-zinc-800" />
            ))}
          </div>
        </div>
        {[
          { icon: Bell, label: "消息通知" },
          { icon: ImageIcon, label: "媒体可见性" },
          { icon: Lock, label: "加密" },
          { icon: Clock, label: "消息保留时间", right: "关闭" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between px-6 py-3 text-sm">
            <div className="flex items-center gap-3">
              <row.icon className="h-4 w-4 text-emerald-400" />
              <span>{row.label}</span>
            </div>
            {row.right && <span className="text-xs text-zinc-500">{row.right}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

void Globe;
void PlatformIcon;
void ShieldCheck;
