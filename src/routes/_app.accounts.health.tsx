import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarIcon,
  CheckCircle2,
  Clock,
  Download,
  Power,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users2,
  XCircle,
  History,
  RotateCcw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { useTenantScope } from "@/lib/tenant-scope";
import {
  ACCOUNT_STATUS_META,
  PLATFORMS,
  PLATFORM_META,
  type AccountStatus,
  type Platform,
} from "@/lib/managed-account-mock";
import {
  HANDLE_METHODS,
  HANDLE_RESULTS,
  HANDLE_STATE_CLS,
  HANDLE_STATE_LABEL,
  MARK_SOURCE_LABEL,
  PLATFORM_STATUS_MAP,
  RANGE_LABEL,
  STATUS_COLOR,
  STATUS_EXPLAIN,
  STATUS_ORDER,
  buildTrend,
  daysOfRange,
  healthActions,
  recommendMethods,
  useAccountHealth,
  type AccountHealthRecord,
  type HandleMethod,
  type HandleResult,
  type HandleState,
  type TrendRange,
} from "@/lib/account-health-mock";

export const Route = createFileRoute("/_app/accounts/health")({
  component: AccountHealthPage,
  head: () => ({
    meta: [
      { title: "账号健康看板 — BooPilot" },
      {
        name: "description",
        content:
          "监控各社媒平台账号状态分布与变化趋势，跟踪功能受限、风控账号的人工处置进展。",
      },
      { property: "og:title", content: "账号健康看板 — BooPilot" },
      {
        property: "og:description",
        content: "账号状态统计、趋势分析与人工处置台账一体化工作台。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PAGE_SIZE = 10;

function FormItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function AccountHealthPage() {
  const records = useAccountHealth();
  const [scope] = useTenantScope();
  const allowed = getCurrentUser()?.allowedTenantNames;

  const scoped = useMemo(
    () =>
      records.filter(
        (r) =>
          (scope === "all" || r.tenantId === scope) &&
          (!allowed || allowed.includes(r.tenantName)),
      ),
    [records, scope, allowed],
  );

  /* ---- 趋势 ---- */
  const [range, setRange] = useState<TrendRange>("7d");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const days = daysOfRange(
    range,
    from ? format(from, "yyyy-MM-dd") : undefined,
    to ? format(to, "yyyy-MM-dd") : undefined,
  );
  const trend = useMemo(() => buildTrend(scoped, days), [scoped, days]);

  const [platformTab, setPlatformTab] = useState<Platform>("Facebook");
  const platformRecords = useMemo(
    () => scoped.filter((r) => r.platform === platformTab),
    [scoped, platformTab],
  );
  const platformTrend = useMemo(
    () => buildTrend(platformRecords, days, PLATFORMS.indexOf(platformTab) + 1),
    [platformRecords, days, platformTab],
  );

  /* ---- 台账筛选 ---- */
  const [tab, setTab] = useState<"all" | "toConfirm" | "todo" | "doing" | "done">(
    "all",
  );
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [manualFilter, setManualFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(
    () =>
      scoped.filter((r) => {
        if (tab === "toConfirm" && !(r.status === "pending")) return false;
        if (tab === "todo" && !(r.needsManual && r.handleState === "todo"))
          return false;
        if (tab === "doing" && !(r.needsManual && r.handleState === "doing"))
          return false;
        if (tab === "done" && !(r.needsManual && r.handleState === "done"))
          return false;
        if (platformFilter !== "all" && r.platform !== platformFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (sourceFilter !== "all" && r.markSource !== sourceFilter) return false;
        if (manualFilter === "yes" && !r.needsManual) return false;
        if (manualFilter === "no" && r.needsManual) return false;
        const k = keyword.trim().toLowerCase();
        if (
          k &&
          !`${r.username} ${r.platformId} ${r.statusNote}`.toLowerCase().includes(k)
        )
          return false;
        return true;
      }),
    [scoped, tab, platformFilter, statusFilter, sourceFilter, manualFilter, keyword],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const c = (s: AccountStatus) => scoped.filter((r) => r.status === s).length;
    return {
      total: scoped.length,
      pending: c("pending"),
      normal: c("normal"),
      disabled: c("disabled"),
      risk: c("risk"),
      fail: c("fail"),
      todo: scoped.filter((r) => r.needsManual && r.handleState !== "done").length,
    };
  }, [scoped]);

  /* ---- 弹窗 ---- */
  const [confirmRec, setConfirmRec] = useState<AccountHealthRecord | null>(null);
  const [handleRecs, setHandleRecs] = useState<AccountHealthRecord[] | null>(null);
  const [timelineRec, setTimelineRec] = useState<AccountHealthRecord | null>(null);

  const selectedRecs = scoped.filter((r) => selected.includes(r.accountId));

  const handleExport = () => {
    const rows = (selected.length > 0 ? selectedRecs : filtered).map((r) => [
      r.username,
      r.platformId,
      r.platform,
      ACCOUNT_STATUS_META[r.status].label,
      r.platformStatus,
      MARK_SOURCE_LABEL[r.markSource],
      r.statusNote,
      r.needsManual ? "是" : "否",
      HANDLE_STATE_LABEL[r.handleState],
      r.handleMethod ?? "",
      r.handleResult ?? "",
      r.handleNote ?? "",
      r.handler ?? "",
      r.markedAt,
      r.handledAt ?? "",
    ]);
    const header = [
      "账号",
      "平台ID",
      "平台",
      "当前状态",
      "平台侧状态",
      "标记来源",
      "状态说明",
      "需人工处理",
      "处理状态",
      "处理方式",
      "处理结果",
      "处理说明",
      "处理人",
      "标记时间",
      "处理时间",
    ];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `账号健康台账_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${rows.length} 条记录`);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link to="/accounts/managed">
              <ArrowLeft className="h-4 w-4" />
              返回账号列表
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">账号健康看板</h1>
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/10 text-primary"
            >
              <ShieldAlert className="mr-1 h-3 w-3" />
              状态监控
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            汇总各平台账号状态分布与变化趋势；功能受限、风控账号需人工介入，处置过程在下方台账中登记并留痕。
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard title="账号总数" value={stats.total} icon={Users2} tone="primary" />
          <StatCard title="正常" value={stats.normal} icon={CheckCircle2} tone="success" />
          <StatCard title="待确认" value={stats.pending} icon={Clock} tone="warning" />
          <StatCard title="功能受限" value={stats.disabled} icon={Power} tone="warning" />
          <StatCard title="风控" value={stats.risk} icon={AlertTriangle} tone="violet" />
          <StatCard title="账号被封" value={stats.fail} icon={XCircle} tone="destructive" />
          <StatCard title="待人工处理" value={stats.todo} icon={ShieldAlert} tone="destructive" />
        </div>

        {/* 时间范围 */}
        <Card className="p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">趋势时间范围</span>
            <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
              {(["7d", "14d", "30d", "custom"] as TrendRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded px-3 py-1 transition-colors",
                    range === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {RANGE_LABEL[r]}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="flex items-center gap-2">
                <DatePick value={from} onChange={setFrom} placeholder="开始日期" />
                <span className="text-muted-foreground">至</span>
                <DatePick value={to} onChange={setTo} placeholder="结束日期" />
                <span className="text-xs text-muted-foreground">共 {days} 天</span>
              </div>
            )}
          </div>
        </Card>

        {/* 状态趋势 */}
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">各状态账号数量变化趋势</h2>
            <span className="text-xs text-muted-foreground">
              {RANGE_LABEL[range]} · {days} 天
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                {STATUS_ORDER.map((s) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    name={ACCOUNT_STATUS_META[s].label}
                    stroke={STATUS_COLOR[s]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 平台趋势 */}
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">各平台账号状态变化趋势</h2>
            </div>
            <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformTab(p)}
                  className={cn(
                    "rounded px-3 py-1 transition-colors",
                    platformTab === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                {STATUS_ORDER.map((s) => (
                  <Area
                    key={s}
                    type="monotone"
                    dataKey={s}
                    name={ACCOUNT_STATUS_META[s].label}
                    stackId="1"
                    stroke={STATUS_COLOR[s]}
                    fill={STATUS_COLOR[s]}
                    fillOpacity={0.25}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 平台 × 状态 当期矩阵 */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">平台</th>
                  {STATUS_ORDER.map((s) => (
                    <th key={s} className="px-3 py-2 text-left font-medium">
                      {ACCOUNT_STATUS_META[s].label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium">合计</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((p) => {
                  const rs = scoped.filter((r) => r.platform === p);
                  return (
                    <tr key={p} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                              PLATFORM_META[p].cls,
                            )}
                          >
                            {PLATFORM_META[p].letter}
                          </span>
                          {p}
                        </span>
                      </td>
                      {STATUS_ORDER.map((s) => (
                        <td key={s} className="px-3 py-2 tabular-nums">
                          {rs.filter((r) => r.status === s).length}
                        </td>
                      ))}
                      <td className="px-3 py-2 font-medium tabular-nums">{rs.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 台账 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
              {(
                [
                  ["all", "全部"],
                  ["toConfirm", `待人工确认 ${stats.pending}`],
                  ["todo", "待处理"],
                  ["doing", "处理中"],
                  ["done", "已处理"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setTab(k);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded px-3 py-1 transition-colors",
                    tab === k
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={selected.length === 0}
                onClick={() => setHandleRecs(selectedRecs.filter((r) => r.needsManual))}
              >
                <ShieldCheck className="h-4 w-4" />
                批量标记已处理{selected.length > 0 && ` (${selected.length})`}
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
                导出{selected.length > 0 && ` (${selected.length})`}
              </Button>
            </div>
          </div>

          {/* 筛选 */}
          <div className="grid grid-cols-1 gap-4 border-b p-4 md:grid-cols-3 xl:grid-cols-5">
            <FormItem label="平台">
              <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="当前状态">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ACCOUNT_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="标记来源">
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  <SelectItem value="system">系统标记</SelectItem>
                  <SelectItem value="manual">人工确认</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="是否需人工处理">
              <Select value={manualFilter} onValueChange={(v) => { setManualFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="yes">需人工处理</SelectItem>
                  <SelectItem value="no">无需处理</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="账号">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="账号名 / 平台ID / 说明"
                    value={keyword}
                    onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPlatformFilter("all");
                    setStatusFilter("all");
                    setSourceFilter("all");
                    setManualFilter("all");
                    setKeyword("");
                    setPage(1);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </FormItem>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={pageRows.length > 0 && pageRows.every((r) => selected.includes(r.accountId))}
                      onCheckedChange={(c) =>
                        setSelected(c ? Array.from(new Set([...selected, ...pageRows.map((r) => r.accountId)])) : [])
                      }
                    />
                  </th>
                  {[
                    "账号（平台ID）",
                    "当前状态",
                    "平台侧状态",
                    "标记来源",
                    "状态说明",
                    "需人工处理",
                    "处理状态",
                    "处理方式",
                    "处理结果",
                    "处理人 / 时间",
                    "操作",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const sm = ACCOUNT_STATUS_META[r.status];
                  return (
                    <tr key={r.accountId} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selected.includes(r.accountId)}
                          onCheckedChange={(c) =>
                            setSelected((prev) =>
                              c ? [...prev, r.accountId] : prev.filter((x) => x !== r.accountId),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <img src={r.avatar} alt={r.username} className="h-8 w-8 rounded-full border bg-muted" />
                            <span
                              className={cn(
                                "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold",
                                PLATFORM_META[r.platform].cls,
                              )}
                            >
                              {PLATFORM_META[r.platform].letter}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <Link
                              to="/accounts/managed/$id"
                              params={{ id: r.accountId }}
                              className="block truncate font-medium hover:text-primary"
                            >
                              {r.username}
                            </Link>
                            <span className="text-xs text-muted-foreground">{r.platformId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={cn("rounded-full", sm.cls)}>
                              {sm.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{STATUS_EXPLAIN[r.status]}</TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="max-w-[220px] px-3 py-3 text-xs text-muted-foreground">
                        {r.platformStatus}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full",
                            r.markSource === "manual"
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {MARK_SOURCE_LABEL[r.markSource]}
                        </Badge>
                      </td>
                      <td className="max-w-[220px] px-3 py-3">
                        <span className="line-clamp-2 text-xs">{r.statusNote}</span>
                      </td>
                      <td className="px-3 py-3">
                        {r.needsManual ? (
                          <Badge variant="outline" className="rounded-full bg-destructive/10 text-destructive border-destructive/30">
                            需处理
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.needsManual ? (
                          <Badge variant="outline" className={cn("rounded-full", HANDLE_STATE_CLS[r.handleState])}>
                            {HANDLE_STATE_LABEL[r.handleState]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">{r.handleMethod ?? "-"}</td>
                      <td className="px-3 py-3 text-xs">
                        {r.handleResult ? (
                          <span className="space-y-0.5">
                            <span className="block">{r.handleResult}</span>
                            {r.handleNote && (
                              <span className="block text-muted-foreground">{r.handleNote}</span>
                            )}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        <span className="block">{r.handler ?? "-"}</span>
                        <span className="block">{r.handledAt ?? r.markedAt}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {r.status === "pending" && (
                            <Button size="sm" variant="ghost" className="text-primary" onClick={() => setConfirmRec(r)}>
                              人工确认
                            </Button>
                          )}
                          {r.needsManual && (
                            <Button size="sm" variant="ghost" className="text-primary" onClick={() => setHandleRecs([r])}>
                              登记处理
                            </Button>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setTimelineRec(r)}>
                                <History className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看状态记录</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      暂无符合条件的账号
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} totalPages={totalPages} total={filtered.length} setPage={setPage} />
        </div>
      </div>

      <ConfirmStatusDialog rec={confirmRec} onClose={() => setConfirmRec(null)} />
      <HandleDialog
        recs={handleRecs}
        onClose={(done) => {
          setHandleRecs(null);
          if (done) setSelected([]);
        }}
      />
      <TimelineSheet rec={timelineRec} onClose={() => setTimelineRec(null)} />
    </TooltipProvider>
  );
}

function DatePick({
  value,
  onChange,
  placeholder,
}: {
  value?: Date;
  onChange: (d?: Date) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4" />
          {value ? format(value, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

function ConfirmStatusDialog({
  rec,
  onClose,
}: {
  rec: AccountHealthRecord | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AccountStatus>("normal");
  const [note, setNote] = useState("");
  const who = getCurrentUser()?.displayName ?? "当前用户";
  if (!rec) return null;
  const platformStatus = PLATFORM_STATUS_MAP[status][rec.platform];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>人工确认账号状态</DialogTitle>
          <DialogDescription>
            {rec.username}（{rec.platformId}）· {rec.platform}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormItem label="确认状态 *">
            <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.filter((s) => s !== "pending").map((s) => (
                  <SelectItem key={s} value={s}>{ACCOUNT_STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            平台侧状态：<span className="text-foreground">{platformStatus}</span>
            <br />
            {STATUS_EXPLAIN[status]}
          </div>
          <FormItem label="状态说明 *">
            <Textarea
              rows={3}
              placeholder="如：功能受限-不可发帖"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormItem>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            disabled={!note.trim()}
            onClick={() => {
              healthActions.confirmStatus(rec.accountId, {
                status,
                platformStatus,
                note: note.trim(),
                by: who,
              });
              toast.success("已人工确认账号状态");
              onClose();
            }}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HandleDialog({
  recs,
  onClose,
}: {
  recs: AccountHealthRecord[] | null;
  onClose: (done?: boolean) => void;
}) {
  const [state, setState] = useState<HandleState>("done");
  const [method, setMethod] = useState<HandleMethod>("发起申诉");
  const [result, setResult] = useState<HandleResult>("已恢复");
  const [note, setNote] = useState("");
  const who = getCurrentUser()?.displayName ?? "当前用户";
  if (!recs) return null;
  if (recs.length === 0) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>无可处理账号</DialogTitle>
            <DialogDescription>
              所选账号均无需人工介入（仅「功能受限」「风控」状态需要人工处理）。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onClose()}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  const single = recs.length === 1 ? recs[0] : null;
  const recommended = single ? recommendMethods(single.platform, single.status) : [];
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>登记人工处理</DialogTitle>
          <DialogDescription>
            {single
              ? `${single.username}（${single.platformId}）· ${single.platformStatus}`
              : `共 ${recs.length} 个需人工介入的账号`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {recommended.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              建议恢复方式：
              <span className="text-foreground">{recommended.join(" / ")}</span>
            </div>
          )}
          <FormItem label="处理状态 *">
            <Select value={state} onValueChange={(v) => setState(v as HandleState)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="doing">处理中</SelectItem>
                <SelectItem value="done">已处理</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem label="处理方式 *">
            <Select value={method} onValueChange={(v) => setMethod(v as HandleMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HANDLE_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem label="处理结果 *">
            <Select value={result} onValueChange={(v) => setResult(v as HandleResult)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HANDLE_RESULTS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem label="处理说明">
            <Textarea
              rows={3}
              placeholder="如：已提交身份验证，等待平台审核"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormItem>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>取消</Button>
          <Button
            onClick={() => {
              healthActions.registerHandling(
                recs.map((r) => r.accountId),
                { handleState: state, method, result, note: note.trim(), by: who },
              );
              toast.success(`已登记 ${recs.length} 个账号的处理记录`);
              onClose(true);
            }}
          >
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimelineSheet({
  rec,
  onClose,
}: {
  rec: AccountHealthRecord | null;
  onClose: () => void;
}) {
  if (!rec) return null;
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>状态与处置记录</SheetTitle>
          <SheetDescription>
            {rec.username}（{rec.platformId}）· {rec.platform}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {rec.timeline.map((t, i) => (
            <div key={i} className="relative pl-6">
              <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
              {i < rec.timeline.length - 1 && (
                <span className="absolute left-[3px] top-4 h-full w-px bg-border" />
              )}
              <p className="text-sm">{t.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.at} · {t.by}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
