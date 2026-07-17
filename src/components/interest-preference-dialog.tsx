import { useEffect, useState } from "react";
import {
  Copy,
  Trash2,
  Plus,
  Eye,
  Search,
  Sparkles,
  Heart,
  UserPlus,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { ManagedAccount } from "@/lib/managed-account-mock";

/* ============================================================ */
/* 设置兴趣偏好 弹窗（列表页 / 详情页共用）                       */
/* ============================================================ */

export function InterestPreferenceDialog({
  account,
  onOpenChange,
}: {
  account: ManagedAccount | null;
  onOpenChange: (open: boolean) => void;
}) {
  type PrefGroup = {
    id: string;
    interestKeywords: string;
    search: boolean;
    keywords: string;
    like: boolean;
    likeMin: number;
    likeMax: number;
    follow: boolean;
    followMin: number;
    followMax: number;
    comment: boolean;
    commentMin: number;
    commentMax: number;
    sentiment: string;
    style: string;
  };

  const makeGroup = (seed = false): PrefGroup => ({
    id: `pg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    interestKeywords: seed ? "travel；food；parenting" : "",
    search: seed,
    keywords: seed ? "travel" : "",
    like: seed,
    likeMin: 0,
    likeMax: 15,
    follow: seed,
    followMin: 0,
    followMax: 15,
    comment: seed,
    commentMin: 0,
    commentMax: 15,
    sentiment: "",
    style: "",
  });

  const [groups, setGroups] = useState<PrefGroup[]>([makeGroup(true)]);

  useEffect(() => {
    if (account) setGroups([makeGroup(true)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const setGroup = (idx: number, patch: Partial<PrefGroup>) =>
    setGroups((gs) => gs.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  const addGroup = () => setGroups((gs) => [...gs, makeGroup()]);
  const dupGroup = (idx: number) =>
    setGroups((gs) => {
      const copy: PrefGroup = {
        ...gs[idx],
        id: `pg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };
      const next = [...gs];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  const delGroup = (idx: number) =>
    setGroups((gs) => (gs.length > 1 ? gs.filter((_, i) => i !== idx) : gs));

  const handleSave = () => {
    toast.success(
      `已保存「${account?.username ?? ""}」的兴趣偏好（${groups.length} 组）`,
    );
    onOpenChange(false);
  };

  const RangeRow = ({
    min,
    max,
    onMin,
    onMax,
  }: {
    min: number;
    max: number;
    onMin: (n: number) => void;
    onMax: (n: number) => void;
  }) => (
    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Input
        type="number"
        min={0}
        max={100}
        value={min}
        onChange={(e) =>
          onMin(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))
        }
        className="h-7 w-14 text-xs"
      />
      <span>%</span>
      <span className="px-0.5">-</span>
      <Input
        type="number"
        min={0}
        max={100}
        value={max}
        onChange={(e) =>
          onMax(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))
        }
        className="h-7 w-14 text-xs"
      />
      <span>%</span>
    </div>
  );

  const ToggleRow = ({
    icon,
    title,
    desc,
    enabled,
    onToggle,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    enabled: boolean;
    onToggle: (v: boolean) => void;
    children?: React.ReactNode;
  }) => (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/40">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {enabled && children}
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-base">设置兴趣偏好</DialogTitle>
          <DialogDescription>
            为账号
            {account ? (
              <span className="mx-1 font-medium text-foreground">
                {account.username}
              </span>
            ) : null}
            配置兴趣画像与互动策略，将用于养号任务的内容浏览与互动选材。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto py-1 pr-1">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            为提升 AI 生成与匹配效果，关键词、情绪与风格建议尽可能使用英文填写；可设置多组偏好，养号任务将随机选择一组执行。
          </p>

          {groups.map((g, idx) => (
            <div key={g.id} className="space-y-2 rounded-lg border p-2">
              <div className="flex items-center justify-between border-b border-dashed pb-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    第 {idx + 1} 组
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    每次执行将随机选择一组偏好
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() => dupGroup(idx)}
                  >
                    <Copy className="h-3 w-3" />
                    复制
                  </Button>
                  {groups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
                      onClick={() => delGroup(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                      删除
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
                    <div className="text-xs font-medium text-foreground">
                      兴趣关键词
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        （选填）
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      用于浏览首页推荐 / Feed 流时筛选感兴趣的内容
                    </div>
                  </div>
                </div>
                <Input
                  value={g.interestKeywords}
                  onChange={(e) =>
                    setGroup(idx, { interestKeywords: e.target.value })
                  }
                  placeholder="推荐 3-5 个，以「；」分隔，推荐英文，如：travel；food；parenting"
                  className="ml-9 h-8 w-[calc(100%-2.25rem)] text-xs"
                />
              </div>

              {/* 搜索 */}
              <ToggleRow
                icon={<Search className="h-3.5 w-3.5" />}
                title="搜索"
                desc="搜索关键词浏览相关内容"
                enabled={g.search}
                onToggle={(v) => setGroup(idx, { search: v })}
              />
              {g.search && (
                <div className="ml-2 space-y-1.5 rounded-md border border-dashed border-border/60 bg-muted/20 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">关键词</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/5"
                      onClick={() => setGroup(idx, { keywords: "travel" })}
                    >
                      <Sparkles className="h-3 w-3" />
                      AI 生成
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    点击 AI 生成将自动根据设定的兴趣关键词或账号的兴趣和当前热点生成，可手动调整；建议使用英文设置一个关键词以提升匹配效果
                  </p>
                  <Textarea
                    value={g.keywords}
                    onChange={(e) => setGroup(idx, { keywords: e.target.value })}
                    placeholder="点击AI生成或手动输入"
                    className="min-h-[60px] text-xs"
                  />
                </div>
              )}

              {/* 点赞 */}
              <ToggleRow
                icon={<Heart className="h-3.5 w-3.5" />}
                title="点赞"
                desc="对浏览到的内容随机点赞"
                enabled={g.like}
                onToggle={(v) => setGroup(idx, { like: v })}
              >
                <RangeRow
                  min={g.likeMin}
                  max={g.likeMax}
                  onMin={(n) => setGroup(idx, { likeMin: n })}
                  onMax={(n) => setGroup(idx, { likeMax: n })}
                />
              </ToggleRow>

              {/* 关注 */}
              <ToggleRow
                icon={<UserPlus className="h-3.5 w-3.5" />}
                title="关注"
                desc="关注感兴趣的账号 / 主页"
                enabled={g.follow}
                onToggle={(v) => setGroup(idx, { follow: v })}
              >
                <RangeRow
                  min={g.followMin}
                  max={g.followMax}
                  onMin={(n) => setGroup(idx, { followMin: n })}
                  onMax={(n) => setGroup(idx, { followMax: n })}
                />
              </ToggleRow>

              {/* 评论 */}
              <ToggleRow
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                title="评论"
                desc="对浏览到的内容随机发布评论"
                enabled={g.comment}
                onToggle={(v) => setGroup(idx, { comment: v })}
              >
                <RangeRow
                  min={g.commentMin}
                  max={g.commentMax}
                  onMin={(n) => setGroup(idx, { commentMin: n })}
                  onMax={(n) => setGroup(idx, { commentMax: n })}
                />
              </ToggleRow>
              {g.comment && (
                <div className="ml-2 space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-2">
                  <div className="flex items-center gap-2 px-1.5">
                    <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
                      评论情绪
                    </span>
                    <Input
                      value={g.sentiment}
                      onChange={(e) => setGroup(idx, { sentiment: e.target.value })}
                      placeholder="推荐英文，如：warm / specific / low-key"
                      className="h-7 flex-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-1.5">
                    <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
                      评论风格
                    </span>
                    <Input
                      value={g.style}
                      onChange={(e) => setGroup(idx, { style: e.target.value })}
                      placeholder="推荐英文，如：short / natural / specific"
                      className="h-7 flex-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-dashed text-xs"
            onClick={addGroup}
          >
            <Plus className="h-3.5 w-3.5" />
            添加一组兴趣偏好
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
