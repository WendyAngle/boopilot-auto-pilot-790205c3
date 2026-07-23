import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  MessageSquareText,
  Languages,
  RotateCcw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getFriendData,
  platformMeta,
  translateZhTo,
  LANG_LABEL,
  SOURCE_LABEL,
  type FriendRequest,
  type FriendStatus,
} from "@/lib/friends-mock";

export const Route = createFileRoute("/_app/accounts/friends")({
  head: () => ({
    meta: [
      { title: "好友管理 — BooPilot" },
      {
        name: "description",
        content: "统一处理各账号收到的加好友请求，管理好友关系与备注信息。",
      },
      { property: "og:title", content: "好友管理 — BooPilot" },
      {
        property: "og:description",
        content: "统一处理各账号收到的加好友请求，管理好友关系与备注信息。",
      },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const { accounts, requests: initial } = useMemo(() => getFriendData(), []);
  const [requests, setRequests] = useState<FriendRequest[]>(initial);
  const [activeAccountId, setActiveAccountId] = useState(accounts[0]?.id ?? "");
  const [tab, setTab] = useState<FriendStatus>("pending");
  const [activeId, setActiveId] = useState<string>("");
  const [keyword, setKeyword] = useState("");

  // 账号维度待处理计数
  const pendingByAccount = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach((r) => {
      if (r.status === "pending") {
        map.set(r.accountId, (map.get(r.accountId) ?? 0) + 1);
      }
    });
    return map;
  }, [requests]);

  const countsForActive = useMemo(() => {
    const c = { pending: 0, accepted: 0, rejected: 0 };
    requests
      .filter((r) => r.accountId === activeAccountId)
      .forEach((r) => {
        c[r.status]++;
      });
    return c;
  }, [requests, activeAccountId]);

  const listItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return requests
      .filter((r) => r.accountId === activeAccountId && r.status === tab)
      .filter((r) =>
        kw
          ? r.peerName.toLowerCase().includes(kw) ||
            r.peerHandle.toLowerCase().includes(kw) ||
            (r.requestText ?? "").toLowerCase().includes(kw)
          : true,
      );
  }, [requests, activeAccountId, tab, keyword]);

  useEffect(() => {
    if (!listItems.length) {
      setActiveId("");
      return;
    }
    if (!listItems.find((r) => r.id === activeId)) {
      setActiveId(listItems[0].id);
    }
  }, [listItems, activeId]);

  const active = requests.find((r) => r.id === activeId);
  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  // 动作弹窗
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [noteEditOpen, setNoteEditOpen] = useState(false);

  const patch = (id: string, p: Partial<FriendRequest>) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  };

  const now = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const approve = (welcomeZh: string, note: string) => {
    if (!active) return;
    const welcomeText = welcomeZh.trim()
      ? active.peerLang === "zh"
        ? welcomeZh
        : translateZhTo(active.peerLang, welcomeZh)
      : undefined;
    patch(active.id, {
      status: "accepted",
      decidedAt: now(),
      welcomeZh: welcomeZh.trim() || undefined,
      welcomeText,
      note: note.trim() || undefined,
    });
    toast.success(
      welcomeText ? "已通过，欢迎语已发送给对方" : "已通过好友申请",
    );
    setApproveOpen(false);
  };

  const reject = (publicReasonZh: string, note: string) => {
    if (!active) return;
    const publicReasonText = publicReasonZh.trim()
      ? active.peerLang === "zh"
        ? publicReasonZh.trim()
        : translateZhTo(active.peerLang, publicReasonZh.trim())
      : undefined;
    patch(active.id, {
      status: "rejected",
      decidedAt: now(),
      publicReasonZh: publicReasonZh.trim() || undefined,
      publicReasonText,
      note: note.trim() || undefined,
    });
    toast.success(
      publicReasonText ? "已拒绝，说明已发送给对方" : "已拒绝好友申请",
    );
    setRejectOpen(false);
  };


  const restore = () => {
    if (!active) return;
    patch(active.id, { status: "pending", decidedAt: undefined });
    toast.success("已恢复为待处理");
    setRestoreOpen(false);
  };

  const removeFriend = () => {
    if (!active) return;
    setRequests((prev) => prev.filter((r) => r.id !== active.id));
    toast.success("已解除好友关系");
    setRemoveOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">好友管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          统一查看各账号收到的加好友请求，通过或拒绝后附加备注/欢迎语，已通过的好友进入「好友列表」。
        </p>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-[240px_320px_1fr] gap-3">
        {/* 左：账号列表 */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            账号（{accounts.length}）
          </div>
          <ScrollArea className="h-[calc(100%-33px)]">
            <div className="p-1">
              {accounts.map((a) => {
                const meta = platformMeta(a.platform);
                const pend = pendingByAccount.get(a.id) ?? 0;
                const isActive = a.id === activeAccountId;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActiveAccountId(a.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
                      isActive ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={a.avatar}
                        alt={a.username}
                        className="h-8 w-8 rounded-full border object-cover"
                      />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                          meta.cls,
                        )}
                      >
                        {meta.letter}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {a.username}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {a.platformId}
                      </div>
                    </div>
                    {pend > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-5 shrink-0 px-1.5 text-[10px]"
                      >
                        {pend}
                      </Badge>
                    )}
                  </button>
                );
              })}
              {accounts.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  当前租户下暂无账号
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 中：分类与列表 */}
        <div className="flex min-h-0 flex-col rounded-lg border bg-card">
          <div className="border-b p-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as FriendStatus)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="gap-1.5">
                  待处理
                  {countsForActive.pending > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-4 min-w-4 px-1 text-[10px]"
                    >
                      {countsForActive.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accepted" className="gap-1.5">
                  好友
                  <span className="text-[10px] text-muted-foreground">
                    {countsForActive.accepted}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-1.5">
                  已拒绝
                  <span className="text-[10px] text-muted-foreground">
                    {countsForActive.rejected}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索昵称 / 句柄 / 留言"
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {listItems.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md border p-2 text-left transition-colors",
                    r.id === activeId
                      ? "border-primary bg-accent"
                      : "border-transparent hover:bg-accent/50",
                  )}
                >
                  <img
                    src={r.peerAvatar}
                    alt={r.peerName}
                    className="h-9 w-9 shrink-0 rounded-full border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">
                        {r.peerName}
                      </div>
                      <div className="shrink-0 text-[10px] text-muted-foreground">
                        {(r.decidedAt ?? r.requestedAt).slice(5, 16)}
                      </div>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.peerHandle}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[10px] font-normal"
                      >
                        {SOURCE_LABEL[r.source]}
                      </Badge>
                      {r.mutualFriends > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          共同好友 {r.mutualFriends}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {listItems.length === 0 && (
                <div className="px-3 py-12 text-center text-xs text-muted-foreground">
                  暂无{tab === "pending" ? "待处理申请" : tab === "accepted" ? "好友" : "已拒绝记录"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 右：详情与操作 */}
        <div className="flex min-h-0 flex-col rounded-lg border bg-card">
          {active && activeAccount ? (
            <>
              <div className="border-b px-4 py-3">
                <div className="flex items-start gap-3">
                  <img
                    src={active.peerAvatar}
                    alt={active.peerName}
                    className="h-12 w-12 rounded-full border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold">
                        {active.peerName}
                      </div>
                      <StatusBadge status={active.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {active.peerHandle} · {LANG_LABEL[active.peerLang]}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      请求账号：{activeAccount.username} · {activeAccount.platform}
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                  {/* 元信息 */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <MetaCell
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="共同好友"
                      value={String(active.mutualFriends)}
                    />
                    <MetaCell
                      icon={<Sparkles className="h-3.5 w-3.5" />}
                      label="来源"
                      value={SOURCE_LABEL[active.source]}
                    />
                    <MetaCell
                      icon={<MessageSquareText className="h-3.5 w-3.5" />}
                      label="申请时间"
                      value={active.requestedAt.slice(5, 16)}
                    />
                  </div>

                  {/* 申请留言 */}
                  {active.requestText && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <MessageSquareText className="h-3 w-3" />
                        申请留言 · {LANG_LABEL[active.peerLang]}
                      </div>
                      <div className="text-sm leading-relaxed">
                        {active.requestText}
                      </div>
                      {active.requestTranslation && (
                        <>
                          <Separator className="my-2" />
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Languages className="h-3 w-3" />
                            中文翻译
                          </div>
                          <div className="text-sm leading-relaxed text-muted-foreground">
                            {active.requestTranslation}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 已通过：欢迎语与备注 */}
                  {active.status === "accepted" && (
                    <>
                      {active.welcomeZh && (
                        <div className="rounded-md border p-3">
                          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                            通过时发送的欢迎语
                          </div>
                          <div className="text-sm">{active.welcomeZh}</div>
                          {active.welcomeText &&
                            active.welcomeText !== active.welcomeZh && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                → {active.welcomeText}
                              </div>
                            )}
                        </div>
                      )}
                      <MetaLine
                        label="成为好友时间"
                        value={active.decidedAt ?? "—"}
                      />
                      {active.lastInteractAt && (
                        <MetaLine
                          label="最近互动"
                          value={active.lastInteractAt}
                        />
                      )}
                    </>
                  )}

                  {/* 已拒绝：拒绝时间 + 对外说明 */}
                  {active.status === "rejected" && (
                    <>
                      {active.decidedAt && (
                        <MetaLine label="拒绝时间" value={active.decidedAt} />
                      )}
                      {active.publicReasonZh && (
                        <div className="rounded-md border p-3">
                          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                            拒绝时对外发送的说明
                          </div>
                          <div className="text-sm">{active.publicReasonZh}</div>
                          {active.publicReasonText &&
                            active.publicReasonText !== active.publicReasonZh && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                → {active.publicReasonText}
                              </div>
                            )}
                        </div>
                      )}
                    </>
                  )}

                  {/* 内部备注 */}
                  {(active.status !== "pending" || active.note) && (
                    <div className="rounded-md border border-dashed p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          内部备注（仅自己可见）
                        </span>
                        {active.status === "accepted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setNoteEditOpen(true)}
                          >
                            编辑
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {active.note || "暂无备注"}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-4 py-3">
                {active.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectOpen(true)}
                      className="gap-1.5"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      拒绝
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setApproveOpen(true)}
                      className="gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      通过
                    </Button>
                  </>
                )}
                {active.status === "accepted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveOpen(true)}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    解除好友
                  </Button>
                )}
                {active.status === "rejected" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRestoreOpen(true)}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    恢复为待处理
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              <div>
                <UserPlus className="mx-auto mb-2 h-8 w-8 opacity-40" />
                请选择一条好友申请查看详情
              </div>
            </div>
          )}
        </div>
      </div>

      {active && (
        <>
          <ApproveDialog
            open={approveOpen}
            onOpenChange={setApproveOpen}
            request={active}
            onConfirm={approve}
          />
          <RejectDialog
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            request={active}
            onConfirm={reject}
          />
          <NoteEditDialog
            open={noteEditOpen}
            onOpenChange={setNoteEditOpen}
            defaultValue={active.note ?? ""}
            onConfirm={(note) => {
              patch(active.id, { note: note.trim() || undefined });
              toast.success("备注已更新");
              setNoteEditOpen(false);
            }}
          />
          <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认解除好友关系？</AlertDialogTitle>
                <AlertDialogDescription>
                  将解除与「{active.peerName}」的好友关系，该记录会从列表中移除，
                  此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={removeFriend}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  确认解除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>恢复为待处理？</AlertDialogTitle>
                <AlertDialogDescription>
                  该好友申请将回到「待处理」队列，你可以重新决定通过或拒绝。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={restore}>确认恢复</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: FriendStatus }) {
  if (status === "pending")
    return (
      <Badge className="border-warning/30 bg-warning/10 text-warning" variant="outline">
        待处理
      </Badge>
    );
  if (status === "accepted")
    return (
      <Badge className="border-success/30 bg-success/10 text-success" variant="outline">
        好友
      </Badge>
    );
  return (
    <Badge className="border-muted text-muted-foreground" variant="outline">
      已拒绝
    </Badge>
  );
}

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ApproveDialog({
  open,
  onOpenChange,
  request,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: FriendRequest;
  onConfirm: (welcomeZh: string, note: string) => void;
}) {
  const [welcomeZh, setWelcomeZh] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) {
      setWelcomeZh("");
      setNote("");
    }
  }, [open]);

  const preview =
    welcomeZh.trim() && request.peerLang !== "zh"
      ? translateZhTo(request.peerLang, welcomeZh.trim())
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-success" />
            通过好友申请
          </DialogTitle>
          <DialogDescription>
            通过后「{request.peerName}」将进入好友列表。可以附加欢迎语与内部备注（均为选填）。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">对外欢迎语（中文，自动翻译发送）</Label>
            <Textarea
              value={welcomeZh}
              onChange={(e) => setWelcomeZh(e.target.value)}
              placeholder="例如：感谢添加～之后多交流"
              rows={2}
              className="text-sm"
            />
            {preview && (
              <div className="rounded-md border border-dashed bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
                <span className="mr-1">→ {LANG_LABEL[request.peerLang]}：</span>
                {preview}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">内部备注（仅自己可见）</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：潜在合作对象，保持互动"
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onConfirm(welcomeZh, note)}>确认通过</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  request,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: FriendRequest;
  onConfirm: (publicReasonZh: string, note: string) => void;
}) {
  const PRESETS = [
    "感谢你的关注！近期不便新增好友，欢迎继续互动交流。",
    "抱歉，账号目前仅接受工作相关联系，感谢理解。",
    "你好，暂不方便添加为好友，如有商务合作可通过私信联系。",
  ];
  const [publicReasonZh, setPublicReasonZh] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) {
      setPublicReasonZh("");
      setNote("");
    }
  }, [open]);

  const preview =
    publicReasonZh.trim() && request.peerLang !== "zh"
      ? translateZhTo(request.peerLang, publicReasonZh.trim())
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" />
            拒绝好友申请
          </DialogTitle>
          <DialogDescription>
            拒绝后可选择性地发送对外说明；若留空则不通知对方，仅在平台内记录。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">对外说明（中文，自动翻译发送给对方，选填）</Label>
            </div>
            <Textarea
              value={publicReasonZh}
              onChange={(e) => setPublicReasonZh(e.target.value)}
              placeholder="留空则不通知对方；填写后将以对方语言礼貌发送"
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPublicReasonZh(p)}
                  className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  {p.length > 14 ? p.slice(0, 14) + "…" : p}
                </button>
              ))}
            </div>
            {preview && (
              <div className="rounded-md border border-dashed bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
                <span className="mr-1">→ {LANG_LABEL[request.peerLang]}：</span>
                {preview}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">内部备注（仅自己可见，选填）</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：疑似营销账号，暂不通过"
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(publicReasonZh, note)}
          >
            确认拒绝
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteEditDialog({
  open,
  onOpenChange,
  defaultValue,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValue: string;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState(defaultValue);
  useEffect(() => {
    if (open) setNote(defaultValue);
  }, [open, defaultValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑内部备注</DialogTitle>
          <DialogDescription>备注仅自己可见，不会发送给对方。</DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onConfirm(note)}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
