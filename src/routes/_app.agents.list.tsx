import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Search,
  RotateCcw,
  Plus,
  ChevronDown,
  CheckCircle2,
  PauseCircle,
  FileText,
  Activity,
  DollarSign,
  Pencil,
  Trash2,
  MoreHorizontal,
  Copy,
  Power,
  Sparkles,
  MessageSquare,
  Languages,
  ShieldAlert,
  BarChart3,
  Users,
  Wand2,
  PenLine,
  Plug,
  BookOpen,
  Workflow,
  Check,
  FileCode,
  RefreshCw,
  Bot,
  Save,
  Eye,
  Send,
  Plus as PlusIcon,
  X as XIcon,
  Thermometer,
  Hash,
  Trash2 as TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/agents/list")({
  component: AgentListPage,
  head: () => ({ meta: [{ title: "智能体列表 — BooPilot" }] }),
});

/* ============================================================ */
/* 类型与常量                                                   */
/* ============================================================ */

type AgentStatus = "enabled" | "disabled" | "draft";
type AgentType =
  | "content"
  | "translate"
  | "risk"
  | "data"
  | "interact"
  | "custom";

interface Agent {
  id: string;
  name: string;
  icon: keyof typeof TYPE_ICONS;
  type: AgentType;
  description: string;
  model: string;
  status: AgentStatus;
  plugins: number;
  knowledge: number;
  workflows: number;
  callsThisMonth: number;
  successRate: number;
  costThisMonth: number;
  updatedAt: string;
}

const TYPE_ICONS = {
  pen: PenLine,
  chat: MessageSquare,
  lang: Languages,
  shield: ShieldAlert,
  chart: BarChart3,
  users: Users,
  wand: Wand2,
};

const TYPE_OPTIONS: { value: AgentType; label: string }[] = [
  { value: "content", label: "内容创作" },
  { value: "translate", label: "翻译" },
  { value: "risk", label: "风控分析" },
  { value: "data", label: "数据分析" },
  { value: "interact", label: "客户互动" },
  { value: "custom", label: "自定义" },
];

const STATUS_META: Record<
  AgentStatus,
  { label: string; cls: string; dot: string; icon: typeof CheckCircle2 }
> = {
  enabled: {
    label: "已启用",
    cls: "bg-success/10 text-success border-success/30",
    dot: "bg-success",
    icon: CheckCircle2,
  },
  disabled: {
    label: "已停用",
    cls: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
    icon: PauseCircle,
  },
  draft: {
    label: "草稿",
    cls: "bg-warning/10 text-warning border-warning/30",
    dot: "bg-warning",
    icon: FileText,
  },
};

const MODEL_OPTIONS = [
  "GPT-4o",
  "GPT-4o mini",
  "Claude 3.5 Sonnet",
  "Claude 3.5 Haiku",
  "Gemini 2.5 Flash",
  "Gemini 2.5 Pro",
  "DeepSeek V3",
  "通义千问 Max",
];

const TEMPLATES = [
  {
    id: "tpl-content",
    name: "内容创作助手（出海电商）",
    desc: "多平台社媒文案、评论、私信话术生成",
    icon: PenLine,
    type: "content" as AgentType,
  },
  {
    id: "tpl-comment",
    name: "评论话术生成器",
    desc: "基于目标帖子智能生成上下文评论",
    icon: MessageSquare,
    type: "interact" as AgentType,
  },
  {
    id: "tpl-translate",
    name: "请问你把有效期至 xxx 添加到哪儿了？我没有看到（见附件）",
    desc: "扫描并修复系统中的安全问题",
    icon: Languages,
    type: "translate" as AgentType,
  },
  {
    id: "tpl-custom",
    name: "自定义模板",
    desc: "空白表单，从零搭建你的智能体",
    icon: Wand2,
    type: "custom" as AgentType,
  },
];

const SEED: Agent[] = [
  {
    id: "ag-000",
    name: "账号运营助手",
    icon: "users",
    type: "interact",
    description: "一站式创建并执行账号运营任务，覆盖养号、发帖、互动、数据回收全流程。",
    model: "GPT-4o",
    status: "enabled",
    plugins: 5,
    knowledge: 3,
    workflows: 4,
    callsThisMonth: 12860,
    successRate: 99.1,
    costThisMonth: 68.4,
    updatedAt: "10 分钟前",
  },
  {
    id: "ag-001",
    name: "内容创作助手",
    icon: "pen",
    type: "content",
    description: "为出海品牌生成多平台社媒内容，支持帖子、评论、私信话术。",
    model: "GPT-4o",
    status: "enabled",
    plugins: 3,
    knowledge: 2,
    workflows: 1,
    callsThisMonth: 8421,
    successRate: 98.3,
    costThisMonth: 42.5,
    updatedAt: "2 小时前",
  },
  {
    id: "ag-002",
    name: "评论话术生成器",
    icon: "chat",
    type: "interact",
    description: "基于目标帖子内容，智能生成上下文相关的多角度评论话术。",
    model: "Claude 3.5 Sonnet",
    status: "enabled",
    plugins: 2,
    knowledge: 1,
    workflows: 0,
    callsThisMonth: 3127,
    successRate: 97.6,
    costThisMonth: 18.3,
    updatedAt: "1 天前",
  },
  {
    id: "ag-003",
    name: "请问你把有效期至 xxx 添加到哪儿了？我没有看到（见附件）",
    icon: "lang",
    type: "translate",
    description: "扫描并修复系统中的安全问题",
    model: "Gemini 2.5 Pro",
    status: "enabled",
    plugins: 1,
    knowledge: 3,
    workflows: 2,
    callsThisMonth: 5604,
    successRate: 99.1,
    costThisMonth: 12.7,
    updatedAt: "4 小时前",
  },
  {
    id: "ag-004",
    name: "风控分析专家",
    icon: "shield",
    type: "risk",
    description: "识别账号异常行为、违规话术与高风险互动事件。",
    model: "GPT-4o",
    status: "enabled",
    plugins: 4,
    knowledge: 2,
    workflows: 3,
    callsThisMonth: 1289,
    successRate: 95.8,
    costThisMonth: 8.9,
    updatedAt: "昨天",
  },
  {
    id: "ag-005",
    name: "数据洞察分析师",
    icon: "chart",
    type: "data",
    description: "汇总多平台运营数据，输出趋势报告与优化建议。",
    model: "Claude 3.5 Sonnet",
    status: "enabled",
    plugins: 2,
    knowledge: 4,
    workflows: 1,
    callsThisMonth: 962,
    successRate: 96.4,
    costThisMonth: 6.4,
    updatedAt: "3 小时前",
  },
  {
    id: "ag-006",
    name: "客户互动机器人",
    icon: "users",
    type: "interact",
    description: "7×24 私信自动回复，识别意图分类并触发后续任务。",
    model: "GPT-4o mini",
    status: "enabled",
    plugins: 3,
    knowledge: 2,
    workflows: 2,
    callsThisMonth: 4220,
    successRate: 94.2,
    costThisMonth: 4.6,
    updatedAt: "5 小时前",
  },
  {
    id: "ag-007",
    name: "敏感词复审助手",
    icon: "shield",
    type: "risk",
    description: "对生成内容进行二次合规审查，命中敏感词自动拦截。",
    model: "DeepSeek V3",
    status: "disabled",
    plugins: 1,
    knowledge: 5,
    workflows: 0,
    callsThisMonth: 0,
    successRate: 0,
    costThisMonth: 0,
    updatedAt: "3 天前",
  },
  {
    id: "ag-008",
    name: "图文素材改写",
    icon: "pen",
    type: "content",
    description: "针对已有素材一键多版本改写，覆盖不同语气风格。",
    model: "Gemini 2.5 Flash",
    status: "disabled",
    plugins: 2,
    knowledge: 1,
    workflows: 1,
    callsThisMonth: 0,
    successRate: 0,
    costThisMonth: 0,
    updatedAt: "上周",
  },
  {
    id: "ag-009",
    name: "私信意图分类器",
    icon: "wand",
    type: "interact",
    description: "对来源私信进行意图归类，自动路由至对应处理流程。",
    model: "GPT-4o mini",
    status: "disabled",
    plugins: 1,
    knowledge: 2,
    workflows: 1,
    callsThisMonth: 0,
    successRate: 0,
    costThisMonth: 0,
    updatedAt: "上周",
  },
  {
    id: "ag-010",
    name: "节日营销文案生成",
    icon: "pen",
    type: "content",
    description: "围绕节点活动批量生成多语言营销文案与配图建议。",
    model: "Claude 3.5 Haiku",
    status: "draft",
    plugins: 0,
    knowledge: 1,
    workflows: 0,
    callsThisMonth: 0,
    successRate: 0,
    costThisMonth: 0,
    updatedAt: "刚刚",
  },
  {
    id: "ag-011",
    name: "竞品监测分析",
    icon: "chart",
    type: "data",
    description: "定期抓取竞品账号互动指标，自动生成对比简报。",
    model: "通义千问 Max",
    status: "draft",
    plugins: 1,
    knowledge: 2,
    workflows: 1,
    callsThisMonth: 0,
    successRate: 0,
    costThisMonth: 0,
    updatedAt: "2 天前",
  },
];

/* ============================================================ */
/* 主页面                                                       */
/* ============================================================ */

function AgentListPage() {
  const [agents, setAgents] = useState<Agent[]>(SEED);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneId, setCloneId] = useState<string>("");
  const [batchAction, setBatchAction] = useState<
    null | "enable" | "disable" | "delete"
  >(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const openCreate = () => {
    setEditorMode("create");
    setEditingAgent(null);
    setEditorOpen(true);
  };
  const openEdit = (a: Agent) => {
    setEditorMode("edit");
    setEditingAgent(a);
    setEditorOpen(true);
  };
  const handleEditorSave = (draft: Agent) => {
    if (editorMode === "create") {
      setAgents((prev) => [{ ...draft, id: `ag-${Date.now()}` }, ...prev]);
      toast.success(`已创建「${draft.name}」`, {
        description: draft.status === "draft" ? "已保存为草稿。" : "智能体已生效。",
      });
    } else {
      setAgents((prev) => prev.map((x) => (x.id === draft.id ? draft : x)));
      toast.success(`已保存「${draft.name}」`);
    }
    setEditorOpen(false);
  };

  const stats = useMemo(() => {
    return {
      enabled: agents.filter((a) => a.status === "enabled").length,
      disabled: agents.filter((a) => a.status === "disabled").length,
      draft: agents.filter((a) => a.status === "draft").length,
      calls: agents.reduce((s, a) => s + a.callsThisMonth, 0),
      cost: agents.reduce((s, a) => s + a.costThisMonth, 0),
    };
  }, [agents]);

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (modelFilter !== "all" && a.model !== modelFilter) return false;
      if (keyword) {
        const k = keyword.toLowerCase();
        if (
          !a.name.toLowerCase().includes(k) &&
          !a.description.toLowerCase().includes(k)
        )
          return false;
      }
      return true;
    });
  }, [agents, typeFilter, statusFilter, modelFilter, keyword]);

  const pageSize = 9;
  const [page, setPage] = useState(1);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize],
  );
  const pagedFiltered = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const allChecked =
    pagedFiltered.length > 0 && pagedFiltered.every((a) => selected.includes(a.id));

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const reset = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setModelFilter("all");
    setKeyword("");
    setPage(1);
  };

  const handleToggleStatus = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === "enabled" ? "disabled" : "enabled",
            }
          : a,
      ),
    );
    toast.success("状态已更新");
  };

  const handleClone = (id: string) => {
    const src = agents.find((a) => a.id === id);
    if (!src) return;
    const copy: Agent = {
      ...src,
      id: `ag-${Date.now()}`,
      name: `${src.name} 副本`,
      status: "draft",
      callsThisMonth: 0,
      successRate: 0,
      costThisMonth: 0,
      updatedAt: "刚刚",
    };
    setAgents((prev) => [copy, ...prev]);
    toast.success("已复制智能体", { description: `生成「${copy.name}」草稿` });
  };

  const runBatch = () => {
    if (!batchAction) return;
    if (batchAction === "delete") {
      setAgents((prev) => prev.filter((a) => !selected.includes(a.id)));
      toast.success(`已删除 ${selected.length} 个智能体`);
    } else {
      const next: AgentStatus = batchAction === "enable" ? "enabled" : "disabled";
      setAgents((prev) =>
        prev.map((a) =>
          selected.includes(a.id) && a.status !== "draft"
            ? { ...a, status: next }
            : a,
        ),
      );
      toast.success(
        batchAction === "enable"
          ? `已启用 ${selected.length} 个智能体`
          : `已停用 ${selected.length} 个智能体`,
      );
    }
    setSelected([]);
    setBatchAction(null);
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-5">
        {/* 标题 */}
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            智能体列表
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            统一管理业务智能体的能力、模型与运行表现，支持批量上下架与模板复制。
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="已启用" value={stats.enabled} icon={CheckCircle2} tone="success" />
          <StatCard title="已停用" value={stats.disabled} icon={PauseCircle} tone="muted" />
          <StatCard title="草稿" value={stats.draft} icon={FileText} tone="warning" />
          <StatCard title="本月调用" value={stats.calls.toLocaleString()} icon={Activity} tone="primary" />
          <StatCard title="本月费用" value={`$${stats.cost.toFixed(2)}`} icon={DollarSign} tone="primary" />
        </div>

        {/* 筛选区 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">类型</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">状态</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="enabled">已启用</SelectItem>
                  <SelectItem value="disabled">已停用</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">使用模型</Label>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">关键字</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索名称 / 描述"
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                  重置
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-[var(--shadow-card)]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                新建智能体
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                选择创建方式
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={openCreate}>
                <FileCode className="h-4 w-4" />
                从零创建
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTemplateOpen(true)}>
                <Sparkles className="h-4 w-4" />
                从模板创建
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setCloneId(agents[0]?.id ?? "");
                  setCloneOpen(true);
                }}
              >
                <Copy className="h-4 w-4" />
                复制已有智能体
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            disabled={selected.length === 0}
            onClick={() => setBatchAction("enable")}
          >
            <Power className="h-4 w-4" />
            批量启用
            {selected.length > 0 && ` (${selected.length})`}
          </Button>
          <Button
            variant="outline"
            disabled={selected.length === 0}
            onClick={() => setBatchAction("disable")}
          >
            <PauseCircle className="h-4 w-4" />
            批量停用
            {selected.length > 0 && ` (${selected.length})`}
          </Button>
          <Button
            variant="outline"
            disabled={selected.length === 0}
            onClick={() => setBatchAction("delete")}
          >
            <Trash2 className="h-4 w-4" />
            批量删除
            {selected.length > 0 && ` (${selected.length})`}
          </Button>

          {pagedFiltered.length > 0 && (
            <label className="ml-2 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(c) =>
                  c
                    ? setSelected([
                        ...new Set([
                          ...selected,
                          ...pagedFiltered.map((a) => a.id),
                        ]),
                      ])
                    : setSelected(
                        selected.filter(
                          (id) => !pagedFiltered.some((a) => a.id === id),
                        ),
                      )
                }
              />
              全选当前页
            </label>
          )}
          {selected.length > 0 && (
            <span className="text-sm text-primary">
              已选 {selected.length} 项
              <button
                onClick={() => setSelected([])}
                className="ml-2 text-muted-foreground underline-offset-2 hover:underline"
              >
                取消选择
              </button>
            </span>
          )}

          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toast.success("已刷新")}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 智能体卡片列表 */}
        {filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-[var(--shadow-card)]">
            <Sparkles className="mb-2 h-8 w-8 opacity-60" />
            暂无符合条件的智能体
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pagedFiltered.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                checked={selected.includes(a.id)}
                onToggle={() => toggle(a.id)}
                onEdit={() => openEdit(a)}
                onToggleStatus={() => handleToggleStatus(a.id)}
                onClone={() => handleClone(a.id)}
                onDelete={() => {
                  setAgents((prev) => prev.filter((x) => x.id !== a.id));
                  setSelected((prev) => prev.filter((x) => x !== a.id));
                  toast.success(`已删除「${a.name}」`);
                }}
              />
            ))}
          </div>
        )}

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          setPage={setPage}
        />

        {/* 模板选择弹窗 */}
        <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>从模板创建智能体</DialogTitle>
              <DialogDescription>
                选择一个预设模板快速搭建，可在创建后继续编辑。
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTemplateOpen(false);
                      toast.success(`已基于「${t.name}」创建草稿`, {
                        description: "请前往编排页继续配置。",
                      });
                    }}
                    className="group flex items-start gap-3 rounded-lg border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{t.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateOpen(false)}>
                取消
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 复制已有智能体 */}
        <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>复制已有智能体</DialogTitle>
              <DialogDescription>
                选择源智能体，系统将生成同配置的副本草稿。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">源智能体</Label>
              <Select value={cloneId} onValueChange={setCloneId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloneOpen(false)}>
                取消
              </Button>
              <Button
                disabled={!cloneId}
                onClick={() => {
                  handleClone(cloneId);
                  setCloneOpen(false);
                }}
              >
                生成副本
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 批量确认 */}
        <AlertDialog
          open={batchAction !== null}
          onOpenChange={(o) => !o && setBatchAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {batchAction === "delete"
                  ? "批量删除智能体"
                  : batchAction === "enable"
                    ? "批量启用智能体"
                    : "批量停用智能体"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                即将
                {batchAction === "delete"
                  ? "删除"
                  : batchAction === "enable"
                    ? "启用"
                    : "停用"}
                已选的 <b className="text-foreground">{selected.length}</b>{" "}
                个智能体
                {batchAction === "delete" ? "，操作不可恢复。" : "。"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={runBatch}
                className={cn(
                  batchAction === "delete" &&
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
              >
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 智能体编辑器（新建 / 编辑共用） */}
        <AgentEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          mode={editorMode}
          agent={editingAgent}
          onSave={handleEditorSave}
        />
      </div>
    </TooltipProvider>
  );
}

/* ============================================================ */
/* 子组件                                                       */
/* ============================================================ */


function AgentCard({
  agent,
  checked,
  onToggle,
  onEdit,
  onToggleStatus,
  onClone,
  onDelete,
}: {
  agent: Agent;
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICONS[agent.icon];
  const meta = STATUS_META[agent.status];
  const MetaIcon = meta.icon;
  const isDraft = agent.status === "draft";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
        checked && "border-primary ring-2 ring-primary/20",
      )}
    >
      {/* checkbox + 选中角标 */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={checked ? "取消选择" : "选择"}
        className={cn(
          "absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded border bg-background transition-all",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border opacity-0 group-hover:opacity-100",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </button>

      {/* 第一眼：身份识别 */}
      <div className="flex items-start gap-3 pl-7">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {agent.name}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {agent.model}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                meta.cls,
              )}
            >
              <MetaIcon className="h-3 w-3" />
              {meta.label}
            </span>
          </div>
        </div>
      </div>

      {/* 第二眼：功能描述 */}
      <p className="line-clamp-2 min-h-[40px] text-sm text-muted-foreground">
        {agent.description}
      </p>

      {/* 第三眼：能力 */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <CapBadge icon={Plug} value={agent.plugins} label="插件" tone="violet" />
        <CapBadge
          icon={BookOpen}
          value={agent.knowledge}
          label="知识库"
          tone="emerald"
        />
        <CapBadge
          icon={Workflow}
          value={agent.workflows}
          label="工作流"
          tone="sky"
        />
      </div>

      {/* 第四眼：表现 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span>
          本月{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {isDraft ? "—" : agent.callsThisMonth.toLocaleString()}
          </span>{" "}
          次
        </span>
        <span className="text-border">·</span>
        <span>
          成功率{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              isDraft
                ? "text-foreground"
                : agent.successRate >= 97
                  ? "text-success"
                  : "text-warning",
            )}
          >
            {isDraft ? "—" : `${agent.successRate}%`}
          </span>
        </span>
        <span className="text-border">·</span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {isDraft ? "—" : `$${agent.costThisMonth.toFixed(2)}`}
          </span>
        </span>
      </div>

      {/* 第五眼：操作 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          更新于 {agent.updatedAt}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
          {!isDraft && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={onToggleStatus}
            >
              {agent.status === "enabled" ? (
                <>
                  <PauseCircle className="h-3.5 w-3.5" />
                  停用
                </>
              ) : (
                <>
                  <Power className="h-3.5 w-3.5" />
                  启用
                </>
              )}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={onClone}>
                <Copy className="h-4 w-4" />
                复制
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function CapBadge({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  tone: "violet" | "emerald" | "sky";
}) {
  const cls =
    tone === "violet"
      ? "text-violet-600 dark:text-violet-400"
      : tone === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-sky-600 dark:text-sky-400";
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn("h-3.5 w-3.5", cls)} />
      <span className="tabular-nums font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}

/* ============================================================ */
/* 智能体编辑器对话框（新建 / 编辑共用）                         */
/* ============================================================ */

const DEFAULT_AGENT: Agent = {
  id: "",
  name: "",
  icon: "wand",
  type: "custom",
  description: "",
  model: "GPT-4o",
  status: "draft",
  plugins: 0,
  knowledge: 0,
  workflows: 0,
  callsThisMonth: 0,
  successRate: 0,
  costThisMonth: 0,
  updatedAt: "刚刚",
};

const ICON_OPTIONS: { value: keyof typeof TYPE_ICONS; label: string }[] = [
  { value: "wand", label: "通用" },
  { value: "pen", label: "内容" },
  { value: "chat", label: "互动" },
  { value: "lang", label: "翻译" },
  { value: "shield", label: "风控" },
  { value: "chart", label: "数据" },
  { value: "users", label: "客户" },
];

const PLUGIN_LIBRARY = [
  "Web 搜索",
  "图片生成",
  "代码解释器",
  "邮件发送",
  "日历安排",
  "数据查询",
];
const KNOWLEDGE_LIBRARY = [
  "品牌话术库",
  "FAQ 知识库",
  "竞品资料库",
  "合规词库",
  "运营 SOP",
];
const WORKFLOW_LIBRARY = [
  "私信意图路由",
  "评论批量生成",
  "数据周报",
  "敏感词复审",
];

function AgentEditorDialog({
  open,
  onOpenChange,
  mode,
  agent,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  agent: Agent | null;
  onSave: (a: Agent) => void;
}) {
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState<Agent>(DEFAULT_AGENT);
  const [systemPrompt, setSystemPrompt] = useState(
    "你是一位专业的智能助手。请使用清晰、简洁、专业的语气回答用户问题。",
  );
  const [openingMessage, setOpeningMessage] = useState(
    "你好，我可以为你做什么？",
  );
  const [temperature, setTemperature] = useState<number[]>([0.7]);
  const [maxTokens, setMaxTokens] = useState<number[]>([2048]);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [plugins, setPlugins] = useState<string[]>([]);
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testReply, setTestReply] = useState<string | null>(null);

  // 初始化
  useMemo(() => {
    if (!open) return;
    if (mode === "edit" && agent) {
      setForm(agent);
      setSystemPrompt(
        `你是「${agent.name}」。${agent.description || "请以专业语气服务用户。"}`,
      );
      setPlugins(PLUGIN_LIBRARY.slice(0, agent.plugins));
      setKnowledge(KNOWLEDGE_LIBRARY.slice(0, agent.knowledge));
      setWorkflows(WORKFLOW_LIBRARY.slice(0, agent.workflows));
    } else {
      setForm(DEFAULT_AGENT);
      setPlugins([]);
      setKnowledge([]);
      setWorkflows([]);
      setSystemPrompt(
        "你是一位专业的智能助手。请使用清晰、简洁、专业的语气回答用户问题。",
      );
    }
    setTab("basic");
    setTestReply(null);
    setTestInput("");
  }, [open, mode, agent]);

  const update = <K extends keyof Agent>(k: K, v: Agent[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    v: string,
  ) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const canSave = form.name.trim().length > 0;

  const handleSave = (asDraft: boolean) => {
    if (!canSave) {
      toast.error("请填写智能体名称");
      setTab("basic");
      return;
    }
    onSave({
      ...form,
      status: asDraft ? "draft" : form.status === "draft" ? "enabled" : form.status,
      plugins: plugins.length,
      knowledge: knowledge.length,
      workflows: workflows.length,
      updatedAt: "刚刚",
    });
  };

  const handleTest = () => {
    if (!testInput.trim()) {
      toast.error("请输入测试问题");
      return;
    }
    setTestReply(
      `（${form.model} · 温度 ${temperature[0]}）针对「${testInput}」，「${form.name || "新智能体"}」将基于当前系统提示词与 ${plugins.length} 个插件、${knowledge.length} 个知识库、${workflows.length} 个工作流给出专业答复。`,
    );
  };

  const Icon = TYPE_ICONS[form.icon];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                {mode === "create" ? "新建智能体" : `编辑智能体`}
                {mode === "edit" && form.name && (
                  <Badge variant="outline" className="font-normal">
                    {form.name}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                配置基础信息、模型参数、提示词及能力集成，构建专属业务智能体。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-6">
            <TabsList className="h-11 bg-transparent p-0">
              <TabsTrigger
                value="basic"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Bot className="h-4 w-4" />
                基础信息
              </TabsTrigger>
              <TabsTrigger
                value="prompt"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Sparkles className="h-4 w-4" />
                模型与提示词
              </TabsTrigger>
              <TabsTrigger
                value="capability"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Plug className="h-4 w-4" />
                能力配置
              </TabsTrigger>
              <TabsTrigger
                value="test"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Eye className="h-4 w-4" />
                调试预览
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-5">
              {/* —— 基础信息 —— */}
              <TabsContent value="basic" className="mt-0 space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>
                      智能体名称 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="如：跨境电商内容助手"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>智能体类型</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => update("type", v as AgentType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>初始状态</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => update("status", v as AgentStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="enabled">已启用</SelectItem>
                        <SelectItem value="disabled">已停用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>图标</Label>
                    <div className="flex flex-wrap gap-2">
                      {ICON_OPTIONS.map((opt) => {
                        const I = TYPE_ICONS[opt.value];
                        const active = form.icon === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => update("icon", opt.value)}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg border transition-all",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/50",
                            )}
                            title={opt.label}
                          >
                            <I className="h-5 w-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>功能描述</Label>
                    <Textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="用一句话描述这个智能体能为业务做什么"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* —— 模型与提示词 —— */}
              <TabsContent value="prompt" className="mt-0 space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5 md:col-span-1">
                    <Label>使用模型</Label>
                    <Select
                      value={form.model}
                      onValueChange={(v) => update("model", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_OPTIONS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Thermometer className="h-4 w-4" /> 温度
                      </span>
                      <span className="font-semibold tabular-nums">
                        {temperature[0].toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={temperature}
                      onValueChange={setTemperature}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      越低越稳定，越高越发散
                    </p>
                  </div>
                  <div className="space-y-2 rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Hash className="h-4 w-4" /> 最大 Tokens
                      </span>
                      <span className="font-semibold tabular-nums">
                        {maxTokens[0]}
                      </span>
                    </div>
                    <Slider
                      value={maxTokens}
                      onValueChange={setMaxTokens}
                      min={256}
                      max={8192}
                      step={128}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      单次回复最大长度
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>系统提示词（System Prompt）</Label>
                  <Textarea
                    rows={6}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="定义智能体角色、风格、约束条件…"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {systemPrompt.length} 字符
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>开场白</Label>
                  <Input
                    value={openingMessage}
                    onChange={(e) => setOpeningMessage(e.target.value)}
                    placeholder="对话开始时的首条回复"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">流式输出</div>
                      <div className="text-xs text-muted-foreground">
                        字符级逐字返回，体验更自然
                      </div>
                    </div>
                    <Switch
                      checked={streamEnabled}
                      onCheckedChange={setStreamEnabled}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">上下文记忆</div>
                      <div className="text-xs text-muted-foreground">
                        会话中保留最近 10 轮对话
                      </div>
                    </div>
                    <Switch
                      checked={memoryEnabled}
                      onCheckedChange={setMemoryEnabled}
                    />
                  </label>
                </div>
              </TabsContent>

              {/* —— 能力配置 —— */}
              <TabsContent value="capability" className="mt-0 space-y-5">
                <CapSection
                  title="插件"
                  icon={Plug}
                  tone="violet"
                  library={PLUGIN_LIBRARY}
                  selected={plugins}
                  onToggle={(v) => toggleItem(plugins, setPlugins, v)}
                />
                <CapSection
                  title="知识库"
                  icon={BookOpen}
                  tone="emerald"
                  library={KNOWLEDGE_LIBRARY}
                  selected={knowledge}
                  onToggle={(v) => toggleItem(knowledge, setKnowledge, v)}
                />
                <CapSection
                  title="工作流"
                  icon={Workflow}
                  tone="sky"
                  library={WORKFLOW_LIBRARY}
                  selected={workflows}
                  onToggle={(v) => toggleItem(workflows, setWorkflows, v)}
                />
              </TabsContent>

              {/* —— 调试预览 —— */}
              <TabsContent value="test" className="mt-0 space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                  当前配置：
                  <span className="ml-1 font-medium text-foreground">
                    {form.model}
                  </span>
                  · 温度{" "}
                  <span className="font-medium text-foreground">
                    {temperature[0].toFixed(2)}
                  </span>{" "}
                  · 插件{" "}
                  <span className="font-medium text-foreground">
                    {plugins.length}
                  </span>{" "}
                  · 知识库{" "}
                  <span className="font-medium text-foreground">
                    {knowledge.length}
                  </span>{" "}
                  · 工作流{" "}
                  <span className="font-medium text-foreground">
                    {workflows.length}
                  </span>
                </div>
                <div className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm">
                      {openingMessage}
                    </div>
                  </div>
                  {testReply && (
                    <>
                      <div className="flex items-start justify-end gap-3">
                        <div className="rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                          {testInput}
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          你
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm">
                          {testReply}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="输入一条测试问题，回车发送"
                    onKeyDown={(e) => e.key === "Enter" && handleTest()}
                  />
                  <Button onClick={handleTest}>
                    <Send className="h-4 w-4" />
                    发送
                  </Button>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="border-t bg-muted/30 px-6 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="outline" onClick={() => handleSave(true)}>
            <Save className="h-4 w-4" />
            保存草稿
          </Button>
          <Button onClick={() => handleSave(false)}>
            <CheckCircle2 className="h-4 w-4" />
            {mode === "create" ? "创建并启用" : "保存并应用"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CapSection({
  title,
  icon: Icon,
  tone,
  library,
  selected,
  onToggle,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "violet" | "emerald" | "sky";
  library: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const tint =
    tone === "violet"
      ? "text-violet-600 dark:text-violet-400"
      : tone === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-sky-600 dark:text-sky-400";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", tint)} />
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary" className="font-normal">
            已选 {selected.length}
          </Badge>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
            >
              {s}
              <button
                type="button"
                onClick={() => onToggle(s)}
                className="hover:text-destructive"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {library
          .filter((v) => !selected.includes(v))
          .map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(v)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <PlusIcon className="h-3 w-3" />
              {v}
            </button>
          ))}
        {library.every((v) => selected.includes(v)) && (
          <span className="text-xs text-muted-foreground">已选择全部可用项</span>
        )}
      </div>
    </div>
  );
}
