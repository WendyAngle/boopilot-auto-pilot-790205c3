import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  BookmarkPlus, Copy, Wand2, Search, RotateCcw, Filter,
  Bot, MousePointerClick, ListChecks, Sparkles,
  MoreHorizontal, Pencil, Trash2, FileText, CheckCircle2, PauseCircle,
  History, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  PLATFORMS, PLATFORM_CHIP, SUBTYPE_LABEL, SUBTYPE_CLS,
  TEMPLATE_ACTION_LABEL, TEMPLATE_ACTIONS,
  type Platform, type TaskSubType, type TaskTemplate, type TemplateAction, type TemplateStatus,
  useTasks, useTemplates, templatesActions,
  fmtNow, uid,
} from "@/lib/operations-store";
import { getUsableTags } from "@/lib/systemTags";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { UseTemplateDialog } from "@/components/use-template-dialog";


export const Route = createFileRoute("/_app/tasks/templates")({
  component: TaskTemplatesPage,
  head: () => ({ meta: [{ title: "任务模版 — BooPilot" }] }),
});

const SUBTYPE_ICON: Record<TaskSubType, LucideIcon> = { nurture: Bot, action: MousePointerClick };

const AGENT_OPTIONS = [
  "账号运营助手", "内容创作助手", "评论话术生成器", "账号列表 分配租户弹窗 增加 设置项：有效期至 xxxx（日期选择，选择到日，默认到所选日的24点）",
  "客户互动机器人", "节日营销文案生成", "风控分析专家",
];

function TaskTemplatesPage() {
  const tasks = useTasks();
  const templates = useTemplates();
  const allTags = getUsableTags();

  const [pKeyword, setPKeyword] = useState("");
  const [pSubtype, setPSubtype] = useState<"all" | TaskSubType>("all");
  const [pPlatform, setPPlatform] = useState<"all" | Platform>("all");
  const [pTag, setPTag] = useState<string>("all");

  const filteredTemplates = useMemo(() => {
    const kw = pKeyword.trim().toLowerCase();
    return templates.filter((t) => {
      if (kw && !t.name.toLowerCase().includes(kw) && !t.description.toLowerCase().includes(kw)) return false;
      if (pSubtype !== "all" && t.subtype !== pSubtype) return false;
      if (pPlatform !== "all" && !t.platforms.includes(pPlatform)) return false;
      if (pTag !== "all" && !(t.tags ?? []).includes(pTag)) return false;
      return true;
    });
  }, [templates, pKeyword, pSubtype, pPlatform, pTag]);

  const pageSize = 9;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, page]);

  const filtersActive = pKeyword.trim() !== "" || pSubtype !== "all" || pPlatform !== "all" || pTag !== "all";
  const resetFilters = () => { setPKeyword(""); setPSubtype("all"); setPPlatform("all"); setPTag("all"); setPage(1); };

  const stats = useMemo(() => ({
    total: templates.length,
    enabled: templates.filter((t) => (t.status ?? "enabled") === "enabled").length,
    draft: templates.filter((t) => t.status === "draft").length,
    monthUses: templates.reduce((s, t) => s + (t.monthlyUses ?? 0), 0),
  }), [templates]);


  // 编辑模版
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [form, setForm] = useState<{
    name: string; subtype: TaskSubType; platforms: Platform[]; total: number;
    description: string; agentName: string; actions: TemplateAction[]; tags: string[];
  }>({
    name: "", subtype: "action", platforms: ["Facebook"], total: 10,
    description: "", agentName: "", actions: [], tags: [],
  });
  const openEdit = (tpl: TaskTemplate) => {
    setEditing(tpl);
    setForm({
      name: tpl.name, subtype: tpl.subtype, platforms: tpl.platforms, total: tpl.total,
      description: tpl.description, agentName: tpl.agentName ?? "",
      actions: tpl.actions ?? [], tags: tpl.tags ?? [],
    });
    setDialogOpen(true);
  };
  const submit = () => {
    if (!form.name.trim()) { toast.error("请输入模版名称"); return; }
    if (form.platforms.length === 0) { toast.error("至少选择一个平台"); return; }
    if (editing) {
      templatesActions.update(editing.id, { ...form, name: form.name.trim() });
      toast.success("模版已更新");
    }
    setDialogOpen(false);
  };
  const togglePlatform = (p: Platform) => {
    setForm((f) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] }));
  };
  const toggleAction = (a: TemplateAction) => {
    setForm((f) => ({ ...f, actions: f.actions.includes(a) ? f.actions.filter((x) => x !== a) : [...f.actions, a] }));
  };
  const toggleEditTag = (name: string) => {
    setForm((f) => ({ ...f, tags: f.tags.includes(name) ? f.tags.filter((x) => x !== name) : [...f.tags, name] }));
  };

  // 使用模版弹窗
  const [useDlgTpl, setUseDlgTpl] = useState<TaskTemplate | null>(null);
  const [useDlgOpen, setUseDlgOpen] = useState(false);
  const handleUse = (tpl: TaskTemplate) => {
    setUseDlgTpl(tpl);
    setUseDlgOpen(true);
  };
  const handleCopy = (tpl: TaskTemplate) => {
    const copy: TaskTemplate = {
      ...tpl, id: uid("tpl"), name: `${tpl.name} 副本`, createdAt: fmtNow(),
      uses: 0, monthlyUses: 0, status: "draft",
    };
    templatesActions.add(copy);
    toast.success(`已复制模版「${tpl.name}」`);
  };

  const toggleStatus = (tpl: TaskTemplate) => {
    const cur = tpl.status ?? "enabled";
    const next: TemplateStatus = cur === "enabled" ? "draft" : "enabled";
    templatesActions.update(tpl.id, { status: next });
    toast.success(next === "enabled" ? "模版已启用" : "模版已停用");
  };

  // 查看使用记录
  const [usageTpl, setUsageTpl] = useState<TaskTemplate | null>(null);
  const usageRows = useMemo(
    () => (usageTpl ? tasks.filter((t) => t.fromTemplate === usageTpl.name) : []),
    [tasks, usageTpl],
  );

  // 任务数
  const tasksByTpl = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (t.fromTemplate) map.set(t.fromTemplate, (map.get(t.fromTemplate) ?? 0) + 1);
    });
    return map;
  }, [tasks]);

  

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">任务模版</h1>
            <Badge variant="outline" className="gap-1 border-violet-300/40 bg-violet-500/10 text-violet-600">
              <Sparkles className="h-3 w-3" />可复用
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            统一沉淀任务的执行策略与参数配置，点击模版「使用」即可基于模版快速创建任务。
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="模版总数" value={stats.total} icon={BookmarkPlus} tone="violet" />
          <StatCard title="已启用" value={stats.enabled} icon={CheckCircle2} tone="success" />
          <StatCard title="草稿" value={stats.draft} icon={FileText} tone="muted" />
          <StatCard title="本月使用" value={stats.monthUses} icon={ListChecks} tone="primary" />
        </div>

        {/* 筛选区域 */}
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">搜索</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={pKeyword}
                  onChange={(e) => setPKeyword(e.target.value)}
                  placeholder="模版名称 / 描述"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">平台</Label>
              <Select value={pPlatform} onValueChange={(v) => setPPlatform(v as typeof pPlatform)}>
                <SelectTrigger><SelectValue placeholder="全部平台" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">标签</Label>
              <Select value={pTag} onValueChange={setPTag}>
                <SelectTrigger><SelectValue placeholder="全部标签" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部标签</SelectItem>
                  {allTags.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
              <Button onClick={() => setPage(1)}>
                <Search className="h-4 w-4" />
                搜索
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
            <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Filter className="h-3 w-3" />共 <span className="font-semibold text-foreground tabular-nums">{filteredTemplates.length}</span> 条
              {filtersActive && <span>/ {templates.length}</span>}
            </div>
          </div>


          {templates.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              暂无任务模版。

            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              没有符合筛选条件的任务模版
              <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={resetFilters}>清除筛选</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {paged.map((tpl) => {
                const TIcon = SUBTYPE_ICON[tpl.subtype];
                const status = tpl.status ?? "enabled";
                const enabled = status === "enabled";
                const actions = tpl.actions ?? [];
                const taskCount = tasksByTpl.get(tpl.name) ?? 0;
                return (
                  <div
                    key={tpl.id}
                    className="group relative flex flex-col gap-3 rounded-xl border bg-background p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <button onClick={() => openEdit(tpl)} className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <BookmarkPlus className="h-4 w-4 shrink-0 text-violet-600" />
                            <h3 className="truncate text-sm font-semibold hover:text-primary">{tpl.name}</h3>
                          </div>
                          <div className="mt-1 min-h-[3.5rem]">
                            <p className="line-clamp-3 text-xs text-muted-foreground">
                              {actions.length > 0 && (
                                <span className="text-foreground/80">
                                  【{actions.map((a) => TEMPLATE_ACTION_LABEL[a]).join("·")}】
                                </span>
                              )}
                              {tpl.description}
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {tpl.platforms.map((p) => (
                        <Badge key={p} variant="outline" className={cn("text-[10px] font-normal", PLATFORM_CHIP[p])}>{p}</Badge>
                      ))}
                    </div>




                    <div className="mt-auto flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>已创建 <span className="font-semibold tabular-nums text-foreground">{taskCount}</span> 个任务</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => handleUse(tpl)}>
                          <Wand2 className="h-3.5 w-3.5" />使用
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => handleCopy(tpl)}>
                          <Copy className="h-3.5 w-3.5" />复制
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => toggleStatus(tpl)}>
                              {enabled
                                ? <><PauseCircle className="h-3.5 w-3.5" />停用</>
                                : <><CheckCircle2 className="h-3.5 w-3.5" />启用</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setUsageTpl(tpl)}>
                              <History className="h-3.5 w-3.5" />查看使用记录
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { templatesActions.remove(tpl.id); toast.success("模版已删除"); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );

              })}
            </div>
          )}

          <PaginationBar page={page} totalPages={totalPages} total={filteredTemplates.length} setPage={setPage} />
        </div>
      </div>

      {/* 编辑模版 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-violet-600" />编辑任务模版
            </DialogTitle>
            <DialogDescription>配置模版的默认任务参数、关联智能体与标签。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>模版名称 <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例如：节日营销触达" />
              </div>
              <div className="space-y-1.5">
                <Label>关联智能体</Label>
                <Select value={form.agentName || "__none"} onValueChange={(v) => setForm((f) => ({ ...f, agentName: v === "__none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="选择智能体" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">未关联</SelectItem>
                    {AGENT_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>任务类型</Label>
                <Select value={form.subtype} onValueChange={(v) => setForm((f) => ({ ...f, subtype: v as TaskSubType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="action">单次触达</SelectItem>
                    <SelectItem value="nurture">周期性</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>默认数量</Label>
                <Input type="number" min={1} value={form.total}
                  onChange={(e) => setForm((f) => ({ ...f, total: Math.max(1, parseInt(e.target.value || "1", 10)) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>覆盖平台 <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const active = form.platforms.includes(p);
                  return (
                    <button type="button" key={p} onClick={() => togglePlatform(p)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active ? PLATFORM_CHIP[p] : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary",
                      )}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>操作类型</Label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_ACTIONS.map((a) => {
                  const active = form.actions.includes(a);
                  return (
                    <button type="button" key={a} onClick={() => toggleAction(a)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary",
                      )}>
                      {TEMPLATE_ACTION_LABEL[a]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>标签</Label>
              <TagMultiSelect
                value={form.tags}
                onChange={(tags) => setForm((f) => ({ ...f, tags }))}
                placeholder="选择或新增标签"
              />
            </div>
            <div className="space-y-1.5">
              <Label>模版描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="描述该模版的目标场景与执行内容…" className="min-h-[72px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={submit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* 使用记录 */}
      <Dialog open={!!usageTpl} onOpenChange={(o) => !o && setUsageTpl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />使用记录
            </DialogTitle>
            <DialogDescription>
              模版「{usageTpl?.name}」累计创建了 {usageRows.length} 个任务。
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {usageRows.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                暂无使用记录
              </div>
            ) : (
              <div className="space-y-2">
                {usageRows.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{t.name}</div>
                      <div className="mt-0.5 text-muted-foreground">
                        {t.createdAt} · {t.createdBy} · 平台 {t.platforms.join("、")}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px] font-normal">
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageTpl(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UseTemplateDialog
        template={useDlgTpl}
        open={useDlgOpen}
        onOpenChange={(o) => { setUseDlgOpen(o); if (!o) setUseDlgTpl(null); }}
        onViewDetail={(tpl) => { setUseDlgOpen(false); openEdit(tpl); }}
      />
    </TooltipProvider>
  );
}

