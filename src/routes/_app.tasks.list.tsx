import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Bot, Sparkles, ListChecks, CheckCircle2, XCircle, Clock3,
  PlayCircle, PauseCircle, Trash2, BookmarkPlus, StopCircle,
  Search, RotateCcw, Filter, Eye, ScrollText, BarChart3, Pencil, MoreHorizontal, Info,
  MessageCircle, UserCheck, UserX, type LucideIcon,
} from "lucide-react";
import { UseTemplateDialog } from "@/components/use-template-dialog";
import { ensureActivityTasksSeeded, useActivitySubtasks, ACTIVITY_SOURCE_LABEL } from "@/lib/activity-tasks";
import { PLATFORM_META } from "@/lib/managed-account-mock";
import { User2, AtSign, ArrowRight } from "lucide-react";

ensureActivityTasksSeeded();

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  PLATFORMS, PLATFORM_CHIP, STATUS_LABEL, STATUS_CLS,
  EXEC_STATE_LABEL, EXEC_STATE_CLS, getExecState, isForeverTask,
  TASK_CATEGORY_LABEL, TASK_CATEGORY_CLS, getTaskCategory,
  type Platform, type TaskStatus, type ExecState, type TaskRow, type TaskTemplate, type TaskCategory,
  useTasks, tasksActions, templatesActions,
  executeTask, abortTask, fmtNow, uid,
} from "@/lib/operations-store";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/tasks/list")({
  component: TaskListPage,
  head: () => ({ meta: [{ title: "任务列表 — BooPilot" }] }),
});

const CATEGORY_ICON: Record<TaskCategory, LucideIcon> = {
  nurture: Bot,
  "friend-approve": UserCheck,
  "friend-reject": UserX,
  dm: MessageCircle,
};
const STATUS_ICON: Record<TaskStatus, LucideIcon> = {
  pending: Clock3, running: PlayCircle, success: CheckCircle2, failed: XCircle, partial: PauseCircle,
};

function TaskListPage() {
  const tasks = useTasks();
  const navigate = useNavigate();

  const [statsTask, setStatsTask] = useState<TaskRow | null>(null);
  const [saveTplFor, setSaveTplFor] = useState<TaskRow | null>(null);
  const [saveTplName, setSaveTplName] = useState("");
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [detailTask, setDetailTask] = useState<TaskRow | null>(null);
  const [abortConfirm, setAbortConfirm] = useState<TaskRow | null>(null);

  const openDetail = (id: string) => navigate({ to: "/tasks/$taskId", params: { taskId: id } });
  const openLogs = (id: string) => navigate({ to: "/tasks/$taskId/logs", params: { taskId: id } });



  const stats = useMemo(() => ({
    total: tasks.length,
    running: tasks.filter((t) => t.status === "running").length,
    success: tasks.filter((t) => t.status === "success").length,
    failed: tasks.filter((t) => t.status === "failed" || t.status === "partial").length,
  }), [tasks]);

  const [tKeyword, setTKeyword] = useState("");
  const [tCategory, setTCategory] = useState<"all" | TaskCategory>("all");
  const [tPlatform, setTPlatform] = useState<"all" | Platform>("all");
  const [tResult, setTResult] = useState<"all" | "success" | "failed" | "partial" | "none">("all");
  const [tExec, setTExec] = useState<"all" | ExecState>("all");

  const filteredTasks = useMemo(() => {
    const kw = tKeyword.trim().toLowerCase();
    return tasks.filter((t) => {
      if (kw && !t.name.toLowerCase().includes(kw) && !t.id.toLowerCase().includes(kw)) return false;
      if (tCategory !== "all" && getTaskCategory(t) !== tCategory) return false;
      if (tPlatform !== "all" && !t.platforms.includes(tPlatform)) return false;
      if (tResult !== "all") {
        const showsDash = t.aborted || t.status === "pending" || t.status === "running";
        if (tResult === "none") {
          if (!showsDash) return false;
        } else {
          if (showsDash || t.status !== tResult) return false;
        }
      }
      if (tExec !== "all" && getExecState(t) !== tExec) return false;
      return true;
    });
  }, [tasks, tKeyword, tCategory, tPlatform, tResult, tExec]);

  const pageSize = 10;
  const [taskPage, setTaskPage] = useState(1);
  const taskTotalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pagedFilteredTasks = useMemo(() => {
    const start = (taskPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, taskPage]);

  const tasksFiltersActive = tKeyword.trim() !== "" || tCategory !== "all" || tPlatform !== "all" || tResult !== "all" || tExec !== "all";

  const resetTaskFilters = () => {
    setTKeyword(""); setTCategory("all"); setTPlatform("all"); setTResult("all"); setTExec("all"); setTaskPage(1);
  };

  const handleManualSaveTemplate = () => {
    if (!saveTplFor) return;
    if (!saveTplName.trim()) { toast.error("请输入模版名称"); return; }
    const tpl: TaskTemplate = {
      id: uid("tpl"), name: saveTplName.trim(), subtype: saveTplFor.subtype, platforms: saveTplFor.platforms,
      total: saveTplFor.total, description: saveTplFor.description, createdAt: fmtNow(), uses: 0,
    };
    templatesActions.add(tpl);
    toast.success(`已保存模版「${tpl.name}」`);
    setSaveTplFor(null); setSaveTplName("");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">任务列表</h1>
            <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="h-3 w-3" />智能体驱动
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            查看与管理所有运营任务的执行状态，如需新建任务请前往「任务模版」选择模版「使用」快速创建。
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="任务总数" value={stats.total} icon={ListChecks} tone="muted" />
          <StatCard title="执行中" value={stats.running} icon={PlayCircle} tone="primary" />
          <StatCard title="执行成功" value={stats.success} icon={CheckCircle2} tone="success" />
          <StatCard title="执行失败/部分成功" value={stats.failed} icon={XCircle} tone="destructive" />
        </div>

        <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
            <div className="relative w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={tKeyword} onChange={(e) => setTKeyword(e.target.value)} placeholder="搜索任务名称 / ID" className="h-8 pl-8 text-xs" />
            </div>
            <Select value={tCategory} onValueChange={(v) => setTCategory(v as typeof tCategory)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="任务类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务类型</SelectItem>
                {(Object.keys(TASK_CATEGORY_LABEL) as TaskCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>{TASK_CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tPlatform} onValueChange={(v) => setTPlatform(v as typeof tPlatform)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="平台" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tResult} onValueChange={(v) => setTResult(v as typeof tResult)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="任务结果" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务结果</SelectItem>
                
                <SelectItem value="success">执行成功</SelectItem>
                <SelectItem value="failed">执行失败</SelectItem>
                <SelectItem value="partial">部分成功</SelectItem>
                <SelectItem value="none">无结果（-）</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tExec} onValueChange={(v) => setTExec(v as typeof tExec)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="执行状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部执行状态</SelectItem>
                {(Object.keys(EXEC_STATE_LABEL) as ExecState[]).map((s) => (
                  <SelectItem key={s} value={s}>{EXEC_STATE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tasksFiltersActive && (
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground" onClick={resetTaskFilters}>
                <RotateCcw className="h-3.5 w-3.5" />重置
              </Button>
            )}
            <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Filter className="h-3 w-3" />共 <span className="font-semibold text-foreground tabular-nums">{filteredTasks.length}</span> 条
              {tasksFiltersActive && <span>/ {tasks.length}</span>}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="min-w-[260px]">任务名称</TableHead>
                  <TableHead className="w-[110px]">类型</TableHead>
                  <TableHead className="min-w-[180px]">平台</TableHead>
                  <TableHead className="w-[110px]">任务结果</TableHead>
                  <TableHead className="w-[110px]">执行状态</TableHead>
                  <TableHead className="w-[160px]">创建时间</TableHead>
                  <TableHead className="w-[380px] text-center pr-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-sm text-muted-foreground">
                      {tasks.length === 0
                        ? "还没有运营任务，前往「任务模版」选择模版「使用」即可创建。"
                        : (
                          <span className="inline-flex items-center gap-2">
                            没有符合筛选条件的任务
                            <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={resetTaskFilters}>清除筛选</Button>
                          </span>
                        )}
                    </TableCell>
                  </TableRow>
                ) : pagedFilteredTasks.map((t) => {
                  const SIcon = STATUS_ICON[t.status];
                  const category = getTaskCategory(t);
                  const TIcon = CATEGORY_ICON[category];

                  return (
                    <TableRow key={t.id} className="border-b-border/40">
                      <TableCell>
                        <button onClick={() => openDetail(t.id)} className="group block text-left">
                          <div className="font-medium text-sm text-foreground group-hover:text-primary">{t.name}</div>
                        </button>

                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 text-xs font-normal", TASK_CATEGORY_CLS[category])}>
                          <TIcon className="h-3 w-3" />{TASK_CATEGORY_LABEL[category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.platforms.map((p) => (
                            <Badge key={p} variant="outline" className={cn("text-[10px] font-normal", PLATFORM_CHIP[p])}>{p}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.aborted || t.status === "pending" || t.status === "running" ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          <Badge variant="outline" className={cn("gap-1 text-xs font-normal", STATUS_CLS[t.status])}>
                            <SIcon className="h-3 w-3" />{STATUS_LABEL[t.status]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const es = getExecState(t);
                          return (
                            <Badge variant="outline" className={cn("text-xs font-normal", EXEC_STATE_CLS[es])}>
                              {EXEC_STATE_LABEL[es]}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-[11px] tabular-nums text-muted-foreground">{t.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
                            onClick={() => openDetail(t.id)}>
                            <Eye className="h-3.5 w-3.5" />查看子任务
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
                            onClick={() => setStatsTask(t)}>
                            <BarChart3 className="h-3.5 w-3.5" />统计
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />更多
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => setDetailTask(t)}>
                                <Info className="h-3.5 w-3.5" />查看详情
                              </DropdownMenuItem>
                              {t.status === "pending" && !t.aborted && (
                                <DropdownMenuItem onClick={() => executeTask(t.id)}>
                                  <PlayCircle className="h-3.5 w-3.5" />执行
                                </DropdownMenuItem>
                              )}
                              {!t.aborted && (t.status === "pending" || t.status === "running") && (
                                isForeverTask(t) ? (
                                  <DropdownMenuItem
                                    onClick={() => setAbortConfirm(t)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <StopCircle className="h-3.5 w-3.5" />手动终止
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => { abortTask(t.id); toast.success("任务已终止"); }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <StopCircle className="h-3.5 w-3.5" />终止
                                  </DropdownMenuItem>
                                )
                              )}
                              <DropdownMenuItem
                                disabled={t.status !== "pending" || !!t.aborted}
                                onClick={() => setEditingTask(t)}
                              >
                                <Pencil className="h-3.5 w-3.5" />编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openLogs(t.id)}>
                                <ScrollText className="h-3.5 w-3.5" />日志
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { tasksActions.remove(t.id); toast.success("任务已删除"); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>


                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationBar page={taskPage} totalPages={taskTotalPages} total={filteredTasks.length} setPage={setTaskPage} />
        </div>
      </div>




      {/* 存为模版弹窗 */}
      <Dialog open={!!saveTplFor} onOpenChange={(o) => { if (!o) { setSaveTplFor(null); setSaveTplName(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-violet-600" />保存为任务模版
            </DialogTitle>
            <DialogDescription>
              基于任务「{saveTplFor?.name}」创建模版，后续可在「任务模版」中复用。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">模版名称 <span className="text-destructive">*</span></Label>
              <Input id="tpl-name" value={saveTplName} onChange={(e) => setSaveTplName(e.target.value)} placeholder="例如：节日营销触达" />
            </div>
            {saveTplFor && (
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="text-muted-foreground">将保留以下配置：</div>
                <div>类型：{TASK_CATEGORY_LABEL[getTaskCategory(saveTplFor)]}</div>
                <div>平台：{saveTplFor.platforms.join(" / ")}</div>
                <div>数量：{saveTplFor.total}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSaveTplFor(null); setSaveTplName(""); }}>取消</Button>
            <Button onClick={handleManualSaveTemplate}>保存模版</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* 查看统计数据弹窗 */}
      <Dialog open={!!statsTask} onOpenChange={(o) => !o && setStatsTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />统计数据
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{statsTask?.id}</DialogDescription>
          </DialogHeader>
          {statsTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <StatBox label="总计" value={statsTask.total} />
                <StatBox label="执行成功" value={statsTask.done} tone="success" />
                <StatBox label="执行失败" value={statsTask.failed} tone="danger" />
                <StatBox label="成功率" value={`${statsTask.total ? Math.round((statsTask.done / statsTask.total) * 100) : 0}%`} />
              </div>
              <Tabs defaultValue="platform" className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">分布维度</div>
                  <TabsList className="h-8">
                    <TabsTrigger value="platform" className="text-xs">按平台分布</TabsTrigger>
                    <TabsTrigger value="reach" className="text-xs">按账号分布</TabsTrigger>
                    <TabsTrigger value="action" className="text-xs">按操作分布</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="platform" className="mt-0">
                  <DistList rows={buildDist(statsTask, "platform")} />
                </TabsContent>
                <TabsContent value="reach" className="mt-0">
                  <DistList rows={buildDist(statsTask, "reach")} />
                </TabsContent>
                <TabsContent value="action" className="mt-0">
                  <DistList rows={buildDist(statsTask, "action")} />
                </TabsContent>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />执行成功</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-destructive" />执行失败</span>
                </div>
              </Tabs>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Field label="平均耗时" value="2.4s / 账号" />
                <Field label="峰值并发" value="12" />
                <Field label="创建时间" value={statsTask.createdAt} />
                <Field label="结束时间" value={statsTask.endTime ?? "—"} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsTask(null)}>关闭</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <UseTemplateDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(o) => { if (!o) setEditingTask(null); }}
      />

      <TaskDetailDialog task={detailTask} onClose={() => setDetailTask(null)} />

      <AlertDialog open={!!abortConfirm} onOpenChange={(o) => !o && setAbortConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-destructive" />确认手动终止任务？
            </AlertDialogTitle>
            <AlertDialogDescription>
              任务「{abortConfirm?.name}」配置为「持续执行直到手动停止」，当前仍在运行。
              终止后将不再产出新的子任务结果，且无法恢复，请谨慎确认。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (abortConfirm) {
                  abortTask(abortConfirm.id);
                  toast.success(`任务「${abortConfirm.name}」已手动终止`);
                }
                setAbortConfirm(null);
              }}
            >
              确认终止
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>

  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

const EXEC_MODE_LABEL: Record<string, string> = { now: "立即执行", scheduled: "指定时间执行", recurring: "周期执行" };
const TARGET_MODE_LABEL: Record<string, string> = { keyword: "匹配关键词", specified: "指定目标", random: "系统随机选择目标" };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground break-words">{children}</div>
    </div>
  );
}

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="mt-3 mb-2 flex items-center gap-2">
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
        {index}
      </span>
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function TaskDetailDialog({ task, onClose }: { task: TaskRow | null; onClose: () => void }) {
  if (!task) {
    return (
      <Dialog open={false} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }
  const d = (task.draft ?? {}) as Record<string, unknown>;
  const has = Object.keys(d).length > 0;
  const get = <T,>(k: string, fb: T): T => (d[k] === undefined || d[k] === null ? fb : (d[k] as T));
  const arr = (k: string): string[] => {
    const v = d[k];
    return Array.isArray(v) ? (v as string[]) : [];
  };
  const dash = (v: string | number | undefined | null) =>
    v === undefined || v === null || v === "" ? "—" : String(v);
  const listOrDash = (xs: string[]) => (xs.length ? xs.join("、") : "—");

  const isNurture = task.subtype === "nurture";
  const execMode = get<string>("execMode", isNurture ? "recurring" : "now");
  const targetMode = get<string>("targetMode", "keyword");

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />任务详情 - {task.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          {/* 1/3 任务基本信息 */}
          <SectionHeader index="1/3" title="任务基本信息" />
          <DetailRow label="任务名称">{dash(get<string>("name", task.name))}</DetailRow>

          {/* 2/3 执行目标 */}
          <SectionHeader index="2/3" title="执行目标" />
          {isNurture && (
            <DetailRow label="目标">
              {TARGET_MODE_LABEL[targetMode] ?? "—"}
              {targetMode === "keyword" && (
                <span className="ml-2 text-muted-foreground">「{get<string>("targetKeyword", "") || "—"}」</span>
              )}
              {targetMode === "specified" && (
                <span className="ml-2 text-muted-foreground">「{get<string>("targetUrl", "") || "—"}」</span>
              )}
            </DetailRow>
          )}
          <DetailRow label="指定账号 · 标签">{listOrDash(arr("reachTags"))}</DetailRow>
          <DetailRow label="指定账号 · 特定账号">
            {arr("reachAccounts").length ? `已选 ${arr("reachAccounts").length} 个账号` : "—"}
          </DetailRow>

          {!isNurture && (
            <>
              <DetailRow label="指定贴文 · 标签">{listOrDash(arr("postTags"))}</DetailRow>
              <DetailRow label="指定贴文 · 特定贴文">
                {arr("postIds").length ? `已选 ${arr("postIds").length} 篇贴文` : "—"}
              </DetailRow>
            </>
          )}

          {/* 3/3 执行方式 */}
          <SectionHeader index="3/3" title="执行方式" />
          <DetailRow label="执行方式">{EXEC_MODE_LABEL[execMode] ?? "—"}</DetailRow>
          {execMode === "scheduled" && (
            <DetailRow label="计划时间">
              {`${get<string>("scheduledDate", "—")} ${get<string>("scheduledTime", "")}`}
            </DetailRow>
          )}
          {execMode === "recurring" && (
            <>
              <DetailRow label="开始时间">
                {`${get<string>("recurStartDate", "—")} ${get<string>("recurStartTime", "")}`}
              </DetailRow>
              <DetailRow label="执行周期">每日</DetailRow>
              <DetailRow label="时段">
                {`${get<string>("recurTimeStart", "—")} — ${get<string>("recurTimeEnd", "—")}`}
              </DetailRow>
              <DetailRow label="单次时长">
                {`${get<number>("sessionDuration", 0)} ${get<string>("sessionDurationUnit", "min") === "hour" ? "小时" : "分钟"}`}
              </DetailRow>
              <DetailRow label="持续">
                {get<boolean>("recurForever", false)
                  ? "持续执行直到手动停止"
                  : `${get<number>("recurDuration", 0)} 天`}
              </DetailRow>
            </>
          )}

          {!has && (
            <div className="mt-3 rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
              该任务未保存编辑项快照，仅展示基础信息。
            </div>
          )}
        </div>
        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1 text-xl font-semibold tabular-nums",
        tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : "text-foreground",
      )}>{value}</div>
    </div>
  );
}

type DistRow = { label: string; success: number; failed: number };

function buildDist(t: TaskRow, dim: "platform" | "reach" | "action"): DistRow[] {
  // Deterministic pseudo-random based on task id + dim to avoid SSR hydration drift
  const seed = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  const rng = (key: string) => {
    const h = seed(`${t.id}|${dim}|${key}`);
    return (h % 1000) / 1000;
  };

  let labels: string[] = [];
  if (dim === "platform") labels = [...t.platforms];
  else if (dim === "action") labels = ["点赞", "评论", "发帖", "关注", "转发", "私信"];
  else labels = ["主账号", "矩阵号", "合作号", "外联号"];

  const n = labels.length || 1;
  // Distribute totals across buckets with slight variation while preserving sums.
  const weights = labels.map((l) => 0.6 + rng(l) * 0.8);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const rows: DistRow[] = labels.map((l, i) => {
    const share = weights[i] / wSum;
    const success = Math.round(t.done * share);
    const failed = Math.round(t.failed * share);
    return { label: l, success, failed };
  });
  // Reconcile rounding drift to match totals exactly
  const adjust = (key: "success" | "failed", target: number) => {
    const cur = rows.reduce((a, r) => a + r[key], 0);
    let diff = target - cur;
    let i = 0;
    while (diff !== 0 && rows.length > 0) {
      const r = rows[i % rows.length];
      if (diff > 0) { r[key] += 1; diff -= 1; }
      else if (r[key] > 0) { r[key] -= 1; diff += 1; }
      i += 1;
      if (i > n * 10) break;
    }
  };
  adjust("success", t.done);
  adjust("failed", t.failed);
  return rows;
}

function DistList({ rows }: { rows: DistRow[] }) {
  if (rows.length === 0) {
    return <div className="py-6 text-center text-xs text-muted-foreground">暂无数据</div>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const total = r.success + r.failed;
        const sPct = total ? (r.success / total) * 100 : 0;
        const fPct = total ? (r.failed / total) * 100 : 0;
        return (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate" title={r.label}>{r.label}</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded bg-muted">
              <div className="h-full bg-emerald-500" style={{ width: `${sPct}%` }} />
              <div className="h-full bg-destructive" style={{ width: `${fPct}%` }} />
            </div>
            <span className="w-44 shrink-0 text-right tabular-nums text-muted-foreground">
              <span className="text-emerald-600">{r.success}</span>
              <span className="mx-0.5">/</span>
              <span className="text-destructive">{r.failed}</span>
              <span className="mx-0.5">/</span>
              <span>{total}</span>
              <span className="ml-1 text-[10px]">
                ({total ? Math.round(sPct) : 0}% · {total ? Math.round(fPct) : 0}%)
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

type LogLine = { ts: string; level: "INFO" | "WARN" | "ERROR"; msg: string };

function buildMockLogs(t: TaskRow): LogLine[] {
  const base = t.createdAt.slice(11) || "10:00:00";
  const [hh, mm, ss] = base.split(":").map(Number);
  const at = (offset: number) => {
    const total = (hh * 3600 + mm * 60 + ss + offset) % 86400;
    const H = String(Math.floor(total / 3600)).padStart(2, "0");
    const M = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const S = String(total % 60).padStart(2, "0");
    return `${H}:${M}:${S}`;
  };
  const lines: LogLine[] = [
    { ts: at(0), level: "INFO", msg: `任务「${t.name}」已创建，计划执行 ${t.total} 个账号` },
    { ts: at(1), level: "INFO", msg: `平台范围：${t.platforms.join(", ")}` },
    { ts: at(2), level: "INFO", msg: "调度器已分配执行节点 boo-node-shenzhen-01" },
    { ts: at(4), level: "INFO", msg: "镜像实例预热完成，开始批次 #1" },
  ];
  for (let i = 0; i < Math.min(6, t.done); i++) {
    lines.push({ ts: at(6 + i * 2), level: "INFO", msg: `账号 acc-${1000 + i} 执行成功` });
  }
  for (let i = 0; i < Math.min(3, t.failed); i++) {
    lines.push({ ts: at(20 + i * 3), level: "ERROR", msg: `账号 acc-${2000 + i} 执行失败：登录态过期` });
  }
  if (t.status === "running") {
    lines.push({ ts: at(40), level: "INFO", msg: "任务执行中…" });
  } else if (t.status === "success") {
    lines.push({ ts: at(45), level: "INFO", msg: "任务执行完成" });
  } else if (t.status === "failed") {
    lines.push({ ts: at(45), level: "ERROR", msg: "任务执行失败，已停止" });
  }
  return lines;
}

