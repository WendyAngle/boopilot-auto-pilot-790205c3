import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Search, RotateCcw, Filter, ScrollText, StopCircle,
  ListChecks, CheckCircle2, PlayCircle, Clock3, FileText, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  PLATFORM_CHIP, SUBTYPE_LABEL, SUBTYPE_CLS,
  EXEC_STATE_LABEL, EXEC_STATE_CLS,
  type Platform, type ExecState, useTasks, type TaskRow,
} from "@/lib/operations-store";
import { useActivitySubtasks, ensureActivityTasksSeeded } from "@/lib/activity-tasks";
import { USERNAMES } from "@/lib/managed-account-mock";

ensureActivityTasksSeeded();

export const Route = createFileRoute("/_app/tasks/$taskId")({
  component: TaskDetailPage,
  head: () => ({ meta: [{ title: "任务详情 — BooPilot" }] }),
});

/* ============================================================ */
/* 子任务类型与生成                                              */
/* ============================================================ */

type SubStatus = "success" | "partial" | "failed" | "pending" | "running" | "aborted";

const SUB_STATUS_LABEL: Record<SubStatus, string> = {
  pending: "待执行",
  running: "执行中",
  success: "执行成功",
  partial: "部分成功",
  failed: "执行失败",
  aborted: "手动终止",
};
const SUB_STATUS_CLS: Record<SubStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  running: "bg-primary/10 text-primary border-primary/30",
  success: "bg-success/10 text-success border-success/30",
  partial: "bg-warning/10 text-warning border-warning/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  aborted: "bg-destructive/10 text-destructive border-destructive/30",
};

function subExecState(s: SubStatus): ExecState {
  if (s === "aborted") return "aborted";
  if (s === "running") return "running";
  if (s === "pending") return "pending";
  return "completed";
}


const TARGETS = ["新客户", "老客户", "高意向", "潜在客户", "流失召回"] as const;


type SubTask = {
  id: string;
  reachAccount: string;
  action: string;
  target: string;
  platform: Platform;
  status: SubStatus;
  estimated: string;
  actual: string;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
function fmtDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function parseDateTime(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date();
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildSubTasks(t: TaskRow): SubTask[] {
  const list: SubTask[] = [];
  const total = t.total;
  const done = t.done;
  const failed = t.failed;
  const running = t.status === "running" ? Math.min(2, total - done - failed) : 0;
  const finished = done + failed;
  const baseDate = parseDateTime(t.createdAt);
  for (let i = 0; i < total; i++) {
    const h = hash(`${t.id}|${i}`);
    const platform = t.platforms[h % t.platforms.length];
    // 周期性任务 → 培育；单次触达任务 → 触达
    const action = t.subtype === "nurture" ? "培育" : "触达";
    const target = TARGETS[(h >> 6) % TARGETS.length];
    const base = USERNAMES[i % USERNAMES.length];
    const round = Math.floor(i / USERNAMES.length);
    const reachAccount = round === 0 ? base : `${base}-${round + 1}`;
    let status: SubStatus;
    if (i < done) status = "success";
    else if (i < done + failed) status = "failed";
    else if (i < finished + running) status = "running";
    else status = "pending";
    const estOffset = i * 60 + ((h >>> 12) % 30); // 错峰几秒
    const actVar = ((h >>> 18) % 121) - 40;
    const estDate = new Date(baseDate.getTime() + estOffset * 1000);
    const actDate = new Date(estDate.getTime() + actVar * 1000);
    const estimated = fmtDateTime(estDate);
    const actual = (status === "pending" || status === "running") ? "-" : fmtDateTime(actDate);
    list.push({
      id: `${t.id}-${String(i + 1).padStart(3, "0")}`,
      reachAccount,
      action,
      target,
      platform,
      status,
      estimated,
      actual,
    });
  }
  return list;
}

function buildSubLogs(sub: SubTask): { ts: string; level: "INFO" | "WARN" | "ERROR"; msg: string }[] {
  const base = ["10:12:08", "10:12:09", "10:12:11", "10:12:14"];
  if (sub.status === "pending") {
    return [{ ts: base[0], level: "INFO", msg: `子任务 ${sub.id} 已排队等待调度` }];
  }
  if (sub.status === "running") {
    return [
      { ts: base[0], level: "INFO", msg: `子任务 ${sub.id} 已分配执行节点` },
      { ts: base[1], level: "INFO", msg: `${sub.platform} · ${sub.reachAccount} 正在执行「${sub.action}」` },
    ];
  }
  if (sub.status === "failed") {
    return [
      { ts: base[0], level: "INFO", msg: `子任务 ${sub.id} 已分配执行节点` },
      { ts: base[1], level: "INFO", msg: `${sub.platform} · ${sub.reachAccount} 开始执行「${sub.action}」（目标：${sub.target}）` },
      { ts: base[2], level: "WARN", msg: `登录态校验失败` },
      { ts: base[3], level: "ERROR", msg: `执行失败：账号风控/登录态过期` },
    ];
  }
  return [
    { ts: base[0], level: "INFO", msg: `子任务 ${sub.id} 已分配执行节点` },
    { ts: base[1], level: "INFO", msg: `${sub.platform} · ${sub.reachAccount} 开始执行「${sub.action}」（目标：${sub.target}）` },
    { ts: base[2], level: "INFO", msg: `登录态校验通过` },
    { ts: base[3], level: "INFO", msg: `执行成功` },
  ];
}

/* ============================================================ */
/* 页面                                                          */
/* ============================================================ */

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const tasks = useTasks();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  const rawSubtasks = useMemo(() => (task ? buildSubTasks(task) : []), [task]);
  const [abortedSubs, setAbortedSubs] = useState<Set<string>>(new Set());

  const subtasks = useMemo<SubTask[]>(
    () => rawSubtasks.map((s) =>
      abortedSubs.has(s.id) ? { ...s, status: "aborted" as SubStatus, actual: s.actual === "-" ? "-" : s.actual } : s,
    ),
    [rawSubtasks, abortedSubs],
  );

  const [kw, setKw] = useState("");
  const [fPlatform, setFPlatform] = useState<"all" | Platform>("all");
  const [fAction, setFAction] = useState<"all" | string>("all");
  const [fResult, setFResult] = useState<"all" | "success" | "failed" | "partial" | "none">("all");
  const [fExec, setFExec] = useState<"all" | ExecState>("all");

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return subtasks.filter((s) => {
      if (k && !s.id.toLowerCase().includes(k) && !s.reachAccount.toLowerCase().includes(k)
        && !s.action.toLowerCase().includes(k) && !s.platform.toLowerCase().includes(k)) return false;
      if (fPlatform !== "all" && s.platform !== fPlatform) return false;
      if (fAction !== "all" && s.action !== fAction) return false;
      if (fResult !== "all") {
        const showsDash = s.status === "pending" || s.status === "running" || s.status === "aborted";
        if (fResult === "none") {
          if (!showsDash) return false;
        } else {
          if (showsDash || s.status !== fResult) return false;
        }
      }
      if (fExec !== "all" && subExecState(s.status) !== fExec) return false;
      return true;
    });
  }, [subtasks, kw, fPlatform, fAction, fResult, fExec]);

  const filtersActive = kw.trim() !== "" || fPlatform !== "all" || fAction !== "all" || fResult !== "all" || fExec !== "all";
  const resetFilters = () => { setKw(""); setFPlatform("all"); setFAction("all"); setFResult("all"); setFExec("all"); setPage(1); };

  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize), [filtered, page]);

  // 选择 & 批量终止
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pagedTerminableIds = useMemo(
    () => paged.filter((s) => s.status === "pending" || s.status === "running").map((s) => s.id),
    [paged],
  );
  const allPagedSelected = pagedTerminableIds.length > 0 && pagedTerminableIds.every((id) => selected.has(id));
  const togglePageAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) pagedTerminableIds.forEach((id) => next.add(id));
      else pagedTerminableIds.forEach((id) => next.delete(id));
      return next;
    });
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // 批量终止可操作子集（过滤掉已完成/已终止）
  const batchTerminable = useMemo(() => {
    const map = new Map(subtasks.map((s) => [s.id, s]));
    return Array.from(selected).filter((id) => {
      const s = map.get(id);
      return s && (s.status === "pending" || s.status === "running");
    });
  }, [selected, subtasks]);
  const batchSkipped = selected.size - batchTerminable.length;

  const handleBatchAbort = () => {
    setAbortedSubs((prev) => {
      const next = new Set(prev);
      batchTerminable.forEach((id) => next.add(id));
      return next;
    });
    toast.success(`已终止 ${batchTerminable.length} 个子任务`);
    setSelected(new Set());
    setConfirmOpen(false);
  };

  const handleAbortOne = (id: string) => {
    setAbortedSubs((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success("子任务已终止");
  };

  const stats = useMemo(() => ({
    total: subtasks.length,
    done: subtasks.filter((s) => s.status === "success").length,
    failed: subtasks.filter((s) => s.status === "failed").length,
    running: subtasks.filter((s) => s.status === "running").length,
    pending: subtasks.filter((s) => s.status === "pending").length,
  }), [subtasks]);

  if (!task) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate({ to: "/tasks/list" })}>
          <ArrowLeft className="h-4 w-4" />返回任务列表
        </Button>
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          未找到任务 <span className="font-mono">{taskId}</span>
        </div>
      </div>
    );
  }

  const platformOptions = task.platforms;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* 顶部返回 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate({ to: "/tasks/list" })}>
            <ArrowLeft className="h-4 w-4" />返回任务列表
          </Button>
        </div>

        {/* 任务概要 */}
        <header className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight">{task.name}</h1>
                <Badge variant="outline" className={cn("gap-1 text-xs font-normal", SUBTYPE_CLS[task.subtype])}>
                  {SUBTYPE_LABEL[task.subtype]}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{task.id}</span>
                <span>·</span>
                <span>创建人：{task.createdBy}</span>
                <span>·</span>
                <span>创建时间：{task.createdAt}</span>
                {task.endTime && (<><span>·</span><span>结束时间：{task.endTime}</span></>)}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {task.platforms.map((p) => (
                  <Badge key={p} variant="outline" className={cn("text-[10px] font-normal", PLATFORM_CHIP[p])}>{p}</Badge>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* 统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="任务总数" value={stats.total} icon={ListChecks} tone="muted" />
          <StatCard title="执行成功" value={stats.done} icon={CheckCircle2} tone="success" />
          <StatCard title="执行失败" value={stats.failed} icon={XCircle} tone="destructive" />
          <StatCard title="执行中" value={stats.running} icon={PlayCircle} tone="primary" />
          <StatCard title="待执行" value={stats.pending} icon={Clock3} tone="warning" />
        </div>

        {/* 子任务列表 */}
        <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {/* 操作工具条 */}
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/10 px-4 py-2.5">
            <div className="text-xs text-muted-foreground">
              已选 <span className="font-semibold tabular-nums text-foreground">{selected.size}</span> 条
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:text-muted-foreground disabled:border-border disabled:hover:bg-transparent"
              disabled={selected.size === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <StopCircle className="h-3.5 w-3.5" />批量终止
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
            <div className="relative w-[300px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={kw} onChange={(e) => { setKw(e.target.value); setPage(1); }}
                placeholder="搜索任务ID / 账号 / 动作 / 平台" className="h-8 pl-8 text-xs" />
            </div>
            <Select value={fPlatform} onValueChange={(v) => { setFPlatform(v as typeof fPlatform); setPage(1); }}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="平台" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {platformOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fAction} onValueChange={(v) => { setFAction(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="动作" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部动作</SelectItem>
                <SelectItem value={task?.subtype === "nurture" ? "培育" : "触达"}>
                  {task?.subtype === "nurture" ? "培育" : "触达"}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={fResult} onValueChange={(v) => { setFResult(v as typeof fResult); setPage(1); }}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="任务结果" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务结果</SelectItem>
                
                <SelectItem value="success">执行成功</SelectItem>
                <SelectItem value="failed">执行失败</SelectItem>
                <SelectItem value="partial">部分成功</SelectItem>
                <SelectItem value="none">无结果（-）</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fExec} onValueChange={(v) => { setFExec(v as typeof fExec); setPage(1); }}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="执行状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部执行状态</SelectItem>
                {(Object.keys(EXEC_STATE_LABEL) as ExecState[]).map((s) => (
                  <SelectItem key={s} value={s}>{EXEC_STATE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />重置
              </Button>
            )}
            <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Filter className="h-3 w-3" />共 <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> 条
              {filtersActive && <span>/ {subtasks.length}</span>}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={allPagedSelected}
                      disabled={pagedTerminableIds.length === 0}
                      onCheckedChange={(c) => togglePageAll(!!c)}
                      aria-label="选择当前页可终止的子任务"
                    />
                  </TableHead>
                  <TableHead className="min-w-[200px]">任务ID</TableHead>
                  <TableHead className="min-w-[160px]">账号</TableHead>
                  <TableHead className="w-[110px]">操作/动作</TableHead>
                  <TableHead className="w-[120px]">目标</TableHead>
                  <TableHead className="w-[130px]">平台</TableHead>
                  <TableHead className="w-[110px]">任务结果</TableHead>
                  <TableHead className="w-[110px]">执行状态</TableHead>
                  <TableHead className="w-[170px]">预计执行时间</TableHead>
                  <TableHead className="w-[170px]">实际执行时间</TableHead>
                  <TableHead className="w-[160px] text-center pr-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-sm text-muted-foreground">
                      {subtasks.length === 0 ? "暂无子任务" : (
                        <span className="inline-flex items-center gap-2">
                          没有符合筛选条件的子任务
                          <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={resetFilters}>清除筛选</Button>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ) : paged.map((s) => {
                  const canTerminate = s.status === "pending" || s.status === "running";
                  const showDash = s.status === "pending" || s.status === "running" || s.status === "aborted";
                  const es = subExecState(s.status);
                  return (
                    <TableRow key={s.id} className="border-b-border/40">
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.has(s.id)}
                          disabled={!canTerminate}
                          onCheckedChange={(c) => toggleOne(s.id, !!c)}
                          aria-label={`选择 ${s.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{s.id}</TableCell>
                      <TableCell className="text-sm">{s.reachAccount}</TableCell>
                      <TableCell className="text-sm">{s.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.target}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] font-normal", PLATFORM_CHIP[s.platform])}>{s.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        {showDash ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          <Badge variant="outline" className={cn("text-xs font-normal", SUB_STATUS_CLS[s.status])}>
                            {SUB_STATUS_LABEL[s.status]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-normal", EXEC_STATE_CLS[es])}>
                          {EXEC_STATE_LABEL[es]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{s.estimated}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{s.actual}</TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => navigate({
                                  to: "/tasks/$taskId/logs/sub/$subId",
                                  params: { taskId: task.id, subId: s.id },
                                })}
                              >
                                <ScrollText className="h-3.5 w-3.5" />日志
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看子任务日志</TooltipContent>
                          </Tooltip>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:text-muted-foreground disabled:hover:bg-transparent"
                            disabled={!canTerminate}
                            onClick={() => handleAbortOne(s.id)}
                          >
                            <StopCircle className="h-3.5 w-3.5" />终止
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationBar page={page} totalPages={totalPages} total={filtered.length} setPage={setPage} />
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量终止子任务？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>
                  本次共选择 <span className="font-semibold text-foreground">{selected.size}</span> 条子任务。
                </div>
                {batchSkipped > 0 && (
                  <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                    系统已自动过滤 <span className="font-semibold">{batchSkipped}</span> 条已完成 / 已终止的数据，将不会被终止。
                  </div>
                )}
                <div>
                  将对剩余 <span className="font-semibold text-destructive">{batchTerminable.length}</span> 条「待执行 / 执行中」的子任务执行终止操作，操作不可撤销，确认继续吗？
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={batchTerminable.length === 0}
              onClick={handleBatchAbort}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认终止
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </TooltipProvider>
  );
}
