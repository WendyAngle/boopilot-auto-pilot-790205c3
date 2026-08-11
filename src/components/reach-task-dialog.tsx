import { useEffect, useState } from "react";
import {
  Zap, Package, Plus, X, Wand2, Sparkles, FileText, Languages, Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PLATFORMS, tasksActions, type Platform, type TaskRow,
} from "@/lib/operations-store";

const REGIONS = ["美国", "英国", "德国", "日本", "韩国", "泰国", "越南", "印度尼西亚", "巴西", "全球"];

/** 来自企业信息主营产品（mock） */
const PROMO_PRODUCTS = [
  "建筑螺纹钢", "彩涂钢卷", "光伏支架", "工业铝型材",
  "护肤精华", "美妆彩盘", "跨境物流服务", "智能家居套装",
];

const LANGS = [
  { code: "en", label: "英语", flag: "GB" },
  { code: "es", label: "西班牙语", flag: "ES" },
  { code: "pt", label: "葡萄牙语", flag: "PT" },
  { code: "ja", label: "日语", flag: "JP" },
  { code: "th", label: "泰语", flag: "TH" },
  { code: "vi", label: "越南语", flag: "VN" },
];

const FORMAT_TIPS: Record<string, string[]> = {
  Facebook: ["2-3 短段，先提对方业务", "首条不放链接", "1-2 个 emoji"],
  Instagram: ["1-2 短段，语气轻松", "首条不放链接", "可用 1 个 emoji 收尾"],
  Tiktok: ["1 段短句，口语化", "避免营销词，先夸内容", "1 个 emoji"],
  WhatsApp: ["先自我介绍 + 来源", "首条不放链接", "礼貌收尾并留提问"],
  "Twitter/X": ["单段 280 字符内", "首条不放链接", "最多 1 个 emoji"],
};

interface ReachDraft {
  name: string;
  platform: Platform;
  region: string;
  total: number;
  products: string[];
  keywords: string;
  scriptZh: string;
  scriptTargetLang: string;
  scriptSend: string;
}

const AVAILABLE_ACCOUNTS = 3;
const PER_ACCOUNT_LIMIT = 5;

function buildDraft(task: TaskRow): ReachDraft {
  const d = (task.draft ?? {}) as Record<string, unknown>;
  return {
    name: task.name,
    platform: (task.platforms[0] ?? "Facebook") as Platform,
    region: typeof d.reachRegion === "string" ? d.reachRegion : "美国",
    total: task.total || 30,
    products: Array.isArray(d.reachProducts) ? (d.reachProducts as string[]) : [],
    keywords:
      typeof d.reachKeywords === "string"
        ? (d.reachKeywords as string)
        : typeof d.targetKeyword === "string"
          ? (d.targetKeyword as string).split(/[、,，]/).filter(Boolean).join(", ")
          : "",
    scriptZh: typeof d.scriptZh === "string" ? d.scriptZh : "",
    scriptTargetLang: typeof d.scriptTargetLang === "string" ? d.scriptTargetLang : "en",
    scriptSend: typeof d.scriptSend === "string" ? d.scriptSend : "",
  };
}

interface Props {
  task: TaskRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReachTaskDialog({ task, open, onOpenChange }: Props) {
  const [draft, setDraft] = useState<ReachDraft | null>(null);

  useEffect(() => {
    if (open && task) setDraft(buildDraft(task));
    if (!open) setDraft(null);
  }, [open, task]);

  if (!task || !draft) return null;

  const set = <K extends keyof ReachDraft>(k: K, v: ReachDraft[K]) =>
    setDraft((p) => (p ? { ...p, [k]: v } : p));

  const toggleProduct = (name: string) => {
    const has = draft.products.includes(name);
    if (!has && draft.products.length >= 3) { toast.error("最多选择 3 个推广产品"); return; }
    set("products", has ? draft.products.filter((p) => p !== name) : [...draft.products, name]);
  };

  const aiKeywords = () => {
    if (draft.products.length === 0) { toast.error("请先选择推广产品，AI 依据产品推荐关键词"); return; }
    const kws = draft.products.flatMap((p) => [`${p} supplier`, `${p} wholesale`, `${p} 采购`]);
    set("keywords", Array.from(new Set(kws)).join(", "));
    toast.success(`已按 ${draft.products.length} 个产品推荐关键词`);
  };

  const aiScript = () => {
    const first = draft.products[0] ?? "我们的产品";
    set(
      "scriptZh",
      `Hi {联系人名}，我是 {我的公司} 的 {我的姓名}，看到您在${draft.region}做${draft.keywords.split(",")[0]?.trim() || "相关"}业务。\n我们专注${first}，同类客户平均降本 12%，方便发一份报价与规格表给您吗？🙌`,
    );
    toast.success("已生成私信内容（中文原文）");
  };

  const translate = () => {
    if (!draft.scriptZh.trim()) { toast.error("请先填写中文原文"); return; }
    const lang = LANGS.find((l) => l.code === draft.scriptTargetLang)?.label ?? "英语";
    set("scriptSend", `[${lang}] ${draft.scriptZh}`);
    toast.success(`已翻译为${lang}，可手动修改`);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error("请填写任务名"); return; }
    if (!draft.region) { toast.error("请选择目标地区"); return; }
    if (!draft.total || draft.total < 1) { toast.error("请填写私信目标数量"); return; }
    if (!draft.keywords.trim()) { toast.error("请填写目标关键词"); return; }
    tasksActions.update(task.id, {
      name: draft.name.trim(),
      platforms: [draft.platform],
      total: draft.total,
      draft: {
        ...(task.draft ?? {}),
        name: draft.name.trim(),
        platforms: [draft.platform],
        reachRegion: draft.region,
        reachProducts: draft.products,
        reachKeywords: draft.keywords,
        scriptZh: draft.scriptZh,
        scriptTargetLang: draft.scriptTargetLang,
        scriptSend: draft.scriptSend,
      },
    });
    toast.success("已保存社媒触达任务修改");
    onOpenChange(false);
  };

  const tips = FORMAT_TIPS[draft.platform] ?? FORMAT_TIPS.Facebook;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-2 border-b px-6 py-4">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            编辑社媒拓客任务
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-normal text-primary">
              目标 {draft.total} · {draft.platform}
            </Badge>
          </DialogTitle>
          <p className="text-xs leading-5 text-muted-foreground">
            由系统按推广产品与关键词自动寻找目标账号，加好友并发送私信。
            <br />
            目标来源：系统按关键词自动搜索 · 已有名单？前往「我的收藏」批量社媒私信。
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-9.5rem)]">
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>任务名 <span className="text-destructive">*</span></Label>
                <Input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="例如：北美建材采购商首轮触达"
                />
              </div>
              <div className="space-y-1.5">
                <Label>平台 <span className="text-destructive">*</span></Label>
                <Select value={draft.platform} onValueChange={(v) => set("platform", v as Platform)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>目标地区 <span className="text-destructive">*</span></Label>
                <Select value={draft.region} onValueChange={(v) => set("region", v)}>
                  <SelectTrigger><SelectValue placeholder="选择目标地区" /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>私信目标数量 <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.total}
                  onChange={(e) => set("total", Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary" />
                  推广产品
                  <span className="text-xs font-normal text-muted-foreground">（来自企业信息主营产品，可手动添加，最多 3 个）</span>
                </Label>
                <span className="text-xs text-muted-foreground">已选 {draft.products.length}/3</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm hover:border-primary/40"
                  >
                    {draft.products.length === 0 ? (
                      <span className="text-muted-foreground">选择本次任务重点推广的产品（可选，最多 3 个）</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {draft.products.map((p) => (
                          <Badge key={p} variant="outline" className="gap-1 bg-primary/5 text-xs font-normal">
                            {p}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleProduct(p); }}
                            />
                          </Badge>
                        ))}
                      </span>
                    )}
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-2">
                  <div className="max-h-60 space-y-0.5 overflow-y-auto">
                    {PROMO_PRODUCTS.map((p) => (
                      <label
                        key={p}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Checkbox checked={draft.products.includes(p)} onCheckedChange={() => toggleProduct(p)} />
                        {p}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-muted-foreground">已选产品将用于 AI 文案生成与关键词推荐，聚焦 1-3 个产品转化更佳。</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  目标关键词 <span className="text-destructive">*</span>
                  <span className="ml-1 text-xs font-normal text-muted-foreground">（英文逗号分隔）</span>
                </Label>
                <Button variant="outline" size="sm" className="gap-1" onClick={aiKeywords}>
                  <Wand2 className="h-3.5 w-3.5" />AI 推荐
                </Button>
              </div>
              <Textarea
                value={draft.keywords}
                onChange={(e) => set("keywords", e.target.value)}
                placeholder="例如：steel supplier, building materials, 建筑螺纹钢"
                className="min-h-[76px]"
              />
              <p className="text-[11px] text-muted-foreground">AI 推荐依据「推广产品」，请先选择产品；每个产品推荐 3-5 个关键词。</p>
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
              可用账号 <span className="px-1 font-semibold text-foreground">{AVAILABLE_ACCOUNTS}</span>
              <span className="text-muted-foreground"> · 单账号 {PER_ACCOUNT_LIMIT} 个/天</span>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">私信内容</h4>
                <Button variant="outline" size="sm" className="gap-1" onClick={aiScript}>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  AI 生成私信内容 <span className="text-success">免费</span>
                </Button>
              </div>

              <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <FileText className="h-3.5 w-3.5" />{draft.platform} 私信 · 格式规范
                </div>
                <ul className="space-y-0.5 pl-1 text-[11px] text-muted-foreground">
                  {tips.map((t) => <li key={t}>· {t}</li>)}
                </ul>
              </div>

              <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">中文原文</Label>
                  <Textarea
                    value={draft.scriptZh}
                    onChange={(e) => set("scriptZh", e.target.value)}
                    placeholder="Hi {联系人名}，我是 {我的公司} 的 {我的姓名}……（AI 生成默认为首发开发信）"
                    className="min-h-[140px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Languages className="h-3.5 w-3.5 text-primary" />实际发送内容
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Select value={draft.scriptTargetLang} onValueChange={(v) => set("scriptTargetLang", v)}>
                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGS.map((l) => (
                            <SelectItem key={l.code} value={l.code} className="text-xs">
                              {l.flag} {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={translate}>
                        <Languages className="h-3.5 w-3.5" />翻译
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={draft.scriptSend}
                    onChange={(e) => set("scriptSend", e.target.value)}
                    placeholder="选择目标语言后点击「翻译」，此处展示目标语言文案，可手动修改"
                    className={cn("min-h-[140px]")}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 px-6 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
          <Button size="sm" className="gap-1" onClick={save}>
            <Pencil className="h-3.5 w-3.5" />保存修改
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
