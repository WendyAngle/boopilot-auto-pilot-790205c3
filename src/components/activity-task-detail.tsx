// 活动台账类任务（私信 / 通过好友申请 / 拒绝好友申请）的任务详情视图
//
// 设计要点：
// 1. 这类任务的每一条子任务 = 一次已发生的人工动作（成功 / 失败），不存在
//    "待执行 / 执行中 / 预计执行时间 / 终止" 语义。视图彻底移除这些字段与按钮。
// 2. 明确区分「执行账号」（我方托管账号）与「目标账号」（对方社媒账号），
//    避免用户混淆两者身份。
// 3. 摘要（私信内容 / 欢迎语 / 拒绝说明）作为独立列，让审计一眼看清"做了什么"。

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, RotateCcw, Filter, ScrollText,
  ListChecks, CheckCircle2, XCircle, User2, AtSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  PLATFORM_CHIP, TASK_CATEGORY_LABEL, TASK_CATEGORY_CLS,
  getTaskCategory, type TaskRow,
} from "@/lib/operations-store";
import { PLATFORM_META } from "@/lib/managed-account-mock";
import type { ActivitySubTask } from "@/lib/activity-tasks";

const RESULT_LABEL: Record<"success" | "failed", string> = {
  success: "执行成功",
  failed: "执行失败",
};
const RESULT_CLS: Record<"success" | "failed", string> = {
  success: "bg-success/10 text-success border-success/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props {
  task: TaskRow;
  subtasks: ActivitySubTask[];
}

export function ActivityTaskDetail({ task, subtasks }: Props) {
  const navigate = useNavigate();
  const category = getTaskCategory(task);

  const [kw, setKw] = useState("");
  const [fResult, setFResult] = useState<"all" | "success" | "failed">("all");

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return subtasks.filter((s) => {
      if (fResult !== "all" && s.status !== fResult) return false;
      if (!k) return true;
      return (
        s.target.toLowerCase().includes(k)
        || (s.peerHandle ?? "").toLowerCase().includes(k)
        || (s.detail ?? "").toLowerCase().includes(k)
        || s.accountName.toLowerCase().includes(k)
        || s.id.toLowerCase().includes(k)
      );
    });
  }, [subtasks, kw, fResult]);

  const filtersActive = kw.trim() !== "" || fResult !== "all";
  const resetFilters = () => { setKw(""); setFResult("all"); setPage(1); };

  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [filtered, page],
  );

  const stats = useMemo(() => ({
    total: subtasks.length,
    done: subtasks.filter((s) => s.status === "success").length,
    failed: subtasks.filter((s) => s.status === "failed").length,
  }), [subtasks]);
  const successRate = stats.total === 0
    ? "-"
    : `${Math.round((stats.done / stats.total) * 100)}%`;

  // 执行账号：活动类父任务的执行账号是固定的（accountId），从任何一条子任务读取即可
  const executor = subtasks[0];
  const platform = task.platforms[0];
  const platformMeta = PLATFORM_META[platform];

  return (
    <>
      {/* 任务概要 */}
      <header className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <ListChecks className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight">{task.name}</h1>
              <Badge variant="outline" className={cn("gap-1 text-xs font-normal", TASK_CATEGORY_CLS[category])}>
                {TASK_CATEGORY_LABEL[category]}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] font-normal", PLATFORM_CHIP[platform])}>
                {platform}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{task.id}</span>
              <span>·</span>
              <span>创建人：{task.createdBy}</span>
              <span>·</span>
              <span>创建时间：{task.createdAt}</span>
              {task.endTime && (<><span>·</span><span>最近动作：{task.endTime}</span></>)}
            </div>
            {/* 执行账号（我方托管账号） */}
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">执行账号</span>
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold",
                  platformMeta?.cls,
                )}
              >
                {platformMeta?.letter}
              </div>
              <span className="font-medium text-foreground">{executor?.accountName ?? "-"}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{platform}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                本页数据为该账号在 {platform} 上所有「{TASK_CATEGORY_LABEL[category]}」的历史记录
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="动作总数" value={stats.total} icon={ListChecks} tone="muted" />
        <StatCard title="执行成功" value={stats.done} icon={CheckCircle2} tone="success" />
        <StatCard title="执行失败" value={stats.failed} icon={XCircle} tone="destructive" />
        <StatCard title="成功率" value={successRate} icon={CheckCircle2} tone="primary" />
      </div>

      {/* 明细列表 */}
      <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
          <div className="relative w-[320px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => { setKw(e.target.value); setPage(1); }}
              placeholder="搜索目标账号 / 内容摘要"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select value={fResult} onValueChange={(v) => { setFResult(v as typeof fResult); setPage(1); }}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="结果" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部结果</SelectItem>
              <SelectItem value="success">执行成功</SelectItem>
              <SelectItem value="failed">执行失败</SelectItem>
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
                <TableHead className="min-w-[170px] pl-4">执行时间</TableHead>
                <TableHead className="min-w-[180px]">执行账号（我方）</TableHead>
                <TableHead className="w-[130px]">动作</TableHead>
                <TableHead className="min-w-[200px]">目标账号（对方）</TableHead>
                <TableHead className="min-w-[280px]">内容 / 说明</TableHead>
                <TableHead className="w-[110px]">结果</TableHead>
                <TableHead className="w-[90px] text-center pr-4">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                    {subtasks.length === 0 ? "暂无记录" : (
                      <span className="inline-flex items-center gap-2">
                        没有符合筛选条件的记录
                        <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={resetFilters}>清除筛选</Button>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ) : paged.map((s) => {
                const meta = PLATFORM_META[s.platform];
                return (
                  <TableRow key={s.id} className="border-b-border/40">
                    <TableCell className="pl-4 font-mono text-xs tabular-nums text-muted-foreground">
                      {s.createdAt}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold",
                            meta?.cls,
                          )}
                          title={s.platform}
                        >
                          {meta?.letter}
                        </div>
                        <span className="text-sm">{s.accountName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.action}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {s.peerAvatar ? (
                          <img
                            src={s.peerAvatar}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full border border-border/60 bg-background"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground">
                            <User2 className="h-3 w-3" />
                          </div>
                        )}
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-sm">{s.target}</div>
                          {s.peerHandle && (
                            <div className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <AtSign className="h-2.5 w-2.5" />
                              <span className="truncate">{s.peerHandle.replace(/^@/, "")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.detail ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="max-w-[360px] truncate text-xs text-foreground/80">
                              {s.detail}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[420px] whitespace-pre-wrap break-words">
                            {s.detail}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-normal", RESULT_CLS[s.status])}>
                        {RESULT_LABEL[s.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-center">
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
                          <TooltipContent>查看动作日志</TooltipContent>
                        </Tooltip>
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
    </>
  );
}
