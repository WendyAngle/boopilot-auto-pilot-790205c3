import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookmarkPlus, ExternalLink, Lock, Bot, MousePointerClick,
  Sparkles, Clock3, Target, Upload, Pencil, Search,
  Eye, Heart, UserPlus, MessageSquare, Smile, Plus, Trash2, Copy,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  PLATFORMS, PLATFORM_CHIP, SUBTYPE_LABEL,
  fmtNow, genTaskId, pad, tasksActions, templatesActions, executeTask,
  type Platform, type TaskRow, type TaskTemplate,
} from "@/lib/operations-store";
import { getUsableTags } from "@/lib/systemTags";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { TENANTS_SEED } from "@/lib/tenants";
import { seedPosts, type PostItem } from "@/routes/_app.materials.posts";
import { seedManagedAccounts } from "@/lib/managed-account-mock";

type Priority = "low" | "normal" | "high" | "urgent";
const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; hint?: string }> = [
  { value: "low", label: "低" },
  { value: "normal", label: "中", hint: "默认" },
  { value: "high", label: "高" },
  { value: "urgent", label: "紧急" },
];

type ExecMode = "now" | "scheduled" | "recurring";
type TargetMode = "keyword" | "specified" | "random";
const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];


interface DraftState {
  name: string;
  priority: Priority;
  platforms: Platform[];
  targetMode: TargetMode;
  targetKeyword: string;
  targetUrl: string;
  reachTags: string[];
  reachTenants: string[];
  reachAccounts: string[];
  perAccount: number;
  execMode: ExecMode;
  scheduledMode: "datetime" | "active";
  scheduledDate: string;
  scheduledTime: string;
  recurStartDate: string;
  recurStartTime: string;
  recurFreq: "daily" | "weekly";
  recurWeekdays: string[];
  recurTimeStart: string;
  recurTimeEnd: string;
  recurDuration: number;
  recurForever: boolean;
  sessionDuration: number;
  sessionDurationUnit: "min" | "hour";
  scriptCustom: string;
  scriptFile: string;
  postTags: string[];
  postUseAccountTags: boolean;
  postTenants: string[];
  postIds: string[];
  execFrequency: "once" | "recurring";
  dailyPostCount: number;
  recurActiveTime: boolean;
  notifyDone: boolean;
  notifyFail: boolean;
  notifyMilestone: boolean;
  // 养号策略（多组）
  nurtureGroups: NurtureGroup[];
}

export interface NurtureGroup {
  id: string;
  nurtureInterestKeywords: string;
  nurtureLike: boolean;
  nurtureLikeMin: number;
  nurtureLikeMax: number;
  nurtureFollow: boolean;
  nurtureFollowMin: number;
  nurtureFollowMax: number;
  nurtureComment: boolean;
  nurtureCommentMin: number;
  nurtureCommentMax: number;
  nurtureCommentEmoji: boolean;
  nurtureCommentTopic: string;
  nurtureCommentSentiment: string;
  nurtureCommentStyle: string;
  nurtureSearch: boolean;
  nurtureKeywordOn: boolean;
  nurtureKeywords: string;
}

function makeNurtureGroup(): NurtureGroup {
  return {
    id: `ng_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    nurtureInterestKeywords: "",
    nurtureLike: false,
    nurtureLikeMin: 0,
    nurtureLikeMax: 15,
    nurtureFollow: false,
    nurtureFollowMin: 0,
    nurtureFollowMax: 15,
    nurtureComment: false,
    nurtureCommentMin: 0,
    nurtureCommentMax: 15,
    nurtureCommentEmoji: false,
    nurtureCommentTopic: "",
    nurtureCommentSentiment: "",
    nurtureCommentStyle: "",
    nurtureSearch: false,
    nurtureKeywordOn: true,
    nurtureKeywords: "",
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTimeStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function autoName(tpl: TaskTemplate) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${tpl.name}_${stamp}`;
}

const REACH_TAG_OPTIONS = ["加微信", "高活跃", "主账号", "节日问候", "高意向"];
const SCRIPT_OTHER_OPTIONS = ["养号通用话术 v2", "新品种草话术 v1", "节日问候话术 v3"];

type ChipOption = { value: string; label: string; hint?: string };
const SENTIMENT_OPTIONS: ChipOption[] = [
  { value: "warm", label: "温暖友好", hint: "warm" },
  { value: "specific", label: "具体细致", hint: "specific" },
  { value: "low-key", label: "平和克制", hint: "low-key" },
];
// 互斥对：温暖友好 ↔ 平和克制（情绪基调相反）
const SENTIMENT_EXCLUSIVE: Array<[string, string]> = [["warm", "low-key"]];

const STYLE_OPTIONS: ChipOption[] = [
  { value: "short", label: "简短精炼", hint: "short" },
  { value: "natural", label: "自然口语", hint: "natural" },
  { value: "specific", label: "详尽具体", hint: "specific" },
];
// 互斥对：简短精炼 ↔ 详尽具体（篇幅相反）
const STYLE_EXCLUSIVE: Array<[string, string]> = [["short", "specific"]];

function ChipMultiSelect({
  options,
  value,
  onChange,
  exclusivePairs = [],
}: {
  options: ChipOption[];
  value: string[];
  onChange: (v: string[]) => void;
  exclusivePairs?: Array<[string, string]>;
}) {
  const toggle = (v: string) => {
    const active = value.includes(v);
    if (active) {
      onChange(value.filter((x) => x !== v));
      return;
    }
    // 移除与 v 互斥的项
    const blocked = new Set<string>();
    exclusivePairs.forEach(([a, b]) => {
      if (a === v) blocked.add(b);
      if (b === v) blocked.add(a);
    });
    onChange([...value.filter((x) => !blocked.has(x)), v]);
  };
  const isDisabled = (v: string) => {
    // 若已选中某项的互斥对，则禁用本项（除非本身已选中）
    if (value.includes(v)) return false;
    return exclusivePairs.some(
      ([a, b]) => (a === v && value.includes(b)) || (b === v && value.includes(a)),
    );
  };
  return (
    <div className="flex flex-1 flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value.includes(opt.value);
        const disabled = isDisabled(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.value)}
            title={disabled ? "与已选项语义相反，不可同时选择" : opt.hint}
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:bg-accent/50",
              disabled && "cursor-not-allowed opacity-40 hover:bg-background",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const TAG_OPTIONS = getUsableTags().map((t) => ({ id: t.id, name: t.name, color: t.color }));
const TENANT_OPTIONS = TENANTS_SEED.filter((t) => t.status === "active").map((t) => t.name);
const ALL_POSTS: PostItem[] = seedPosts();

const SectionTitle = ({ index, title }: { index: string; title: string }) => (
  <div className="flex items-center gap-2 pt-1">
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
      {index}
    </span>
    <h4 className="text-xs font-semibold text-foreground">{title}</h4>
    <Separator className="flex-1" />
  </div>
);

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-xs text-muted-foreground">
    {children}
    {required && <span className="ml-0.5 text-destructive">*</span>}
  </Label>
);

interface NurtureRowProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  rangeMin?: number;
  rangeMax?: number;
  onRangeMin?: (n: number) => void;
  onRangeMax?: (n: number) => void;
  compact?: boolean;
}

function NurtureRow({
  icon, title, desc, enabled, onToggle,
  rangeMin, rangeMax, onRangeMin, onRangeMax, compact,
}: NurtureRowProps) {
  const hasRange = onRangeMin && onRangeMax;
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
      compact ? "hover:bg-accent/30" : "hover:bg-accent/40",
    )}>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {hasRange && enabled && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Input
            type="number"
            min={0}
            max={100}
            value={rangeMin}
            onChange={(e) => onRangeMin?.(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))}
            className="h-7 w-14 text-xs"
          />
          <span>%</span>
          <span className="px-0.5">-</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={rangeMax}
            onChange={(e) => onRangeMax?.(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))}
            className="h-7 w-14 text-xs"
          />
          <span>%</span>
        </div>
      )}
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

interface Props {
  template?: TaskTemplate | null;
  /** 提供则进入「编辑任务」模式 */
  task?: TaskRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewDetail?: (tpl: TaskTemplate) => void;
}

const DEFAULT_DRAFT_PARTIAL = {
  priority: "normal" as Priority,
  targetMode: "keyword" as TargetMode,
  targetKeyword: "旅游、旅游达人的账号",
  targetUrl: "",
  reachTags: [] as string[],
  reachTenants: [] as string[],
  reachAccounts: [] as string[],
  scheduledMode: "active" as "datetime" | "active",
  scheduledDate: todayStr(),
  scheduledTime: nowTimeStr(),
  recurStartDate: todayStr(),
  recurStartTime: nowTimeStr(),
  recurFreq: "weekly" as "daily" | "weekly",
  recurWeekdays: ["周一", "周二", "周三", "周四", "周五"] as string[],
  recurTimeStart: "09:00",
  recurTimeEnd: "18:00",
  recurDuration: 30,
  sessionDuration: 30,
  sessionDurationUnit: "min" as "min" | "hour",
  recurForever: false,
  scriptCustom: "",
  scriptFile: "",
  postTags: [] as string[],
  postUseAccountTags: true,
  postTenants: [] as string[],
  postIds: [] as string[],
  execFrequency: "once" as "once" | "recurring",
  dailyPostCount: 1,
  recurActiveTime: true,
  notifyDone: true,
  notifyFail: true,
  notifyMilestone: false,
  execMode: "now" as ExecMode,
  nurtureGroups: [makeNurtureGroup()] as NurtureGroup[],
};

export function UseTemplateDialog({ template, task, open, onOpenChange, onViewDetail }: Props) {
  const isEdit = !!task;
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!open) {
      setAccountSearch("");
      setStep(1);
      return;
    }
    setStep(1);
    if (task) {
      // 编辑模式：优先使用任务保存的 draft 快照，否则根据任务字段回填
      const saved = task.draft as DraftState | undefined;
      if (saved) {
        const groups = Array.isArray((saved as any).nurtureGroups) && (saved as any).nurtureGroups.length > 0
          ? (saved as any).nurtureGroups as NurtureGroup[]
          : [makeNurtureGroup()];
        setDraft({ ...saved, nurtureGroups: groups });
      } else {
        setDraft({
          ...DEFAULT_DRAFT_PARTIAL,
          name: task.name,
          platforms: [...task.platforms],
          perAccount: Math.max(1, Math.round(task.total / Math.max(1, task.platforms.length || 1))),
          execMode: task.subtype === "nurture" ? "recurring" : "now",
          execFrequency: task.subtype === "nurture" ? "recurring" : "once",
        });
      }
    } else if (template) {
      setDraft({
        ...DEFAULT_DRAFT_PARTIAL,
        name: autoName(template),
        platforms: [...template.platforms],
        perAccount: Math.max(1, template.total),
        execMode: template.subtype === "nurture" ? "recurring" : "now",
        execFrequency: template.subtype === "nurture" ? "recurring" : "once",
      });
    }
  }, [open, template, task]);

  // 在编辑模式下用任务自身合成一个"伪模版"用于复用渲染逻辑（不会触发平台锁）
  const tpl: TaskTemplate | null = template ?? (task
    ? {
        id: task.id,
        name: task.name,
        subtype: task.subtype,
        platforms: [],
        total: task.total,
        description: task.description,
        createdAt: task.createdAt,
        uses: 0,
      }
    : null);

  const tplPlatforms = tpl?.platforms ?? [];
  const availableAccounts = useMemo(() => {
    const platformSet = new Set<Platform>(tplPlatforms);
    const kw = accountSearch.trim().toLowerCase();
    return seedManagedAccounts()
      .filter((a) => a.accountStatus === "normal")
      .filter((a) => (platformSet.size ? platformSet.has(a.platform) : true))
      .filter((a) => {
        if (!kw) return true;
        return (
          a.username.toLowerCase().includes(kw) ||
          a.platformId.toLowerCase().includes(kw) ||
          (a.remark ?? "").toLowerCase().includes(kw)
        );
      })
      .slice(0, 200);
  }, [tplPlatforms, accountSearch]);

  const tagMatchedAccountsCount = useMemo(() => {
    const tags = draft?.reachTags ?? [];
    if (!tags.length) return 0;
    const platformSet = new Set<Platform>(tplPlatforms);
    const tagSet = new Set(tags);
    return seedManagedAccounts().filter(
      (a) =>
        a.accountStatus === "normal" &&
        (platformSet.size ? platformSet.has(a.platform) : true) &&
        (a.tags ?? []).some((t) => tagSet.has(t)),
    ).length;
  }, [draft?.reachTags, tplPlatforms]);

  const availablePosts = useMemo(() => {
    const kw = accountSearch.trim().toLowerCase();
    const platformSet = new Set<Platform>(tplPlatforms);
    return ALL_POSTS.filter((p) => {
      const matchedPlatforms = platformSet.size
        ? p.platforms.filter((pl) => platformSet.has(pl))
        : p.platforms;
      if (matchedPlatforms.length === 0) return false;
      const hasUnpublished = matchedPlatforms.some(
        (pl) => (p.publishStatus?.[pl] ?? "unpublished") === "unpublished",
      );
      if (!hasUnpublished) return false;
      if (!kw) return true;
      return (
        p.title.toLowerCase().includes(kw) ||
        p.tenantName.toLowerCase().includes(kw) ||
        p.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }).slice(0, 200);
  }, [accountSearch, tplPlatforms]);


  if (!tpl || !draft) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl" />
      </Dialog>
    );
  }

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((p) => (p ? { ...p, [key]: value } : p));

  const togglePlatform = (p: Platform) => {
    if (tpl.platforms.includes(p)) return; // locked by template
    update(
      "platforms",
      draft.platforms.includes(p) ? draft.platforms.filter((x) => x !== p) : [...draft.platforms, p],
    );
  };

  const matchedPosts = (() => {
    const set = new Set<string>();
    ALL_POSTS.forEach((p) => {
      if (draft.postTags.length && p.tags.some((t) => draft.postTags.includes(t))) set.add(p.id);
      if (draft.postTenants.length && draft.postTenants.includes(p.tenantName)) set.add(p.id);
    });
    draft.postIds.forEach((id) => set.add(id));
    return ALL_POSTS.filter((p) => set.has(p.id));
  })();

  



  // 预估
  const estimatedAccounts = Math.max(
    draft.reachTags.length * 30 + draft.reachTenants.length * 25,
    draft.reachTags.length + draft.reachTenants.length > 0 ? 10 : 0,
  );
  const matchedAccountsCount = estimatedAccounts + draft.reachAccounts.length;
  const totalOps = estimatedAccounts * draft.perAccount;
  const estimatedHours = Math.max(0.5, +(totalOps / 350).toFixed(1));

  const composeDescription = () => {
    const lines: string[] = [];
    lines.push(`来源模版：${tpl.name}`);
    lines.push(tpl.description);


    const reachParts: string[] = [];
    if (draft.reachTags.length) reachParts.push(`标签：${draft.reachTags.join("、")}`);
    if (draft.reachTenants.length) reachParts.push(`租户：${draft.reachTenants.join("、")}`);
    if (draft.reachAccounts.length) reachParts.push(`特定账号：${draft.reachAccounts.length} 个`);
    lines.push(`指定账号：${reachParts.length ? reachParts.join(" ｜ ") : "未指定"}`);
    if (draft.execMode === "now") {
      lines.push("执行方式：立即执行");
    } else if (draft.execMode === "scheduled") {
      lines.push(
        draft.scheduledMode === "active"
          ? "执行方式：指定时间开始执行（账号活跃时间）"
          : `执行方式：指定时间开始执行 ${draft.scheduledDate} ${draft.scheduledTime}`,
      );
    } else {
      const weekPart = draft.recurFreq === "weekly" ? `（${draft.recurWeekdays.join("、") || "未选"}）` : "";
      const durPart = draft.recurForever ? "持续执行直到手动停止" : `持续 ${draft.recurDuration} 天`;
      lines.push(
        `执行方式：周期执行，开始时间 ${draft.recurStartDate} ${draft.recurStartTime}，${draft.recurFreq === "daily" ? "每日" : "每周"}${weekPart}，时段 ${draft.recurTimeStart}—${draft.recurTimeEnd}，${durPart}`,
      );
    }
    return lines.join("\n");
  };

  const buildTask = (): TaskRow => ({
    id: genTaskId(),
    name: draft.name.trim() || autoName(tpl),
    subtype: tpl.subtype === "nurture" ? "nurture" : (draft.execMode === "recurring" ? "nurture" : "action"),
    platforms: draft.platforms,
    total: totalOps,
    done: 0,
    failed: 0,
    status: "pending",
    description: composeDescription(),
    createdBy: "黄雪",
    createdAt: fmtNow(),
    fromTemplate: tpl.name,
  });

  const handleSubmit = (execute: boolean) => {
    if (!draft.name.trim()) return toast.error("请输入任务名称");
    if (draft.reachTags.length === 0 && draft.reachAccounts.length === 0)
      return toast.error("指定标签、选择特定账号至少需要设置一项");
    if (tpl.subtype === "action" && !draft.postUseAccountTags && draft.postTags.length === 0 && draft.postIds.length === 0)
      return toast.error("贴文标签、选择特定贴文至少需要设置一项");

    if (draft.execMode === "recurring" && draft.recurFreq === "weekly" && draft.recurWeekdays.length === 0)
      return toast.error("请至少选择一个执行日");

    if (isEdit && task) {
      tasksActions.update(task.id, {
        name: draft.name.trim(),
        platforms: draft.platforms,
        subtype: tpl.subtype === "nurture" ? "nurture" : (draft.execMode === "recurring" ? "nurture" : "action"),
        total: totalOps,
        description: composeDescription(),
        draft: { ...draft } as unknown as Record<string, unknown>,
      });
      toast.success(`任务「${draft.name.trim()}」已更新`);
      onOpenChange(false);
      return;
    }

    const newTask = buildTask();
    newTask.draft = { ...draft } as unknown as Record<string, unknown>;
    tasksActions.add(newTask);
    if (template) {
      templatesActions.update(template.id, {
        uses: template.uses + 1,
        monthlyUses: (template.monthlyUses ?? 0) + 1,
      });
    }
    const immediate = draft.execMode === "now";
    if (execute && immediate) {
      setTimeout(() => executeTask(newTask.id), 400);
      toast.success(`已根据模版「${tpl.name}」创建任务并开始执行`);
    } else {
      const note = draft.execMode === "recurring"
        ? "已进入排程"
        : draft.execMode === "scheduled"
          ? "等待定时执行"
          : "已创建";
      toast.success(execute ? `任务已创建（${note}）` : "已保存为草稿");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-2 border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              {isEdit ? (
                <><Pencil className="h-4 w-4 text-primary" />编辑任务 - {task?.name}</>
              ) : (
                <><BookmarkPlus className="h-4 w-4 text-violet-600" />创建{tpl.name}任务</>
              )}
            </DialogTitle>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {!isEdit && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                来源模版：<span className="font-medium text-foreground">{tpl.name}</span>
              </span>
            )}
          </div>
          {!isEdit && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              <span className="text-foreground/70">方法论：</span>{tpl.description}
            </p>
          )}
        </DialogHeader>

        {(() => {
          const stepLabels = tpl.subtype === "action"
            ? ["任务基本信息", "指定账号", "执行方式"]
            : ["任务基本信息", "指定账号", "养号策略", "执行方式"];
          return (
            <div className="border-b px-6 py-3">
              <ol className="flex items-center gap-2">
                {stepLabels.map((label, idx) => {
                  const n = idx + 1;
                  const active = step === n;
                  const done = step > n;
                  return (
                    <li key={label} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { if (done) setStep(n); }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition",
                          active && "bg-primary text-primary-foreground",
                          done && "text-primary hover:bg-primary/5 cursor-pointer",
                          !active && !done && "text-muted-foreground",
                        )}
                      >
                        <span className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                          active && "border-primary-foreground bg-primary-foreground/20",
                          done && "border-primary bg-primary/10",
                          !active && !done && "border-border",
                        )}>{n}</span>
                        <span className="font-medium">{label}</span>
                      </button>
                      {n < stepLabels.length && (
                        <span className={cn("h-px w-6", done ? "bg-primary/40" : "bg-border")} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })()}

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 px-6 py-5">
            {/* 步骤1 任务基本信息 */}
            <section className={cn("space-y-3", step !== 1 && "hidden")}>
              <SectionTitle index={tpl.subtype === "action" ? "1/3" : "1/4"} title="任务基本信息" />
              <div className="space-y-1.5">
                <FieldLabel required>任务名称</FieldLabel>
                <Input
                  value={draft.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="自动根据模版名_日期时间 生成"
                />
                <p className="text-[11px] text-muted-foreground">自动根据"模版名_日期时间"生成，可手动修改</p>
              </div>
            </section>

            {/* 步骤2 指定账号 */}
            <section className={cn("space-y-3", step !== 2 && "hidden")}>
              <SectionTitle index={tpl.subtype === "action" ? "2/3" : "2/4"} title="指定账号" />



              <div className="space-y-1.5">
                <FieldLabel required>指定账号</FieldLabel>
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-muted-foreground">选择标签</div>
                    <TagMultiSelect
                      value={draft.reachTags}
                      onChange={(v) => update("reachTags", v)}
                      placeholder="选择或新增标签"
                    />
                    {draft.reachTags.length > 0 && tagMatchedAccountsCount === 0 && (
                      <p className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] text-warning">
                        该标签未匹配到账号，考虑选择其他标签或特定账号
                      </p>
                    )}
                    {draft.reachTags.length > 0 && tagMatchedAccountsCount > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        已通过标签匹配到 {tagMatchedAccountsCount} 个账号
                      </p>
                    )}
                  </div>


                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] text-muted-foreground">选择特定账号</div>
                        <button
                          type="button"
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => {
                            const allIds = availableAccounts.map((a) => a.id);
                            const others = draft.reachAccounts.filter((id) => !allIds.includes(id));
                            const allSelected = allIds.length > 0 && allIds.every((id) => draft.reachAccounts.includes(id));
                            update("reachAccounts", allSelected ? others : [...others, ...allIds]);
                          }}
                        >
                          {availableAccounts.length > 0 && availableAccounts.every((a) => draft.reachAccounts.includes(a.id))
                            ? "取消全选"
                            : "全选"}
                        </button>


                      </div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={accountSearch}
                          onChange={(e) => setAccountSearch(e.target.value)}
                          placeholder="搜索账号 / 平台ID / 备注"
                          className="h-7 w-56 pl-6 text-xs"
                        />
                      </div>
                    </div>

                    <ScrollArea className="h-44 rounded-md border bg-background">
                      <div className="divide-y">
                        {availableAccounts.length === 0 ? (
                          <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                            无可选账号
                          </div>
                        ) : (
                          availableAccounts.map((a) => {
                            const checked = draft.reachAccounts.includes(a.id);
                            return (
                              <label
                                key={a.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/40",
                                  checked && "bg-primary/5",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) =>
                                    update(
                                      "reachAccounts",
                                      c
                                        ? [...draft.reachAccounts, a.id]
                                        : draft.reachAccounts.filter((x) => x !== a.id),
                                    )
                                  }
                                />
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                                  {a.username.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                  {a.username}
                                </span>
                                <span className="rounded border border-border/60 px-1.5 py-px text-[10px] text-muted-foreground">
                                  {a.platform}
                                </span>
                                <span className="hidden text-[10px] text-muted-foreground sm:inline">
                                  {a.country}
                                </span>
                                <span className="hidden max-w-[120px] truncate text-[10px] text-muted-foreground md:inline">
                                  {a.tenantName}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        默认仅列出状态正常、平台匹配模版的账号；共 {availableAccounts.length} 个
                      </span>
                      {draft.reachAccounts.length > 0 && (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => update("reachAccounts", [])}
                        >
                          清空已选 ({draft.reachAccounts.length})
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">指定标签、选择特定账号至少需要设置一项</p>
                </div>
              </div>

              {tpl.subtype === "action" && (
              <div className="space-y-1.5">
                <FieldLabel required>指定贴文</FieldLabel>
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-muted-foreground">选择标签</div>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md border p-2 transition-colors",
                        draft.postUseAccountTags
                          ? "border-primary/60 bg-primary/5"
                          : "hover:border-primary/30",
                      )}
                    >
                      <Checkbox
                        checked={draft.postUseAccountTags}
                        onCheckedChange={(c) => {
                          const next = !!c;
                          update("postUseAccountTags", next);
                          if (next) update("postTags", []);
                        }}
                        className="mt-0.5 h-3.5 w-3.5"
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium">同账号标签</div>
                        <p className="text-[11px] text-muted-foreground">系统将自动按账号已有标签匹配同标签的贴文</p>
                      </div>
                    </label>
                    <TagMultiSelect
                      value={draft.postUseAccountTags ? [] : draft.postTags}
                      onChange={(v) => {
                        if (v.length > 0 && draft.postUseAccountTags) {
                          update("postUseAccountTags", false);
                        }
                        update("postTags", v);
                      }}
                      placeholder={draft.postUseAccountTags ? "已使用账号标签匹配（如需自定义请取消上方勾选）" : "选择或新增标签"}
                      disabled={draft.postUseAccountTags}
                    />
                  </div>




                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] text-muted-foreground">选择特定贴文</div>
                        <button
                          type="button"
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => {
                            const allIds = availablePosts.map((p) => p.id);
                            const others = draft.postIds.filter((id) => !allIds.includes(id));
                            const allSelected = allIds.length > 0 && allIds.every((id) => draft.postIds.includes(id));
                            update("postIds", allSelected ? others : [...others, ...allIds]);
                          }}
                        >
                          {availablePosts.length > 0 && availablePosts.every((p) => draft.postIds.includes(p.id))
                            ? "取消全选"
                            : "全选"}
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={accountSearch}
                          onChange={(e) => setAccountSearch(e.target.value)}
                          placeholder="搜索贴文标题 / 租户 / 标签"
                          className="h-7 w-56 pl-6 text-xs"
                        />
                      </div>
                    </div>

                    <ScrollArea className="h-44 rounded-md border bg-background">
                      <div className="divide-y">
                        {availablePosts.length === 0 ? (
                          <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                            无可选贴文
                          </div>
                        ) : (
                          availablePosts.map((p) => {
                            const checked = draft.postIds.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/40",
                                  checked && "bg-primary/5",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) =>
                                    update(
                                      "postIds",
                                      c
                                        ? [...draft.postIds, p.id]
                                        : draft.postIds.filter((x) => x !== p.id),
                                    )
                                  }
                                />
                                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                  {p.title}
                                </span>
                                <span className="hidden max-w-[120px] truncate text-[10px] text-muted-foreground md:inline">
                                  {p.tenantName}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>共匹配到 {matchedPosts.length} 篇贴文</span>
                      {draft.postIds.length > 0 && (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => update("postIds", [])}
                        >
                          清空已选 ({draft.postIds.length})
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">贴文标签、贴文租户、选择特定贴文至少需要设置一项</p>
                  {matchedPosts.length > 0 && matchedAccountsCount > 0 && matchedAccountsCount !== matchedPosts.length && (
                    <p className="text-[11px] text-destructive">
                      {matchedAccountsCount > matchedPosts.length
                        ? `所选账号数（${matchedAccountsCount}）大于贴文数（${matchedPosts.length}），将随机抽取等量账号执行发帖`
                        : `所选账号数（${matchedAccountsCount}）小于贴文数（${matchedPosts.length}），贴文将依次分配，部分账号会发多篇`}
                    </p>
                  )}
                </div>
              </div>
              )}
            </section>


            {/* 步骤3 养号策略（仅 nurture） */}
            {tpl.subtype !== "action" && (
              <section className={cn("space-y-3", step !== 3 && "hidden")}>
                <SectionTitle index="3/4" title="养号策略" />
                <p className="-mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  为提升 AI 生成与匹配效果，关键词、主题词、情绪与风格建议尽可能使用英文填写
                </p>
                {(() => {
                  const setGroup = (idx: number, patch: Partial<NurtureGroup>) => {
                    setDraft((d) => d ? { ...d, nurtureGroups: d.nurtureGroups.map((g, i) => i === idx ? { ...g, ...patch } : g) } : d);
                  };
                  const addGroup = () => setDraft((d) => d ? { ...d, nurtureGroups: [...d.nurtureGroups, makeNurtureGroup()] } : d);
                  const dupGroup = (idx: number) => setDraft((d) => {
                    if (!d) return d;
                    const src = d.nurtureGroups[idx];
                    const copy: NurtureGroup = { ...src, id: `ng_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
                    const next = [...d.nurtureGroups];
                    next.splice(idx + 1, 0, copy);
                    return { ...d, nurtureGroups: next };
                  });
                  const delGroup = (idx: number) => setDraft((d) => d && d.nurtureGroups.length > 1 ? { ...d, nurtureGroups: d.nurtureGroups.filter((_, i) => i !== idx) } : d);

                  return (
                    <div className="space-y-3">
                      {draft.nurtureGroups.map((g, idx) => (
                        <div key={g.id} className="space-y-2 rounded-lg border p-2">
                          <div className="flex items-center justify-between border-b border-dashed pb-1.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">第 {idx + 1} 组</Badge>
                              <span className="text-[11px] text-muted-foreground">每个匹配账号将随机选择一组策略执行</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={() => dupGroup(idx)}>
                                <Copy className="h-3 w-3" />复制
                              </Button>
                              {draft.nurtureGroups.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] text-destructive hover:text-destructive" onClick={() => delGroup(idx)}>
                                  <Trash2 className="h-3 w-3" />删除
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* 兴趣关键词 */}
                          <div className="space-y-1.5 rounded-md px-2 py-1.5 hover:bg-accent/40">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Eye className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-foreground">兴趣关键词<span className="ml-1 text-[10px] text-muted-foreground">（选填）</span></div>
                                <div className="truncate text-[11px] text-muted-foreground">用于浏览首页推荐 / Feed 流时筛选感兴趣的内容</div>
                              </div>
                            </div>
                            <Input
                              value={g.nurtureInterestKeywords}
                              onChange={(e) => {
                                const v = e.target.value;
                                const hasValue = v.trim().length > 0;
                                setGroup(idx, {
                                  nurtureInterestKeywords: v,
                                  nurtureSearch: hasValue,
                                  nurtureLike: hasValue,
                                  nurtureFollow: hasValue,
                                  nurtureComment: hasValue,
                                });
                              }}
                              placeholder="推荐 3-5 个，以「；」分隔，推荐英文，如：travel；food；parenting"
                              className="ml-9 h-8 w-[calc(100%-2.25rem)] text-xs"
                            />
                          </div>
                          {/* 搜索 */}
                          <NurtureRow
                            icon={<Search className="h-3.5 w-3.5" />}
                            title="搜索"
                            desc="搜索关键词浏览相关内容"
                            enabled={g.nurtureSearch}
                            onToggle={(v) => setGroup(idx, { nurtureSearch: v })}
                          />
                          {g.nurtureSearch && (
                            <div className="ml-2 space-y-1.5 rounded-md border border-dashed border-border/60 bg-muted/20 p-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">关键词</span>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/5"
                                  onClick={() => setGroup(idx, { nurtureKeywords: "travel" })}
                                >
                                  <Sparkles className="h-3 w-3" />AI 生成
                                </button>
                              </div>
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
                                点击 AI 生成将自动根据设定的兴趣关键词或账号的兴趣和当前热点生成，可手动调整；建议使用英文设置一个关键词以提升匹配效果
                              </p>
                              <Textarea
                                value={g.nurtureKeywords}
                                onChange={(e) => setGroup(idx, { nurtureKeywords: e.target.value })}
                                placeholder="点击AI生成或手动输入"
                                className="min-h-[60px] text-xs"
                              />
                            </div>
                          )}
                          {/* 点赞 */}
                          <NurtureRow
                            icon={<Heart className="h-3.5 w-3.5" />}
                            title="点赞"
                            desc="对浏览到的内容随机点赞"
                            enabled={g.nurtureLike}
                            onToggle={(v) => setGroup(idx, { nurtureLike: v })}
                            rangeMin={g.nurtureLikeMin}
                            rangeMax={g.nurtureLikeMax}
                            onRangeMin={(n) => setGroup(idx, { nurtureLikeMin: n })}
                            onRangeMax={(n) => setGroup(idx, { nurtureLikeMax: n })}
                          />
                          {/* 关注 */}
                          <NurtureRow
                            icon={<UserPlus className="h-3.5 w-3.5" />}
                            title="关注"
                            desc="关注感兴趣的账号 / 主页"
                            enabled={g.nurtureFollow}
                            onToggle={(v) => setGroup(idx, { nurtureFollow: v })}
                            rangeMin={g.nurtureFollowMin}
                            rangeMax={g.nurtureFollowMax}
                            onRangeMin={(n) => setGroup(idx, { nurtureFollowMin: n })}
                            onRangeMax={(n) => setGroup(idx, { nurtureFollowMax: n })}
                          />
                          {/* 评论 */}
                          <NurtureRow
                            icon={<MessageSquare className="h-3.5 w-3.5" />}
                            title="评论"
                            desc="对浏览到的内容随机发布评论"
                            enabled={g.nurtureComment}
                            onToggle={(v) => setGroup(idx, { nurtureComment: v })}
                            rangeMin={g.nurtureCommentMin}
                            rangeMax={g.nurtureCommentMax}
                            onRangeMin={(n) => setGroup(idx, { nurtureCommentMin: n })}
                            onRangeMax={(n) => setGroup(idx, { nurtureCommentMax: n })}
                          />
                          {g.nurtureComment && (
                            <div className="ml-2 space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-2">
                              <div className="flex items-center gap-2 px-1.5">
                                <span className="w-16 shrink-0 text-[11px] text-muted-foreground">评论情绪</span>
                                <Input
                                  value={g.nurtureCommentSentiment}
                                  onChange={(e) => setGroup(idx, { nurtureCommentSentiment: e.target.value })}
                                  placeholder={`推荐英文，如：${SENTIMENT_OPTIONS.map((o) => o.hint).join(" / ")}`}
                                  className="h-7 flex-1 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2 px-1.5">
                                <span className="w-16 shrink-0 text-[11px] text-muted-foreground">评论风格</span>
                                <Input
                                  value={g.nurtureCommentStyle}
                                  onChange={(e) => setGroup(idx, { nurtureCommentStyle: e.target.value })}
                                  placeholder={`推荐英文，如：${STYLE_OPTIONS.map((o) => o.hint).join(" / ")}`}
                                  className="h-7 flex-1 text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 border-dashed text-xs" onClick={addGroup}>
                        <Plus className="h-3.5 w-3.5" />添加一组养号策略
                      </Button>
                    </div>
                  );
                })()}

              </section>
            )}


            {/* 步骤4 执行方式 */}
            <section className={cn("space-y-3", step !== (tpl.subtype === "action" ? 3 : 4) && "hidden")}>
              <SectionTitle index={tpl.subtype === "action" ? "3/3" : "4/4"} title="执行方式" />

              {/* 周期养号任务：执行方式（仅 nurture） */}
              {tpl.subtype !== "action" && (
              <div className="space-y-1.5">
                <FieldLabel required>执行方式</FieldLabel>
                <RadioGroup
                  value={draft.execFrequency}
                  onValueChange={(v) => {
                    const next = v as "once" | "recurring";
                    update("execFrequency", next);
                    if (next === "once") {
                      if (draft.execMode === "recurring") update("execMode", "now");
                    } else {
                      update("execMode", "recurring");
                    }
                  }}
                  className="space-y-2"
                >
                  {/* 仅执行一次 */}
                  <label
                    htmlFor="nf-once"
                    className={cn(
                      "block cursor-pointer rounded-lg border p-3 transition-colors",
                      draft.execFrequency === "once" ? "border-primary/60 bg-primary/5" : "hover:border-primary/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="once" id="nf-once" className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">仅执行一次</span>
                    </div>
                    <p className="ml-6 mt-1 text-[11px] text-muted-foreground">每个匹配账号仅执行一次养号</p>

                    {draft.execFrequency === "once" && (
                      <div className="ml-6 mt-2 space-y-2">
                        <RadioGroup
                          value={draft.execMode === "scheduled" ? "scheduled" : "now"}
                          onValueChange={(v) => update("execMode", v as ExecMode)}
                          className="space-y-1.5"
                        >
                          {/* 立即执行 */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="now" id="nf-once-now" className="h-3.5 w-3.5" />
                              <Label htmlFor="nf-once-now" className="cursor-pointer text-xs">立即执行</Label>
                            </div>
                            {draft.execMode === "now" && (
                              <p className="ml-6 text-[11px] text-muted-foreground">提交后立即开始执行任务</p>
                            )}
                          </div>
                          {/* 指定时间开始执行 */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="scheduled" id="nf-once-sch" className="h-3.5 w-3.5" />
                              <Label htmlFor="nf-once-sch" className="cursor-pointer text-xs">指定时间开始执行</Label>
                            </div>
                            {draft.execMode === "scheduled" && (
                              <div className="ml-6 space-y-2">
                                <RadioGroup
                                  value={draft.scheduledMode}
                                  onValueChange={(v) => update("scheduledMode", v as "datetime" | "active")}
                                  className="space-y-1.5"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <RadioGroupItem value="active" id="nf-sch-active" className="h-3.5 w-3.5" />
                                      <Label htmlFor="nf-sch-active" className="cursor-pointer text-xs">账号活跃时间</Label>
                                    </div>
                                    {draft.scheduledMode === "active" && (
                                      <p className="ml-6 text-[11px] text-muted-foreground">
                                        系统将在每个账号下一个活跃时间窗口开始执行，系统会根据账号国家地区自动转化为当地相应时段
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <RadioGroupItem value="datetime" id="nf-sch-dt" className="h-3.5 w-3.5" />
                                      <Label htmlFor="nf-sch-dt" className="cursor-pointer text-xs">指定日期和时间点</Label>
                                    </div>
                                    {draft.scheduledMode === "datetime" && (
                                      <div className="ml-6 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Input
                                            type="date"
                                            value={draft.scheduledDate}
                                            onChange={(e) => update("scheduledDate", e.target.value)}
                                            className="h-7 w-36 text-xs"
                                          />
                                          <Input
                                            type="time"
                                            value={draft.scheduledTime}
                                            onChange={(e) => update("scheduledTime", e.target.value)}
                                            className="h-7 w-24 text-xs"
                                          />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">任务将在指定时间开始执行（北京时间）</p>
                                      </div>
                                    )}
                                  </div>
                                </RadioGroup>
                              </div>
                            )}
                          </div>
                        </RadioGroup>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="w-16 text-muted-foreground">时长</span>
                          <Input
                            type="number"
                            min={1}
                            value={draft.sessionDuration}
                            onChange={(e) => update("sessionDuration", Math.max(1, parseInt(e.target.value || "1", 10)))}
                            className="h-7 w-20 text-xs"
                          />
                          <Select value={draft.sessionDurationUnit} onValueChange={(v) => update("sessionDurationUnit", v as "min" | "hour")}>
                            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="min">分钟</SelectItem>
                              <SelectItem value="hour">小时</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-[11px] text-muted-foreground">每次养号时长</span>
                        </div>
                      </div>
                    )}
                  </label>

                  {/* 周期执行 */}
                  <label
                    htmlFor="nf-rec"
                    className={cn(
                      "block cursor-pointer rounded-lg border p-3 transition-colors",
                      draft.execFrequency === "recurring" ? "border-primary/60 bg-primary/5" : "hover:border-primary/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="recurring" id="nf-rec" className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">周期执行</span>
                    </div>
                    {draft.execFrequency === "recurring" && (
                      <div className="ml-6 mt-2 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-16 text-muted-foreground">开始时间</span>
                          <Input
                            type="date"
                            value={draft.recurStartDate}
                            onChange={(e) => update("recurStartDate", e.target.value)}
                            className="h-7 w-36 text-xs"
                          />
                          <Input
                            type="time"
                            value={draft.recurStartTime}
                            onChange={(e) => update("recurStartTime", e.target.value)}
                            className="h-7 w-24 text-xs"
                          />
                          <span className="text-[11px] text-muted-foreground">任务开始执行时间（北京时间）</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-16 text-muted-foreground">执行周期</span>
                          <Select value="daily" disabled>
                            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">每日</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-16 text-muted-foreground">时段</span>
                          <Input
                            type="time"
                            value={draft.recurTimeStart}
                            onChange={(e) => update("recurTimeStart", e.target.value)}
                            className="h-7 w-24 text-xs"
                          />
                          <span className="text-muted-foreground">—</span>
                          <Input
                            type="time"
                            value={draft.recurTimeEnd}
                            onChange={(e) => update("recurTimeEnd", e.target.value)}
                            className="h-7 w-24 text-xs"
                          />
                          <span className="text-[11px] text-muted-foreground">系统会根据账号国家地区自动转化为当地相应时段</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-16 text-muted-foreground">时长</span>
                          <Input
                            type="number"
                            min={1}
                            value={draft.sessionDuration}
                            onChange={(e) => update("sessionDuration", Math.max(1, parseInt(e.target.value || "1", 10)))}
                            className="h-7 w-20 text-xs"
                          />
                          <Select value={draft.sessionDurationUnit} onValueChange={(v) => update("sessionDurationUnit", v as "min" | "hour")}>
                            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="min">分钟</SelectItem>
                              <SelectItem value="hour">小时</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-[11px] text-muted-foreground">每次养号时长</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-16 shrink-0 text-muted-foreground">持续天数</span>
                          <RadioGroup
                            value={draft.recurForever ? "forever" : "days"}
                            onValueChange={(v) => update("recurForever", v === "forever")}
                            className="flex flex-wrap items-center gap-x-4 gap-y-2"
                          >
                            <label className="inline-flex cursor-pointer items-center gap-1.5">
                              <RadioGroupItem value="days" />
                              <span>设置天数</span>
                              <Input
                                type="number"
                                min={1}
                                value={draft.recurDuration}
                                onChange={(e) => update("recurDuration", Math.max(1, parseInt(e.target.value || "1", 10)))}
                                onFocus={() => draft.recurForever && update("recurForever", false)}
                                disabled={draft.recurForever}
                                className="h-7 w-20 text-xs"
                              />
                              <span className="text-muted-foreground">天</span>
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-1.5">
                              <RadioGroupItem value="forever" />
                              <span>持续执行直到手动停止</span>
                            </label>
                          </RadioGroup>
                        </div>
                        <p className="text-[11px] text-muted-foreground">任务将从开始时间起，按照设置周期、时长在指定的时段内重复执行</p>
                      </div>
                    )}
                  </label>
                </RadioGroup>
              </div>
              )}

              {/* 发帖任务：执行方式（合并 仅执行一次/周期执行 + 嵌套子项） */}
              {tpl.subtype === "action" && (
                <div className="space-y-1.5">
                  <FieldLabel required>执行方式</FieldLabel>
                  <RadioGroup
                    value={draft.execFrequency}
                    onValueChange={(v) => {
                      const next = v as "once" | "recurring";
                      update("execFrequency", next);
                      if (next === "once") {
                        if (draft.execMode === "recurring") update("execMode", "now");
                      } else {
                        update("execMode", "recurring");
                      }
                    }}
                    className="space-y-2"
                  >
                    {/* 仅执行一次 */}
                    <label
                      htmlFor="ef-once"
                      className={cn(
                        "block cursor-pointer rounded-lg border p-3 transition-colors",
                        draft.execFrequency === "once" ? "border-primary/60 bg-primary/5" : "hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="once" id="ef-once" className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">仅执行一次</span>
                      </div>
                      <p className="ml-6 mt-1 text-[11px] text-muted-foreground">每个匹配账号仅发布一次贴文</p>

                      {draft.execFrequency === "once" && (
                        <div className="ml-6 mt-2 space-y-2">
                          <RadioGroup
                            value={draft.execMode === "scheduled" ? "scheduled" : "now"}
                            onValueChange={(v) => update("execMode", v as ExecMode)}
                            className="space-y-1.5"
                          >
                            {/* 立即执行 */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="now" id="ef-once-now" className="h-3.5 w-3.5" />
                                <Label htmlFor="ef-once-now" className="cursor-pointer text-xs">立即执行</Label>
                              </div>
                              {draft.execMode === "now" && (
                                <p className="ml-6 text-[11px] text-muted-foreground">提交后立即开始执行任务</p>
                              )}
                            </div>
                            {/* 指定时间开始执行 */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="scheduled" id="ef-once-sch" className="h-3.5 w-3.5" />
                                <Label htmlFor="ef-once-sch" className="cursor-pointer text-xs">指定时间开始执行</Label>
                              </div>
                              {draft.execMode === "scheduled" && (
                                <div className="ml-6 space-y-2">
                                  <RadioGroup
                                    value={draft.scheduledMode}
                                    onValueChange={(v) => update("scheduledMode", v as "datetime" | "active")}
                                    className="space-y-1.5"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value="active" id="sch-active" className="h-3.5 w-3.5" />
                                        <Label htmlFor="sch-active" className="cursor-pointer text-xs">账号活跃时间</Label>
                                      </div>
                                      {draft.scheduledMode === "active" && (
                                        <p className="ml-6 text-[11px] text-muted-foreground">
                                          系统将在每个账号下一个活跃时间窗口开始执行，系统会根据账号国家地区自动转化为当地相应时段
                                        </p>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value="datetime" id="sch-dt" className="h-3.5 w-3.5" />
                                        <Label htmlFor="sch-dt" className="cursor-pointer text-xs">指定日期和时间点</Label>
                                      </div>
                                      {draft.scheduledMode === "datetime" && (
                                        <div className="ml-6 space-y-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Input
                                              type="date"
                                              value={draft.scheduledDate}
                                              onChange={(e) => update("scheduledDate", e.target.value)}
                                              className="h-7 w-36 text-xs"
                                            />
                                            <Input
                                              type="time"
                                              value={draft.scheduledTime}
                                              onChange={(e) => update("scheduledTime", e.target.value)}
                                              className="h-7 w-24 text-xs"
                                            />
                                          </div>
                                          <p className="text-[11px] text-muted-foreground">任务将在指定时间开始执行（北京时间）</p>
                                        </div>
                                      )}
                                    </div>
                                  </RadioGroup>
                                </div>
                              )}
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                    </label>

                    {/* 周期执行 */}
                    <label
                      htmlFor="ef-rec"
                      className={cn(
                        "block cursor-pointer rounded-lg border p-3 transition-colors",
                        draft.execFrequency === "recurring" ? "border-primary/60 bg-primary/5" : "hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="recurring" id="ef-rec" className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">周期执行</span>
                      </div>
                      {draft.execFrequency === "recurring" && (
                        <div className="ml-6 mt-2 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-16 text-muted-foreground">开始时间</span>
                            <Input
                              type="date"
                              value={draft.recurStartDate}
                              onChange={(e) => update("recurStartDate", e.target.value)}
                              className="h-7 w-36 text-xs"
                            />
                            <Input
                              type="time"
                              value={draft.recurStartTime}
                              onChange={(e) => update("recurStartTime", e.target.value)}
                              className="h-7 w-24 text-xs"
                            />
                            <span className="text-[11px] text-muted-foreground">任务开始执行时间（北京时间）</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-16 text-muted-foreground">发布频次</span>
                            <span className="text-muted-foreground">每个账号每天发布</span>
                            <Input
                              type="number"
                              min={1}
                              value={draft.dailyPostCount}
                              onChange={(e) => update("dailyPostCount", Math.max(1, parseInt(e.target.value || "1", 10)))}
                              className="h-7 w-20 text-xs"
                            />
                            <span className="text-muted-foreground">条贴文</span>
                          </div>
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="mt-1 w-16 text-muted-foreground">发布时间</span>
                            <label className="inline-flex cursor-pointer items-center gap-1.5">
                              <Checkbox
                                checked={draft.recurActiveTime}
                                onCheckedChange={(c) => update("recurActiveTime", Boolean(c))}
                              />
                              <span>账号活跃时间</span>
                            </label>
                            <span className="text-[11px] text-muted-foreground">系统将在每个账号的活跃时间窗口内发布</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-16 text-muted-foreground">持续</span>
                            <Input
                              type="number"
                              min={1}
                              value={draft.recurDuration}
                              onChange={(e) => update("recurDuration", Math.max(1, parseInt(e.target.value || "1", 10)))}
                              disabled={draft.recurForever}
                              className="h-7 w-20 text-xs"
                            />
                            <span className="text-muted-foreground">天 /</span>
                            <label className="inline-flex cursor-pointer items-center gap-1.5">
                              <Checkbox
                                checked={draft.recurForever}
                                onCheckedChange={(c) => update("recurForever", Boolean(c))}
                              />
                              <span>持续执行直到手动停止</span>
                            </label>
                          </div>
                          <p className="text-[11px] text-muted-foreground">系统将从开始时间起，按设定频次为每个账号循环发布贴文</p>
                        </div>
                      )}
                    </label>
                  </RadioGroup>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/20 px-6 py-3">
          {(() => {
            const totalSteps = tpl.subtype === "action" ? 3 : 4;
            const isLast = step >= totalSteps;
            return (
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">第 {step} / {totalSteps} 步</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
                  {step > 1 && (
                    <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))}>上一步</Button>
                  )}
                  {!isLast && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (step === 1 && !draft.name.trim()) {
                          toast.error("请填写任务名称");
                          return;
                        }
                        if (step === 2 && draft.reachAccounts.length === 0) {
                          toast.error("请至少指定 1 个账号");
                          return;
                        }
                        setStep((s) => Math.min(totalSteps, s + 1));
                      }}
                    >
                      下一步
                    </Button>
                  )}
                  {isLast && (
                    isEdit ? (
                      <Button size="sm" className="gap-1" onClick={() => handleSubmit(true)}>
                        <Pencil className="h-3.5 w-3.5" />保存修改
                      </Button>
                    ) : (
                      <Button size="sm" className="gap-1" onClick={() => handleSubmit(true)}>
                        <Sparkles className="h-3.5 w-3.5" />确认创建
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
