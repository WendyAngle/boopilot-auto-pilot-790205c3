import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import {
  Plus,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Pencil,
  Trash2,
  Upload,
  Download,
  Eye,
  Users2,
  Building,
  Tag as TagIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Power,
  MonitorSmartphone,
  UserPlus,
  ShieldCheck,
  Clock,
  Sparkles,
  Server,
  Bell,
  MessageSquare,
  CheckCheck,
  RefreshCw,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  ClipboardPaste,
  Camera,
  Minus,
  Lock,
  Home,
  ArrowLeft,
  Monitor,
  Triangle,
  Circle,
  Square as SquareIcon,
  Heart,
  FileText,
  MapPin,
  Copy,
  
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaginationBar } from "@/components/pagination-bar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { findTagByName } from "@/lib/systemTags";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { InterestPreferenceDialog } from "@/components/interest-preference-dialog";
import { useTenantScope } from "@/lib/tenant-scope";
import {
  type Platform,
  type AccountStatus,
  type DeviceType,
  type ManagedAccount,
  PLATFORMS,
  PLATFORM_META,
  ACCOUNT_STATUS_META,
  ACTIVE_TENANTS,
  OPERATORS,
  OPERATOR_RECORDS,
  PERSONAS,
  COUNTRIES,
  seedManagedAccounts,
} from "@/lib/managed-account-mock";




/* ===== 列表派生数据辅助 (与详情页保持一致：基于账号 id 稳定生成) ===== */
// 国家/地区 显示与「资源管理-IP列表」保持一致(格式: "国家代码 / 城市")
const IP_POOL: { ip: string; country: string; accountCountry: string }[] = [
  { ip: "69.12.87.129", country: "US / California", accountCountry: "美国" },
  { ip: "69.12.87.128", country: "JP / Tokyo", accountCountry: "日本" },
  { ip: "103.214.55.42", country: "SG / Singapore", accountCountry: "新加坡" },
  { ip: "182.16.77.10", country: "ID / Jakarta", accountCountry: "印度尼西亚" },
  { ip: "175.45.20.88", country: "CN / Shanghai", accountCountry: "中国" },
  { ip: "203.106.12.5", country: "MY / Kuala Lumpur", accountCountry: "马来西亚" },
];
function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
function getIpForAccount(r: ManagedAccount) {
  const pool = IP_POOL.filter((p) => p.accountCountry === r.country);
  const list = pool.length > 0 ? pool : IP_POOL;
  return list[hashId(r.id) % list.length];
}
function getViewsForAccount(r: ManagedAccount) {
  return r.likes * 6 + (hashId(r.id) % 12000);
}
function getDmsForAccount(r: ManagedAccount) {
  return (r.pending?.msg ?? 0) + (hashId(r.id) % 240);
}
function getCommentsForAccount(r: ManagedAccount) {
  return Math.round(r.followers / 80) + (hashId(r.id) % 60);
}
function formatStat(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const Route = createFileRoute("/_app/accounts/managed/")({

  component: ManagedAccountsPage,
  head: () => ({
    meta: [
      { title: "托管账号 — BooPilot" },
      { name: "description", content: "管理由 BooPilot 托管运营的业务账号。" },
    ],
  }),
});



/* ============================================================ */
/* 主页面                                                       */
/* ============================================================ */

function ManagedAccountsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ManagedAccount[]>(() =>
    seedManagedAccounts(),
  );
  const [tenantScope] = useTenantScope();

  // 筛选
  const [keyword, setKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingFilter, setPendingFilter] = useState("all");
  
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tenantScope !== "all" && r.tenantId !== tenantScope) return false;
      if (platformFilter !== "all" && r.platform !== platformFilter)
        return false;
      if (tenantFilter !== "all" && r.tenantId !== tenantFilter) return false;
      if (statusFilter !== "all" && r.accountStatus !== statusFilter)
        return false;
      if (pendingFilter === "yes" && !r.pending) return false;
      if (pendingFilter === "no" && r.pending) return false;
      if (
        keyword &&
        !r.username.toLowerCase().includes(keyword.toLowerCase()) &&
        !r.platformId.includes(keyword) &&
        !(r.remark ?? "").toLowerCase().includes(keyword.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    rows,
    tenantScope,
    keyword,
    platformFilter,
    tenantFilter,
    statusFilter,
    pendingFilter,
    
  ]);

  // 分页
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // 选择
  const [selected, setSelected] = useState<string[]>([]);
  const allChecked =
    pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allChecked)
      setSelected(selected.filter((id) => !pageRows.some((r) => r.id === id)));
    else setSelected([...new Set([...selected, ...pageRows.map((r) => r.id)])]);
  };

  // 弹窗
  const [editing, setEditing] = useState<ManagedAccount | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ManagedAccount | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  
  const [remoteFor, setRemoteFor] = useState<ManagedAccount | null>(null);
  const [assignTenantOpen, setAssignTenantOpen] = useState(false);
  const [assignOwnerOpen, setAssignOwnerOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activeTimeOpen, setActiveTimeOpen] = useState(false);
  const [actionToggleOpen, setActionToggleOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [mirrorFor, setMirrorFor] = useState<ManagedAccount | null>(null);
  const [assignOne, setAssignOne] = useState<ManagedAccount | null>(null);
  const [interestFor, setInterestFor] = useState<ManagedAccount | null>(null);
  const [loginStatusDialogOpen, setLoginStatusDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // 统计
  const stats = useMemo(
    () => ({
      total: rows.length,
      normal: rows.filter((r) => r.accountStatus === "normal").length,
      pending: rows.filter((r) => r.accountStatus === "pending").length,
      risk: rows.filter((r) => r.accountStatus === "risk").length,
      disabled: rows.filter((r) => r.accountStatus === "disabled").length,
      fail: rows.filter((r) => r.accountStatus === "fail").length,
    }),
    [rows],
  );

  const handleReset = () => {
    setKeyword("");
    setPlatformFilter("all");
    setTenantFilter("all");
    setStatusFilter("all");
    setPendingFilter("all");
    setPage(1);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: ManagedAccount) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleSave = (data: Partial<ManagedAccount>) => {
    if (editing) {
      setRows((prev) =>
        prev.map((x) => (x.id === editing.id ? { ...x, ...data } : x)),
      );
      toast.success("已保存", { description: data.username ?? editing.username });
    } else {
      const t = ACTIVE_TENANTS.find((x) => x.id === data.tenantId);
      const item: ManagedAccount = {
        id: `m-${Date.now()}`,
        platform: "Facebook",
        username: "",
        platformId: "",
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${Date.now()}`,
        remark: "--",
        followers: 0,
        following: 0,
        likes: 0,
        accountStatus: "normal",
        tags: [],
        country: "美国",
        accountCountry: "美国",
        
        tenantId: t?.id ?? "",
        tenantName: t?.name ?? "未分配",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        ...data,
      };
      setRows((prev) => [item, ...prev]);
      toast.success("新增成功", { description: item.username });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setRows((prev) => prev.filter((x) => x.id !== deleting.id));
    toast.success("已删除", { description: deleting.username });
    setDeleting(null);
  };
  const handleBatchDelete = () => {
    setRows((prev) => prev.filter((x) => !selected.includes(x.id)));
    toast.success("批量删除完成", { description: `共 ${selected.length} 个账号` });
    setSelected([]);
    setBatchDeleteOpen(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-w-0 space-y-6">
        {/* 标题 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              账号列表
            </h2>
            <Badge
              variant="outline"
              className="rounded-full bg-violet-500/10 text-violet-600 border-violet-300/40"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              托管
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            团队代为托管运营的业务账号,统一管理设备、负责人、租户及运营任务。
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard title="账号总数" value={stats.total} icon={Users2} tone="primary" />
          <StatCard title="正常" value={stats.normal} icon={CheckCircle2} tone="success" />
          <StatCard title="待确认" value={stats.pending} icon={Clock} tone="warning" />
          <StatCard title="风控" value={stats.risk} icon={AlertTriangle} tone="warning" />
          <StatCard title="禁用" value={stats.disabled} icon={Power} tone="muted" />
          <StatCard title="登录失败" value={stats.fail} icon={XCircle} tone="destructive" />
        </div>

        {/* 筛选 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormItem label="平台">
              <Select
                value={platformFilter}
                onValueChange={(v) => {
                  setPlatformFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="账号">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="账号名 / 平台ID / 备注"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </FormItem>
            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
              <Button onClick={() => setPage(1)}>
                <Search className="h-4 w-4" />
                搜索
              </Button>
              <Button
                variant="ghost"
                className="text-primary"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {expanded ? "收起" : "展开"}
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2 xl:grid-cols-3">
              <FormItem label="账号状态">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {(Object.keys(ACCOUNT_STATUS_META) as AccountStatus[]).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {ACCOUNT_STATUS_META[s].label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
              <FormItem label="待处理事项">
                <Select
                  value={pendingFilter}
                  onValueChange={(v) => {
                    setPendingFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="yes">有待处理</SelectItem>
                    <SelectItem value="no">无待处理</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            </div>
          )}
        </div>

        {/* 工具栏 + 表格 */}
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              新增账号
            </Button>
            <Button
              variant="outline"
              disabled={selected.length === 0}
              onClick={() => setLoginStatusDialogOpen(true)}
            >
              <ShieldCheck className="h-4 w-4" />
              设置账号状态{selected.length > 0 && ` (${selected.length})`}
            </Button>
            {!getCurrentUser()?.allowedTenantNames && (
              <Button
                variant="outline"
                disabled={selected.length === 0}
                onClick={() => setAssignTenantOpen(true)}
              >
                <Building className="h-4 w-4" />
                分配租户{selected.length > 0 && ` (${selected.length})`}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={selected.length === 0}
              onClick={() => setAssignOwnerOpen(true)}
            >
              <Users2 className="h-4 w-4" />
              分配负责人{selected.length > 0 && ` (${selected.length})`}
            </Button>
            <Button
              variant="outline"
              disabled={selected.length === 0}
              onClick={() => setActiveTimeOpen(true)}
            >
              <Clock className="h-4 w-4" />
              设置活跃时间{selected.length > 0 && ` (${selected.length})`}
            </Button>
            <Button
              variant="outline"
              disabled={selected.length === 0}
              onClick={() => setActionToggleOpen(true)}
            >
              <ShieldCheck className="h-4 w-4" />
              禁/启用动作设置{selected.length > 0 && ` (${selected.length})`}
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              批量导入
            </Button>
            <Button
              variant="outline"
              onClick={() => setExportOpen(true)}
            >
              <Download className="h-4 w-4" />
              导出{selected.length > 0 && ` (${selected.length})`}
            </Button>
            <Button
              variant="outline"
              disabled={selected.length === 0}
              onClick={() => setTagsOpen(true)}
            >
              <TagIcon className="h-4 w-4" />
              修改标签{selected.length > 0 && ` (${selected.length})`}
            </Button>
            {selected.length > 0 && (
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setBatchDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                批量删除 ({selected.length})
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex items-center rounded-md border bg-background p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewMode("list")}
                    >
                      <ListIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>列表模式</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "card" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewMode("card")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>卡片模式</TooltipContent>
                </Tooltip>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toast.success("已刷新")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === "list" ? (
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1900px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 pl-4">
                    <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="min-w-[180px] whitespace-nowrap">账号</TableHead>
                  <TableHead className="w-[110px] whitespace-nowrap">账号状态</TableHead>
                  <TableHead className="w-[260px] whitespace-nowrap">待处理事项</TableHead>
                  <TableHead className="w-[160px] whitespace-nowrap">标签</TableHead>
                  <TableHead className="w-[160px] whitespace-nowrap">备注</TableHead>
                  <TableHead className="w-[90px] whitespace-nowrap text-right">粉丝</TableHead>
                  <TableHead className="w-[90px] whitespace-nowrap text-right">关注</TableHead>
                  <TableHead className="w-[90px] whitespace-nowrap text-right">获赞</TableHead>
                  <TableHead className="w-[100px] whitespace-nowrap text-right">播放量</TableHead>
                  <TableHead className="w-[80px] whitespace-nowrap text-right">私信</TableHead>
                  <TableHead className="w-[80px] whitespace-nowrap text-right">评论</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">运营负责人</TableHead>
                  <TableHead className="w-[160px] whitespace-nowrap">所属租户</TableHead>
                  <TableHead className="w-[140px] whitespace-nowrap">账号所属地区</TableHead>
                  <TableHead className="w-[140px] whitespace-nowrap">代理国家/地区</TableHead>
                  <TableHead className="w-[260px] whitespace-nowrap pr-4 text-center">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={17} className="h-32 text-center text-muted-foreground">
                      暂无符合条件的托管账号
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((r) => {
                    const pm = PLATFORM_META[r.platform];
                    const sm = ACCOUNT_STATUS_META[r.accountStatus];
                    const ipInfo = getIpForAccount(r);
                    const views = getViewsForAccount(r);
                    const dms = getDmsForAccount(r);
                    const comments = getCommentsForAccount(r);
                    return (
                      <TableRow key={r.id} className="group">

                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selected.includes(r.id)}
                            onCheckedChange={(c) =>
                              setSelected((prev) =>
                                c
                                  ? [...prev, r.id]
                                  : prev.filter((id) => id !== r.id),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10 ring-1 ring-border">
                                <AvatarImage src={r.avatar} />
                                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                  {r.username.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 cursor-default items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-background",
                                      pm.cls,
                                    )}
                                  >
                                    {pm.letter}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  {r.platform}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="min-w-0">
                              <span className="truncate font-medium text-foreground">
                                {r.username}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn("rounded-full font-medium", sm.cls)}
                          >
                            {sm.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.pending && (r.pending.msg > 0 || r.pending.friend > 0) ? (
                            <div className="flex flex-nowrap items-center gap-1.5">
                              {r.pending.friend > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="relative inline-flex h-6 items-center gap-1 rounded-full bg-muted/60 px-2 text-[11px] text-foreground cursor-default">
                                      <UserPlus className="h-3 w-3" />
                                      <span className="tabular-nums">{r.pending.friend}</span>
                                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-destructive ring-1 ring-background" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {r.pending.friend} 条加好友
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {r.pending.msg > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="relative inline-flex h-6 items-center gap-1 rounded-full bg-muted/60 px-2 text-[11px] text-foreground cursor-default">
                                      <MessageSquare className="h-3 w-3" />
                                      <span className="tabular-nums">{r.pending.msg}</span>
                                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-destructive ring-1 ring-background" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {r.pending.msg} 条私信
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                      setRows((prev) =>
                                        prev.map((x) =>
                                          x.id === r.id
                                            ? { ...x, pending: { msg: 0, friend: 0 } }
                                            : x,
                                        ),
                                      );
                                      toast.success(
                                        `已将「${r.username}」的待处理事项标记为当日已处理`,
                                      );
                                    }}
                                  >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">标记当日已处理</TooltipContent>
                              </Tooltip>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>


                        <TableCell>
                          <TagPillList tags={r.tags} />
                        </TableCell>
                        <TableCell
                          className="max-w-[160px] truncate whitespace-nowrap text-xs text-muted-foreground"
                          title={r.remark}
                        >
                          {r.remark}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-sm text-foreground">
                          {formatStat(r.followers)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-sm text-foreground">
                          {formatStat(r.following)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-sm text-foreground">
                          {formatStat(r.likes)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-sm text-foreground">
                          {formatStat(views)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-sm text-foreground">
                          {formatStat(dms)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-sm text-foreground">
                          {formatStat(comments)}
                        </TableCell>

                        <TableCell>
                          {r.ownerName ? (
                            <span className="text-sm text-foreground">{r.ownerName}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">未分配</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs text-foreground">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            {r.tenantName}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs text-foreground">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {r.accountCountry}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default text-xs text-foreground">
                                {ipInfo.country}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <span className="font-mono text-xs tabular-nums">{ipInfo.ip}</span>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>


                        <TableCell className="pr-4">
                          <div className="flex flex-nowrap items-center justify-end gap-x-2 whitespace-nowrap">
                            <TextActionBtn
                              icon={MonitorSmartphone}
                              label="远程控制"
                              onClick={() => setRemoteFor(r)}
                            />
                            <TextActionBtn
                              icon={Heart}
                              label="设置兴趣偏好"
                              onClick={() => setInterestFor(r)}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                  更多
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate({
                                      to: "/accounts/managed/$id",
                                      params: { id: r.id },
                                    })
                                  }
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  查看
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAssignOne(r)}>
                                  <UserPlus className="h-3.5 w-3.5" />
                                  分配
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setMirrorFor(r)}>
                                  <Server className="h-3.5 w-3.5" />
                                  修改镜像实例
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleting(r)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          ) : (
            <div className="p-4">
              {pageRows.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  暂无符合条件的托管账号
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pageRows.map((r) => (
                    <AccountCard
                      key={r.id}
                      r={r}
                      selected={selected.includes(r.id)}
                      onToggleSelect={(c) =>
                        setSelected((prev) =>
                          c ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                        )
                      }
                      onView={() =>
                        navigate({
                          to: "/accounts/managed/$id",
                          params: { id: r.id },
                        })
                      }
                      onRemote={() => setRemoteFor(r)}
                      onInterest={() => setInterestFor(r)}
                      onAssign={() => setAssignOne(r)}
                      onMirror={() => setMirrorFor(r)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => setDeleting(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            setPage={setPage}
          />
        </div>

        {/* ===== 弹窗 ===== */}
        <EditDialog
          open={formOpen}
          item={editing}
          onOpenChange={(o) => {
            setFormOpen(o);
            if (!o) setEditing(null);
          }}
          onConfirm={handleSave}
        />

        <AlertDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除该托管账号？</AlertDialogTitle>
              <AlertDialogDescription>
                即将删除托管账号 <b className="text-foreground">{deleting?.username}</b>,操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>批量删除托管账号</AlertDialogTitle>
              <AlertDialogDescription>
                即将删除已选的 <b className="text-foreground">{selected.length}</b> 个账号,操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBatchDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SimpleSelectDialog
          open={assignTenantOpen}
          onOpenChange={setAssignTenantOpen}
          title="分配租户"
          description={`将所选 ${selected.length} 个托管账号分配到指定租户。`}
          options={ACTIVE_TENANTS.map((t) => ({ value: t.id, label: t.name }))}
          confirmLabel="分配"
          onConfirm={(v) => {
            const t = ACTIVE_TENANTS.find((x) => x.id === v);
            if (!t) return;
            setRows((prev) =>
              prev.map((x) =>
                selected.includes(x.id)
                  ? { ...x, tenantId: t.id, tenantName: t.name }
                  : x,
              ),
            );
            setAssignTenantOpen(false);
            toast.success("分配成功", {
              description: `${selected.length} 个账号 → ${t.name}`,
            });
            setSelected([]);
          }}
        />

        <SimpleSelectDialog
          open={assignOwnerOpen}
          onOpenChange={setAssignOwnerOpen}
          title="分配负责人"
          description={`将所选 ${selected.length} 个账号分配给指定运营人员。`}
          options={OPERATOR_RECORDS.map((o) => ({ value: o.name, label: `${o.phone}  ${o.name}` }))}
          confirmLabel="分配"
          onConfirm={(v) => {
            setRows((prev) =>
              prev.map((x) =>
                selected.includes(x.id) ? { ...x, ownerName: v } : x,
              ),
            );
            setAssignOwnerOpen(false);
            toast.success("分配成功", {
              description: `${selected.length} 个账号 → ${v}`,
            });
            setSelected([]);
          }}
        />

        <SimpleSelectDialog
          open={!!assignOne}
          onOpenChange={(o) => !o && setAssignOne(null)}
          title="分配负责人"
          description={assignOne ? `将账号「${assignOne.username}」分配给指定运营人员。` : ""}
          options={OPERATOR_RECORDS.map((o) => ({ value: o.name, label: `${o.phone}  ${o.name}` }))}
          confirmLabel="分配"
          onConfirm={(v) => {
            if (!assignOne) return;
            setRows((prev) =>
              prev.map((x) =>
                x.id === assignOne.id ? { ...x, ownerName: v } : x,
              ),
            );
            toast.success("分配成功", {
              description: `${assignOne.username} → ${v}`,
            });
            setAssignOne(null);
          }}
        />

        <SimpleSelectDialog
          open={loginStatusDialogOpen}
          onOpenChange={setLoginStatusDialogOpen}
          title="设置账号状态"
          description={`为所选 ${selected.length} 个托管账号设置账号状态。`}
          options={(Object.keys(ACCOUNT_STATUS_META) as AccountStatus[]).map(
            (s) => ({
              value: s,
              label: ACCOUNT_STATUS_META[s].label,
            }),
          )}
          confirmLabel="确认"
          onConfirm={(v) => {
            setRows((prev) =>
              prev.map((x) =>
                selected.includes(x.id)
                  ? { ...x, accountStatus: v as AccountStatus }
                  : x,
              ),
            );
            setLoginStatusDialogOpen(false);
            toast.success("账号状态已更新", {
              description: `${selected.length} 个账号 → ${ACCOUNT_STATUS_META[v as AccountStatus].label}`,
            });
            setSelected([]);
          }}
        />


        <TagsDialog
          open={tagsOpen}
          onOpenChange={setTagsOpen}
          count={selected.length}
          onConfirm={(tags) => {
            setRows((prev) =>
              prev.map((x) =>
                selected.includes(x.id) ? { ...x, tags } : x,
              ),
            );
            setTagsOpen(false);
            toast.success("标签已更新", {
              description: `${selected.length} 个账号 → ${tags.map((t) => `「${t}」`).join("")}`,
            });
            setSelected([]);
          }}
        />

        <ActiveTimeDialog
          open={activeTimeOpen}
          onOpenChange={setActiveTimeOpen}
          count={selected.length}
        />


        <ActionToggleDialog
          open={actionToggleOpen}
          onOpenChange={setActionToggleOpen}
          count={selected.length}
        />


        <ImportAccountsDialog open={importOpen} onOpenChange={setImportOpen} />


        <RemoteControlDialog
          account={remoteFor}
          onOpenChange={(o) => !o && setRemoteFor(null)}
        />


        <ImageInstanceDialog
          account={mirrorFor}
          onOpenChange={(o) => !o && setMirrorFor(null)}
        />

        <InterestPreferenceDialog
          account={interestFor}
          onOpenChange={(o) => !o && setInterestFor(null)}
        />

        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          selectedRows={rows.filter((r) => selected.includes(r.id))}
          filteredRows={filtered}
        />





      </div>
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 复用组件                                                     */
/* ============================================================ */

function AccountCard({
  r,
  selected,
  onToggleSelect,
  onView,
  onRemote,
  onInterest,
  onAssign,
  onMirror,
  onEdit,
  onDelete,
}: {
  r: ManagedAccount;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onView: () => void;
  onRemote: () => void;
  onInterest: () => void;
  onAssign: () => void;
  onMirror: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pm = PLATFORM_META[r.platform];
  const sm = ACCOUNT_STATUS_META[r.accountStatus];
  const ipInfo = getIpForAccount(r);
  const views = getViewsForAccount(r);
  const dms = getDmsForAccount(r);
  const comments = getCommentsForAccount(r);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-md",
        selected && "border-primary ring-1 ring-primary/30",
      )}
    >
      {/* 选择 */}
      <div className="absolute left-3 top-3 z-10">
        <Checkbox checked={selected} onCheckedChange={(c) => onToggleSelect(!!c)} />
      </div>

      {/* 头部:头像 + 平台 + 状态 */}
      <div className="flex items-start gap-3 pl-7">
        <div className="relative">
          <Avatar className="h-12 w-12 ring-1 ring-border">
            <AvatarImage src={r.avatar} />
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {r.username.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-background",
              pm.cls,
            )}
          >
            {pm.letter}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onView}
              className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
              title={r.username}
            >
              {r.username}
            </button>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 rounded-full font-medium", sm.cls)}
        >
          {sm.label}
        </Badge>
      </div>

      {/* 待处理事项 (对齐列表列顺序:账号/状态/待处理) */}
      <div className="mt-3">
        {r.pending && (r.pending.msg > 0 || r.pending.friend > 0) ? (
          <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-1.5">
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-warning">
              <Bell className="h-3 w-3" />
              待处理
            </span>
            <span className="h-3 w-px bg-warning/30" />
            <div className="flex flex-1 items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                私信
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {r.pending.msg}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                加好友
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {r.pending.friend}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Bell className="h-3 w-3" />
            待处理事项:暂无
          </div>
        )}
      </div>

      {/* 标签 + 备注 */}
      {((r.tags && r.tags.length > 0) || (r.remark && r.remark !== "--")) && (
        <div className="mt-3 space-y-1.5">
          {r.tags && r.tags.length > 0 && <TagPillList tags={r.tags} />}
          {r.remark && r.remark !== "--" && (
            <div className="truncate text-[11px] text-muted-foreground" title={r.remark}>
              备注:{r.remark}
            </div>
          )}
        </div>
      )}

      {/* 数据指标:粉丝/关注/获赞/播放/私信/评论 (对齐列表顺序) */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <CardStat label="粉丝" value={formatStat(r.followers)} />
        <CardStat label="关注" value={formatStat(r.following)} />
        <CardStat label="获赞" value={formatStat(r.likes)} />
        <CardStat label="播放" value={formatStat(views)} />
        <CardStat label="私信" value={formatStat(dms)} />
        <CardStat label="评论" value={formatStat(comments)} />
      </div>

      {/* 地区信息:账号所属地区 / 代理地区 */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-[11px]">
        <div className="flex min-w-0 items-center gap-1 text-muted-foreground">
          <span className="shrink-0">账号地区</span>
          <span className="truncate text-foreground">{r.accountCountry}</span>
        </div>
        <span className="text-border">|</span>
        <div
          className="flex min-w-0 items-center gap-1 text-muted-foreground"
          title={`代理IP:${ipInfo.ip}`}
        >
          <span className="shrink-0">代理</span>
          <span className="truncate text-foreground">{ipInfo.country}</span>
        </div>
      </div>

      {/* 操作 */}
      <div className="mt-auto flex items-center justify-end gap-2 border-t pt-3 -mb-1">
        <TextActionBtn icon={MonitorSmartphone} label="远程控制" onClick={onRemote} />
        <TextActionBtn icon={Heart} label="设置兴趣偏好" onClick={onInterest} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              更多
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-3.5 w-3.5" />
              查看
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAssign}>
              <UserPlus className="h-3.5 w-3.5" />
              分配
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMirror}>
              <Server className="h-3.5 w-3.5" />
              修改镜像实例
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/60 px-1.5 py-1.5">
      <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function FormItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}


function TextActionBtn({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline",
        danger ? "text-destructive hover:text-destructive/80" : "text-primary hover:text-primary/80",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function TagPill({ name }: { name: string }) {
  const t = findTagByName(name);
  const color = t?.color ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}1A`,
        color,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}

function TagPillList({ tags }: { tags?: string[] | null }) {
  if (!tags || tags.length === 0)
    return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <TagPill key={t} name={t} />
      ))}
    </div>
  );
}

/* ============================================================ */
/* 弹窗组件                                                     */
/* ============================================================ */

function EditDialog({
  open,
  item,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  item: ManagedAccount | null;
  onOpenChange: (o: boolean) => void;
  onConfirm: (d: Partial<ManagedAccount>) => void;
}) {
  const [platform, setPlatform] = useState<Platform>("Facebook");
  const [username, setUsername] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("normal");
  
  const [tags, setTags] = useState<string[]>([]);
  const [tenantId, setTenantId] = useState(ACTIVE_TENANTS[0]?.id ?? "");
  const [ownerName, setOwnerName] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [device, setDevice] = useState<"云机" | "指纹浏览器">("指纹浏览器");
  const [country, setCountry] = useState("");
  const [accountCountry, setAccountCountry] = useState<string>(COUNTRIES[0]);
  const [twoFA, setTwoFA] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [cookieValue, setCookieValue] = useState("");

  

  useEffect(() => {
    if (!open) return;
    if (item) {
      setPlatform(item.platform);
      setUsername(item.username);
      setPlatformId(item.platformId ?? "");
      setAccountStatus(item.accountStatus);
      
      setTags(item.tags ?? []);
      setTenantId(item.tenantId || ACTIVE_TENANTS[0]?.id || "");
      setOwnerName(item.ownerName ?? "");
      setRemark(item.remark === "--" ? "" : item.remark);
      setCountry(item.country ?? "");
      setAccountCountry(item.accountCountry ?? COUNTRIES[0]);
      setCookieValue(item.cookieValue ?? "");
      setPinCode(item.pinCode ?? "");
    } else {
      setPlatform("Facebook");
      setUsername("");
      setPlatformId("");
      setAccountStatus("normal");
      
      setTags([]);
      setTenantId(ACTIVE_TENANTS[0]?.id ?? "");
      setOwnerName("");
      setRemark("");
      setCountry("");
      setAccountCountry(COUNTRIES[0]);
      setPinCode("");
    }
    setPassword("");
    setPhone("");
    setEmail("");
    setEmailPassword("");
    setDevice("指纹浏览器");
    setTwoFA("");
    setCookieValue("");
  }, [item, open]);


  const pinValid = platform !== "Facebook" || /^\d{6}$/.test(pinCode);
  const valid = username.trim().length > 0 && password.trim().length > 0 && !!device && country.trim().length > 0 && twoFA.trim().length > 0 && pinValid;

  const toggleTag = (name: string) => {
    setTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "编辑账号" : "新增账号"}</DialogTitle>
          <DialogDescription>
            维护托管账号的平台资料、状态、标签、负责人与租户信息。
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="平台" required>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="账号名" required>
            <Input
              placeholder="请输入账号名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="平台账号ID">
            <Input
              placeholder="请输入平台账号ID"
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
            />
          </Field>
          <Field label="密码" required>
            <Input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="电话">
            <Input
              placeholder="请输入电话"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="邮箱">
            <Input
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="邮箱密码">
            <Input
              type="password"
              placeholder="请输入邮箱密码"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
            />
          </Field>
          <Field label="2FA" required>
            <Input
              placeholder="请输入 2FA 密钥"
              maxLength={20}
              value={twoFA}
              onChange={(e) => setTwoFA(e.target.value.slice(0, 20))}
            />
          </Field>
          {platform === "Facebook" && (
            <Field label="PIN码" required>
              <Input
                inputMode="numeric"
                placeholder="请输入 6 位数字 PIN 码"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              {pinCode.length > 0 && pinCode.length < 6 && (
                <p className="mt-1 text-[11px] text-destructive">PIN 码必须为 6 位数字</p>
              )}
            </Field>
          )}
          <Field label="设备" required>
            <Select value={device} onValueChange={(v) => setDevice(v as "云机" | "指纹浏览器")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="指纹浏览器">指纹浏览器</SelectItem>
                <SelectItem value="云机">云机</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="账号所属地区" required>
            <Select value={accountCountry} onValueChange={setAccountCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="代理国家/地区" required>
            <Input
              placeholder="如：US / California"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              参考示例：US / California,表示美国・加利福尼亚州（加州）
            </p>
          </Field>

          <Field label="账号状态">
            <Select value={accountStatus} onValueChange={(v) => setAccountStatus(v as AccountStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCOUNT_STATUS_META) as AccountStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{ACCOUNT_STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="运营负责人">
            <Select value={ownerName || "__none"} onValueChange={(v) => setOwnerName(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="选择运营负责人" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">未分配</SelectItem>
                {OPERATORS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="所属租户">
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVE_TENANTS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="标签" full>
            <TagMultiSelect
              value={tags}
              onChange={setTags}
              placeholder="选择或新增标签"
            />
          </Field>
          <Field label="备注" full>
            <Textarea
              rows={2}
              placeholder="选填,便于团队协作"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </Field>
          <Field label="Cookie值" full>
            <Textarea
              rows={3}
              placeholder="选填,粘贴平台 Cookie 字符串(最多 3500 字符)"
              maxLength={3500}
              value={cookieValue}
              onChange={(e) => setCookieValue(e.target.value.slice(0, 3500))}
              className="font-mono text-xs"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {cookieValue.length} / 3500
            </p>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              const t = ACTIVE_TENANTS.find((x) => x.id === tenantId);
              onConfirm({
                platform,
                username,
                platformId: platformId.trim(),
                accountStatus,
                country,
                accountCountry,
                tags,
                tenantId: t?.id ?? tenantId,
                tenantName: t?.name ?? "未分配",
                ownerName: ownerName || undefined,
                remark: remark || "--",
                cookieValue: cookieValue || undefined,
                pinCode: platform === "Facebook" ? pinCode : undefined,
              });
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-xs text-muted-foreground">
        {required && <span className="mr-1 text-destructive">*</span>}
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SimpleSelectDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  options: { value: string; label: string }[];
  confirmLabel: string;
  onConfirm: (v: string) => void;
}) {
  const [v, setV] = useState<string>(options[0]?.value ?? "");
  useEffect(() => {
    if (open) setV(options[0]?.value ?? "");
  }, [open, options]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Select value={v} onValueChange={setV}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onConfirm(v)} disabled={!v}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagsDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  count: number;
  onConfirm: (tags: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>修改标签</DialogTitle>
          <DialogDescription>
            为所选 {count} 个托管账号设置标签（将覆盖原标签）。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">标签</Label>
          <TagMultiSelect
            value={selected}
            onChange={setSelected}
            placeholder="选择或新增标签"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlaceholderDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
          <Icon className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">功能即将上线</p>
          <p className="mt-1 text-xs text-muted-foreground">
            该功能的详细交互正在设计中,敬请期待。
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>知道了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 设置镜像实例 弹窗                                            */
/* ============================================================ */

function ImageInstanceDialog({
  account,
  onOpenChange,
}: {
  account: ManagedAccount | null;
  onOpenChange: (open: boolean) => void;
}) {
  const NODE_OPTIONS = ["雅安", "圣何塞"] as const;
  const COUNTRY_OPTIONS = ["US / California", "JP / Tokyo", "SG / Singapore", "DE / Frankfurt", "US / New York"];

  const [node, setNode] = useState<string>(NODE_OPTIONS[0]);
  const [country, setCountry] = useState<string>(COUNTRY_OPTIONS[0]);
  const [device, setDevice] = useState<"云机" | "指纹浏览器">("指纹浏览器");

  useEffect(() => {
    if (account) {
      setNode(NODE_OPTIONS[0]);
      setCountry(COUNTRY_OPTIONS[0]);
      setDevice(account.deviceType === "云机" ? "云机" : "指纹浏览器");
    }
  }, [account?.id]);

  const handleConfirm = () => {
    toast.success("镜像实例已修改", {
      description: `已为账号「${account?.username}」更新镜像实例设置。`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            修改镜像实例设置
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          设置相关信息后系统将自动匹配符合条件的镜像实例
        </div>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[80px_1fr] items-center gap-3">
            <Label className="text-sm text-muted-foreground">节点</Label>
            <Select value={node} onValueChange={setNode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NODE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[80px_1fr] items-center gap-3">
            <Label className="text-sm text-muted-foreground">代理国家/地区</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[80px_1fr] items-center gap-3">
            <Label className="text-sm text-muted-foreground">设备</Label>
            <Select value={device} onValueChange={(v) => setDevice(v as "云机" | "指纹浏览器")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="云机">云机</SelectItem>
                <SelectItem value="指纹浏览器">指纹浏览器</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 远程控制 弹窗 — 区分云机 / Windows虚拟机                     */
/* ============================================================ */

function RemoteControlDialog({
  account,
  onOpenChange,
}: {
  account: ManagedAccount | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isWin = account?.deviceType === "Windows虚拟机";
  const ipInfo = account ? getIpForAccount(account) : null;

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden",
          isWin ? "max-w-[1400px]" : "max-w-[640px]",
        )}
      >
        {account &&
          (isWin ? (
            <WindowsRemotePanel
              account={account}
              ipInfo={ipInfo}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <CloudPhoneRemotePanel account={account} />
          ))}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 云机画面 ---------- */
function CloudPhoneRemotePanel({ account }: { account: ManagedAccount }) {
  const sideBtns: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    danger?: boolean;
  }[] = [
    { icon: ClipboardPaste, label: "粘贴" },
    { icon: Camera, label: "截图" },
    { icon: Plus, label: "音量+" },
    { icon: Minus, label: "音量-" },
    { icon: Lock, label: "锁屏" },
    { icon: LayoutGrid, label: "任务" },
    { icon: Home, label: "主页" },
    { icon: ArrowLeft, label: "返回" },
    { icon: Power, label: "断开", danger: true },
  ];

  return (
    <div>
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle className="text-base">云机画面</DialogTitle>
        <DialogDescription className="sr-only">
          账号「{account.username}」绑定的云机远程画面
        </DialogDescription>
      </DialogHeader>

      <div className="flex justify-center gap-3 bg-muted/30 px-6 py-8">
        <div className="relative w-[280px] overflow-hidden rounded-[28px] border-[3px] border-foreground/80 bg-gradient-to-b from-slate-700 via-slate-900 to-black shadow-lg">
          <div className="flex items-center justify-between px-4 pt-2 text-[11px] text-white">
            <div className="flex items-center gap-1">
              <span>3:58</span>
              <span className="opacity-70">⚙</span>
              <SquareIcon className="h-2.5 w-2.5" />
              <SquareIcon className="h-2.5 w-2.5" />
            </div>
            <div className="flex items-center gap-1">
              <span>LTE</span>
              <Triangle className="h-2.5 w-2.5 rotate-90 fill-current" />
              <div className="h-2.5 w-3 rounded-sm border border-white/70" />
            </div>
          </div>
          <div className="mx-3 mt-3 flex h-9 items-center gap-2 rounded-full bg-white/95 px-3">
            <span className="text-base font-bold text-blue-500">G</span>
            <div className="flex-1" />
            <div className="h-3 w-3 rounded-sm bg-muted-foreground/40" />
            <div className="h-3 w-3 rounded-sm bg-muted-foreground/40" />
          </div>
          <div className="h-28" />
          <div className="grid grid-cols-4 gap-3 px-3">
            {["Gmail", "Photos", "", "Play"].map((n, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                {n ? (
                  <>
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[10px] font-bold text-foreground">
                      {n[0]}
                    </div>
                    <span className="text-[10px] text-white">{n}</span>
                  </>
                ) : (
                  <div className="h-10 w-10" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 px-3 pb-4">
            {["☎", "💬", "🗺", "🌐", "📷"].map((e, i) => (
              <div
                key={i}
                className="grid h-9 w-9 place-items-center rounded-lg bg-white text-base"
              >
                {e}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-around border-t border-white/10 bg-black/40 py-2 text-white/80">
            <Triangle className="h-3 w-3 -rotate-90 fill-current" />
            <Circle className="h-3 w-3" />
            <SquareIcon className="h-3 w-3" />
          </div>
        </div>

        <div className="flex w-14 flex-col items-stretch rounded-xl border bg-background py-1 shadow-sm">
          {sideBtns.map((b, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "flex flex-col items-center gap-0.5 border-b py-2 text-[10px] last:border-b-0 hover:bg-accent",
                b.danger ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <b.icon className="h-3.5 w-3.5" />
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Windows 远程控制 ---------- */
function WindowsRemotePanel({
  account,
  ipInfo,
  onClose,
}: {
  account: ManagedAccount;
  ipInfo: { ip: string; country: string } | null;
  onClose: () => void;
}) {
  const [local, setLocal] = useState("");
  const [remote, setRemote] = useState("");
  const winName = `WINDOWS-${account.id
    .replace(/\W/g, "")
    .toUpperCase()
    .padEnd(7, "0")
    .slice(0, 7)}`;

  return (
    <div>
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle className="text-base">Windows 远程控制</DialogTitle>
        <DialogDescription className="sr-only">
          账号「{account.username}」绑定的 Windows 虚拟机
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{winName}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className="border-cyan-500/40 bg-cyan-500/10 text-cyan-600"
            >
              中转服务模式
            </Badge>
            <span className="font-mono">{ipInfo?.ip ?? "—"}:5900</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-success/40 bg-success/10 text-success">
            <CheckCircle2 className="mr-1 h-3 w-3" /> 已连接
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            重新连接
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            Ctrl+Alt+Del
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b bg-muted/20 px-6 py-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-medium">本地剪贴板</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                读取本地
              </Button>
              <Button size="sm" className="h-7 px-2 text-xs">
                发送到远端
              </Button>
            </div>
          </div>
          <Textarea
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="输入文本后可发送到远端，或点击读取本地剪贴板"
            className="h-20 resize-none bg-background text-xs"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-medium">远端剪贴板</Label>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
              复制到本地
            </Button>
          </div>
          <Textarea
            value={remote}
            onChange={(e) => setRemote(e.target.value)}
            placeholder="远端更新剪贴板后会显示在这里"
            className="h-20 resize-none bg-background text-xs"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Tab", "Esc", "Enter", "Backspace"].map((k) => (
              <Button
                key={k}
                variant="outline"
                size="sm"
                className="h-7 px-2 font-mono text-xs"
              >
                {k}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex h-[420px] items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3 text-white/60">
          <Monitor className="h-12 w-12" />
          <p className="text-xs">远程桌面画面（演示占位）</p>
          <p className="font-mono text-[10px] opacity-60">
            {ipInfo ? `${ipInfo.country} · ${ipInfo.ip}` : ""}
          </p>
        </div>
      </div>

      <DialogFooter className="border-t px-6 py-3">
        <Button variant="outline" onClick={onClose}>
          关闭
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ============================================================ */
/* 账号活跃时间配置 弹窗                                        */
/* ============================================================ */

type ActiveSlot = { id: string; start: string; end: string; remark: string };

function ActiveTimeDialog({
  open,
  onOpenChange,
  count,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
}) {
  const [slots, setSlots] = useState<ActiveSlot[]>([]);

  useEffect(() => {
    if (open) setSlots([]);
  }, [open]);

  const addSlot = () => {
    setSlots((s) => [
      ...s,
      { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, start: "09:00", end: "18:00", remark: "" },
    ]);
  };

  const updateSlot = (id: string, patch: Partial<ActiveSlot>) => {
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeSlot = (id: string) => {
    setSlots((s) => s.filter((x) => x.id !== id));
  };

  const handleSave = () => {
    // 校验:开始时间早于结束时间;时间段不重叠
    for (const s of slots) {
      if (!s.start || !s.end || s.start >= s.end) {
        toast.warning("开始时间必须早于结束时间");
        return;
      }
    }
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        toast.warning("时间段不能重叠");
        return;
      }
    }
    toast.success("活跃时间已保存", {
      description: count > 0 ? `已为 ${count} 个账号更新活跃时间配置。` : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            账号活跃时间配置
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            配置规则说明:请配置账号在一天内的活跃时间段。时间段不能重叠,且开始时间必须早于结束时间。活跃时间段内,每 10 分钟会检查账号能否下发 action。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={addSlot}>
              <Plus className="h-4 w-4" />
              添加时间段
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">活跃开始时间</TableHead>
                  <TableHead className="w-[180px]">活跃结束时间</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                      暂无时间段,请点击右上角「添加时间段」
                    </TableCell>
                  </TableRow>
                ) : (
                  slots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="relative">
                          <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="time"
                            value={s.start}
                            onChange={(e) => updateSlot(s.id, { start: e.target.value })}
                            className="pl-8"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="time"
                            value={s.end}
                            onChange={(e) => updateSlot(s.id, { end: e.target.value })}
                            className="pl-8"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="备注信息"
                          value={s.remark}
                          onChange={(e) => updateSlot(s.id, { remark: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeSlot(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存配置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 禁/启用动作设置 弹窗                                         */
/* ============================================================ */

function ActionToggleDialog({
  open,
  onOpenChange,
  count,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
}) {
  const ACTIONS = [
    { key: "nurture", label: "培育任务", icon: Pencil, color: "text-sky-500", bg: "bg-sky-500/10", desc: "包含浏览、点赞、关注等模拟真人行为的养号动作" },
    { key: "post", label: "发帖任务", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "执行内容发布、定时发帖等对外输出动作" },
  ] as const;


  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ACTIONS.map((a) => [a.key, true])),
  );

  useEffect(() => {
    if (open) {
      setStates(Object.fromEntries(ACTIONS.map((a) => [a.key, true])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    const disabled = Object.entries(states).filter(([, v]) => !v).length;
    toast.success("动作设置已保存", {
      description:
        count > 0
          ? `已为 ${count} 个账号更新动作设置${disabled ? `,共禁用 ${disabled} 项` : ""}。`
          : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            禁/启用动作设置
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            为已选中的 <span className="font-semibold text-foreground">{count || 1}</span> 个账号统一设置可执行动作。默认启用,鼠标悬停可查看说明。

          </DialogDescription>
        </DialogHeader>

        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-1 gap-3 py-1">
            {ACTIONS.map((a) => {
              const enabled = states[a.key];
              const Icon = a.icon;
              return (
                <Tooltip key={a.key}>
                  <TooltipTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setStates((s) => ({ ...s, [a.key]: !s[a.key] }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setStates((s) => ({ ...s, [a.key]: !s[a.key] }));
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-accent/40",
                        !enabled && "opacity-70",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-md",
                            a.bg,
                          )}
                        >
                          <Icon className={cn("h-4 w-4", a.color)} />
                        </span>
                        <div className="leading-tight">
                          <div className="text-sm font-medium">{a.label}</div>
                          <div
                            className={cn(
                              "text-[11px]",
                              enabled ? "text-muted-foreground" : "text-destructive",
                            )}
                          >
                            {enabled ? "已启用" : "已禁用"}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => setStates((s) => ({ ...s, [a.key]: v }))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {a.desc}
                  </TooltipContent>

                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleConfirm}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* 批量导入托管账号 弹窗                                        */
/* ============================================================ */

function ImportAccountsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const REQUIRED_FIELDS = ["平台", "账号", "平台账号ID", "密码", "2FA", "设备类型", "账号所属地区", "代理国家/地区"];
  const OPTIONAL_FIELDS = ["电话", "邮箱", "邮箱密码", "备注", "Cookie值"];
  const DEVICE_TYPE_OPTIONS = ["云机", "指纹浏览器"];

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setDragOver(false);
    }
  }, [open]);

  const validateFile = (f: File) => {
    const okExt = /\.(csv|xlsx|xls)$/i.test(f.name);
    if (!okExt) {
      toast.error("文件格式不支持", { description: "请上传 .csv / .xlsx / .xls 文件" });
      return false;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("文件过大", { description: "单个文件不能超过 20MB" });
      return false;
    }
    return true;
  };

  const handlePick = (f: File | null) => {
    if (!f) return;
    if (validateFile(f)) setFile(f);
  };

  const handleDownloadTemplate = () => {
    const headers = [...REQUIRED_FIELDS.map((f) => `${f}(必填)`), ...OPTIONAL_FIELDS.map((f) => `${f}(选填)`)];
    const sample = ["Facebook", "demo_user", "1000123456789", "Pass@123", "JBSWY3DPEHPK3PXP", "云机", "美国", "US / California", "+1 555-0100", "demo@example.com", "MailPwd@123", "示例账号", "c_user=1000xxx; xs=xxx; datr=xxx"];
    const csv = headers.join(",") + "\n" + sample.join(",") + "\n";
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "账号导入模板.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("模板已下载");
  };

  const handleConfirm = () => {
    if (!file) {
      toast.warning("请先上传文件");
      return;
    }
    toast.success("导入任务已提交", {
      description: `文件「${file.name}」已加入解析队列,完成后可在列表查看。`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            批量导入账号
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            支持 .csv / .xlsx / .xls 文件,单次最多 5000 条。请先下载模板,按格式填写后再上传。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 模板下载 */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Download className="h-4 w-4 text-primary" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-medium">导入模板</div>
                <div className="text-[11px] text-muted-foreground">下载模板,按列填写账号信息</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              下载模板
            </Button>
          </div>

          {/* 字段说明 */}
          <div className="rounded-lg border bg-card px-4 py-3">
            <div className="mb-2 text-sm font-medium">字段说明</div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-start gap-2 text-xs">
                <span className="text-muted-foreground">必填:</span>
                {REQUIRED_FIELDS.map((f) => (
                  <Badge key={f} variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
                    <span className="mr-0.5 text-destructive">*</span>
                    {f}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-start gap-2 text-xs">
                <span className="text-muted-foreground">选填:</span>
                {OPTIONAL_FIELDS.map((f) => (
                  <Badge key={f} variant="outline" className="text-muted-foreground">
                    {f}
                  </Badge>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground">
                设备类型可选值: {DEVICE_TYPE_OPTIONS.join(" / ")}
              </div>
            </div>
          </div>

          {/* 上传区域 */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handlePick(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/30",
            )}
          >
            <Upload className={cn("h-7 w-7", dragOver ? "text-primary" : "text-muted-foreground")} />
            <div className="mt-2 text-sm">
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-primary">点击上传</span>
                  <span className="text-muted-foreground"> 或拖拽文件到此处</span>
                </>
              )}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              支持 .csv / .xlsx / .xls,单文件不超过 20MB
            </div>
            {file && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <Trash2 className="h-3 w-3" />
                移除文件
              </Button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleConfirm}>确认导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




/* ============================================================ */
/* 设置兴趣偏好 弹窗已抽取到 @/components/interest-preference-dialog */




/* ============================================================ */
/* 导出弹窗:可选择字段;未勾选行→导出全部筛选结果,勾选行→导出选中  */
/* ============================================================ */

type ExportField = {
  key: string;
  label: string;
  get: (r: ManagedAccount) => string | number;
};

// 兴趣偏好 / 凭据 / 资源 等明细字段在详情页是按账号 id 派生的 mock,
// 此处用同样的确定性派生方式以保证导出数据稳定可复现。
const INTEREST_POOL = ["travel", "food", "parenting", "fitness", "tech", "beauty", "finance", "gaming", "pets", "music"];
const DISLIKE_POOL = ["politics", "violence", "spam", "gambling", "tobacco"];
const COMMENT_TOPIC_POOL = ["产品体验", "性价比", "售后服务", "使用教程", "优惠活动", "对比测评", "潮流趋势", "情感共鸣"];
const COMMENT_SENTIMENT_POOL = ["正向", "中性", "正向偏理性", "热情友好", "克制专业"];
const COMMENT_STYLE_POOL = ["简洁口语", "亲切活泼", "专业理性", "幽默风趣", "真诚分享"];
const PROXY_GEO = ["美国/加州", "日本/东京", "新加坡/中区", "印尼/雅加达", "马来/吉隆坡"];
const hashNum = (s: string) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const pickN = <T,>(arr: T[], n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => arr[(seed + i * 7) % arr.length]);
const derivedInterest = (r: ManagedAccount) => pickN(INTEREST_POOL, 3, hashNum(r.id)).join("; ");
const derivedDislike = (r: ManagedAccount) => pickN(DISLIKE_POOL, 2, hashNum(r.id) + 5).join("; ");
const derivedCommentTopics = (r: ManagedAccount) => pickN(COMMENT_TOPIC_POOL, 3, hashNum(r.id) + 11).join("; ");
const derivedCommentSentiment = (r: ManagedAccount) => COMMENT_SENTIMENT_POOL[hashNum(r.id) % COMMENT_SENTIMENT_POOL.length];
const derivedCommentStyle = (r: ManagedAccount) => COMMENT_STYLE_POOL[(hashNum(r.id) + 3) % COMMENT_STYLE_POOL.length];

const derivedCookieStatus = (r: ManagedAccount) =>
  r.accountStatus === "fail" ? "已失效" : r.accountStatus === "risk" ? "风控待校验" : "有效";
const derivedProxyIp = (r: ManagedAccount) => {
  const h = hashNum(r.id);
  return `${10 + (h % 240)}.${h % 256}.${(h >> 8) % 256}.${(h >> 16) % 256}`;
};
const derivedProxyGeo = (r: ManagedAccount) => PROXY_GEO[hashNum(r.id) % PROXY_GEO.length];
const derivedDeviceId = (r: ManagedAccount) => `DEV-${String(hashNum(r.id) % 100000).padStart(5, "0")}`;

const EXPORT_FIELDS: ExportField[] = [
  { key: "platform", label: "平台", get: (r) => r.platform },
  { key: "username", label: "账号名", get: (r) => r.username },
  { key: "platformId", label: "平台ID", get: (r) => r.platformId },
  { key: "accountStatus", label: "账号状态", get: (r) => ACCOUNT_STATUS_META[r.accountStatus]?.label ?? r.accountStatus },
  { key: "tenantName", label: "归属租户", get: (r) => r.tenantName },
  { key: "ownerName", label: "负责人", get: (r) => r.ownerName ?? "" },
  { key: "accountCountry", label: "账号所属地区", get: (r) => r.accountCountry },
  { key: "country", label: "代理国家/地区", get: (r) => r.country },
  { key: "followers", label: "粉丝数", get: (r) => r.followers },
  { key: "following", label: "关注数", get: (r) => r.following },
  { key: "likes", label: "获赞数", get: (r) => r.likes },
  { key: "tags", label: "标签", get: (r) => (r.tags ?? []).join("/") },
  { key: "remark", label: "备注", get: (r) => r.remark },
  { key: "createdAt", label: "创建时间", get: (r) => r.createdAt },
  // 兴趣偏好
  { key: "interestTags", label: "感兴趣标签", get: derivedInterest },
  { key: "dislikeTags", label: "不感兴趣标签", get: derivedDislike },
  { key: "commentTopics", label: "评论主题词", get: derivedCommentTopics },
  { key: "commentSentiment", label: "评论情绪", get: derivedCommentSentiment },
  { key: "commentStyle", label: "评论风格", get: derivedCommentStyle },
  // 凭据
  { key: "cookieStatus", label: "凭据状态", get: derivedCookieStatus },
  { key: "cookieValue", label: "Cookie", get: (r) => r.cookieValue ?? "" },
  { key: "twoFa", label: "2FA", get: (r) => `OTP-${String(hashNum(r.id) % 1000000).padStart(6, "0")}` },
  { key: "recoveryPhone", label: "恢复手机号", get: (r) => `+1 ${String(hashNum(r.id) % 9000000000 + 1000000000)}` },
  { key: "recoveryEmail", label: "恢复邮箱", get: (r) => `recover.${r.id}@mailbox.io` },
  { key: "emailPassword", label: "邮箱密码", get: (r) => `Pwd@${String(hashNum(r.id) % 100000).padStart(5, "0")}!` },
  // 资源
  { key: "deviceType", label: "设备类型", get: (r) => r.deviceType ?? "" },
  { key: "deviceId", label: "设备ID", get: derivedDeviceId },
  { key: "deviceName", label: "设备名称", get: (r) => `${r.deviceType ?? "云机"}-${String(hashNum(r.id) % 1000).padStart(3, "0")}` },
  { key: "imageInstanceId", label: "镜像实例ID", get: (r) => `IMG-${String(hashNum(r.id) % 1000000).padStart(6, "0")}` },
  { key: "imageInstanceName", label: "镜像实例名称", get: (r) => `${r.platform}-${r.country}-镜像${(hashNum(r.id) % 20) + 1}` },
  { key: "proxyIp", label: "代理IP", get: derivedProxyIp },
  { key: "proxyGeo", label: "代理IP国家/地区", get: derivedProxyGeo },
  { key: "egressIp", label: "出口IP", get: (r) => { const h = hashNum(r.id) + 1; return `${10 + (h % 240)}.${h % 256}.${(h >> 8) % 256}.${(h >> 16) % 256}`; } },
  { key: "port", label: "端口", get: (r) => 10000 + (hashNum(r.id) % 50000) },
];

const DEFAULT_EXPORT_KEYS = [
  "platform", "username", "platformId", "accountStatus",
  "tenantName", "ownerName", "accountCountry", "country", "followers", "createdAt",
];

function ExportDialog({
  open,
  onOpenChange,
  selectedRows,
  filteredRows,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedRows: ManagedAccount[];
  filteredRows: ManagedAccount[];
}) {
  const [keys, setKeys] = useState<string[]>(DEFAULT_EXPORT_KEYS);
  const useSelected = selectedRows.length > 0;
  const dataRows = useSelected ? selectedRows : filteredRows;

  const allChecked = keys.length === EXPORT_FIELDS.length;
  const toggleAll = () => {
    setKeys(allChecked ? [] : EXPORT_FIELDS.map((f) => f.key));
  };
  const toggleKey = (k: string) => {
    setKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const handleExport = () => {
    if (keys.length === 0) {
      toast.error("请至少选择一个导出字段");
      return;
    }
    if (dataRows.length === 0) {
      toast.error("没有可导出的数据");
      return;
    }
    const fields = EXPORT_FIELDS.filter((f) => keys.includes(f.key));
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = fields.map((f) => esc(f.label)).join(",");
    const body = dataRows
      .map((r) => fields.map((f) => esc(f.get(r))).join(","))
      .join("\n");
    const csv = "\uFEFF" + header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `账号列表_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("导出成功", {
      description: `共 ${dataRows.length} 条 · ${fields.length} 个字段`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>导出账号</DialogTitle>
          <DialogDescription>
            选择需要导出的字段,导出为 CSV 文件。
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              "rounded-full",
              useSelected
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted text-muted-foreground"
            )}>
              {useSelected ? "导出选中" : "导出全部"}
            </Badge>
            <span className="text-muted-foreground">
              共 <span className="font-medium text-foreground">{dataRows.length}</span> 条
              {useSelected
                ? "(已勾选数据)"
                : "(当前筛选结果;勾选列表行后将仅导出选中)"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">导出字段</Label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {allChecked ? "全不选" : "全选"}
            </button>
          </div>
          <div className="max-h-[360px] space-y-3 overflow-auto rounded-lg border p-3">
            {([
              { title: "基础信息", groups: [{ subtitle: "", keys: ["platform","username","platformId","accountStatus","tenantName","ownerName","accountCountry","country","followers","following","likes","tags","remark","createdAt"] }] },
              { title: "兴趣偏好", groups: [{ subtitle: "", keys: ["interestTags","dislikeTags","commentTopics","commentSentiment","commentStyle"] }] },
              { title: "凭据", groups: [{ subtitle: "", keys: ["cookieStatus","cookieValue","twoFa","recoveryPhone","recoveryEmail","emailPassword"] }] },
              { title: "资源", groups: [
                { subtitle: "设备", keys: ["deviceType","deviceName","deviceId"] },
                { subtitle: "镜像实例", keys: ["imageInstanceId","imageInstanceName"] },
                { subtitle: "代理 IP", keys: ["proxyIp","egressIp","port","proxyGeo"] },
              ] },
            ] as { title: string; groups: { subtitle: string; keys: string[] }[] }[]).map((grp) => (
              <div key={grp.title}>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">{grp.title}</div>
                <div className="space-y-2">
                  {grp.groups.map((sub, idx) => (
                    <div key={idx}>
                      {sub.subtitle ? (
                        <div className="mb-1 flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                          <span className="text-[11px] text-muted-foreground/80">{sub.subtitle}</span>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                        {EXPORT_FIELDS.filter((f) => sub.keys.includes(f.key)).map((f) => (
                          <label
                            key={f.key}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                          >
                            <Checkbox
                              checked={keys.includes(f.key)}
                              onCheckedChange={() => toggleKey(f.key)}
                            />
                            <span className="truncate">{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            已选 {keys.length} / {EXPORT_FIELDS.length} 个字段
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4" />
            确定导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

