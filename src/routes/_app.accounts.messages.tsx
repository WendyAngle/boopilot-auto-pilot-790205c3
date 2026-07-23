import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Search, Send, Sparkles, Eraser, Languages, Loader2, CheckCheck, MessageSquare, AlertCircle, RotateCw, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getInboxData,
  platformMeta,
  aiSuggestReplies,
  translateZhTo,
  LANG_LABEL,
  type Conversation,
  type DirectMessage,
} from "@/lib/messages-mock";

export const Route = createFileRoute("/_app/accounts/messages")({
  head: () => ({
    meta: [
      { title: "私信管理 — BooPilot" },
      { name: "description", content: "统一查看与回复各账号收到的私信，支持自动翻译与 AI 生成回复。" },
      { property: "og:title", content: "私信管理 — BooPilot" },
      { property: "og:description", content: "统一查看与回复各账号收到的私信，支持自动翻译与 AI 生成回复。" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { accounts, conversations: initialConvs } = useMemo(() => getInboxData(), []);
  const [conversations, setConversations] = useState(initialConvs);
  const [activeAccountId, setActiveAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [keyword, setKeyword] = useState("");

  // 账号维度未读汇总
  const unreadByAccount = useMemo(() => {
    const map = new Map<string, number>();
    conversations.forEach((c) => {
      map.set(c.accountId, (map.get(c.accountId) ?? 0) + c.unread);
    });
    return map;
  }, [conversations]);

  const accountConvs = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return conversations
      .filter((c) => c.accountId === activeAccountId)
      .filter((c) =>
        kw
          ? c.peerName.toLowerCase().includes(kw) ||
            c.peerHandle.toLowerCase().includes(kw) ||
            c.messages.some((m) => m.text.toLowerCase().includes(kw))
          : true,
      );
  }, [conversations, activeAccountId, keyword]);

  // 默认选中该账号的第一条会话
  useEffect(() => {
    if (accountConvs.length === 0) {
      setActiveConvId("");
      return;
    }
    if (!accountConvs.find((c) => c.id === activeConvId)) {
      setActiveConvId(accountConvs[0].id);
    }
  }, [accountConvs, activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  const markRead = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              unread: 0,
              messages: c.messages.map((m) => (m.direction === "in" ? { ...m, read: true } : m)),
            }
          : c,
      ),
    );
  };

  useEffect(() => {
    if (activeConvId) markRead(activeConvId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  const handleSend = (msg: DirectMessage) => {
    if (!activeConv) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages: [...c.messages, msg],
              updatedAt: msg.time,
            }
          : c,
      ),
    );
  };

  const patchMessage = (convId: string, msgId: string, patch: Partial<DirectMessage>) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) }
          : c,
      ),
    );
  };

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + c.unread, 0),
    [conversations],
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">私信管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              集中查看托管账号收到的私信，支持原文翻译、AI 生成回复与一键翻译回复。
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="rounded-full">
              {accounts.length} 个账号
            </Badge>
            <Badge className="rounded-full bg-primary text-primary-foreground">
              {totalUnread} 条未读
            </Badge>
          </div>
        </div>

        <div className="grid h-[calc(100vh-13rem)] grid-cols-[240px_320px_1fr] gap-3 rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {/* Column 1: Accounts */}
          <div className="flex min-h-0 flex-col border-r">
            <div className="border-b px-3 py-2.5 text-sm font-medium">账号</div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {accounts.map((a) => {
                  const unread = unreadByAccount.get(a.id) ?? 0;
                  const meta = platformMeta(a.platform);
                  const active = a.id === activeAccountId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setActiveAccountId(a.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                        active ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="relative">
                        <img
                          src={a.avatar}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover"
                        />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-card",
                            meta.cls,
                          )}
                        >
                          {meta.letter}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{a.username}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {a.tenantName}
                        </div>
                      </div>
                      {unread > 0 && (
                        <Badge className="h-5 min-w-[20px] justify-center rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                          {unread}
                        </Badge>
                      )}
                    </button>
                  );
                })}
                {accounts.length === 0 && (
                  <div className="px-2 py-8 text-center text-xs text-muted-foreground">
                    暂无账号
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Column 2: Conversations */}
          <div className="flex min-h-0 flex-col border-r">
            <div className="border-b p-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索会话 / 内容"
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5">
                {accountConvs.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conv={c}
                    active={c.id === activeConvId}
                    onClick={() => setActiveConvId(c.id)}
                  />
                ))}
                {accountConvs.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-2 py-10 text-center text-xs text-muted-foreground">
                    <MessageSquare className="h-6 w-6 opacity-50" />
                    暂无私信会话
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Column 3: Chat window */}
          <div className="flex min-h-0 flex-col">
            {activeConv && activeAccount ? (
              <ChatWindow
                key={activeConv.id}
                conv={activeConv}
                accountName={activeAccount.username}
                accountPlatform={activeAccount.platform}
                onSend={handleSend}
                onPatch={(msgId, patch) => patchMessage(activeConv.id, msgId, patch)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 opacity-50" />
                请选择左侧的会话开始查看与回复
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ConversationItem({
  conv,
  active,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const last = conv.messages[conv.messages.length - 1];
  const preview =
    last.direction === "in"
      ? last.translation ?? last.text
      : last.sourceZh ?? last.text;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <img src={conv.peerAvatar} alt="" className="h-9 w-9 shrink-0 rounded-full bg-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{conv.peerName}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {conv.updatedAt.slice(5, 16)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {last.direction === "out" ? "我: " : ""}
            {preview}
          </p>
          {conv.unread > 0 && (
            <Badge className="h-4 min-w-[16px] justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
              {conv.unread}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <Badge variant="outline" className="h-4 rounded px-1 text-[9px] font-normal">
            {LANG_LABEL[conv.peerLang]}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function ChatWindow({
  conv,
  accountName,
  accountPlatform,
  onSend,
  onPatch,
}: {
  conv: Conversation;
  accountName: string;
  accountPlatform: string;
  onSend: (msg: DirectMessage) => void;
  onPatch: (msgId: string, patch: Partial<DirectMessage>) => void;
}) {
  const [draftZh, setDraftZh] = useState("");
  const [translated, setTranslated] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOptions, setAiOptions] = useState<{ zh: string; translated: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 会话切换时清空
    setDraftZh("");
    setTranslated("");
    setAiOptions([]);
  }, [conv.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conv.messages.length]);

  // 自动翻译（防抖）
  useEffect(() => {
    if (!autoTranslate || !draftZh.trim() || conv.peerLang === "zh") {
      setTranslated(conv.peerLang === "zh" ? draftZh : "");
      return;
    }
    const t = setTimeout(() => {
      setTranslated(translateZhTo(conv.peerLang, draftZh));
    }, 250);
    return () => clearTimeout(t);
  }, [draftZh, autoTranslate, conv.peerLang]);

  const handleAiGenerate = () => {
    setAiLoading(true);
    setTimeout(() => {
      setAiOptions(aiSuggestReplies(conv));
      setAiLoading(false);
    }, 700);
  };

  const handlePickAi = (opt: { zh: string; translated: string }) => {
    setDraftZh(opt.zh);
    setTranslated(opt.translated);
    setAiOptions([]);
  };

  const handleClear = () => {
    setDraftZh("");
    setTranslated("");
    setAiOptions([]);
  };

  const simulateSend = (msgId: string) => {
    // 模拟发送：约 15% 概率失败，用于覆盖失败态
    const delay = 900 + Math.random() * 800;
    setTimeout(() => {
      const failed = Math.random() < 0.15;
      if (failed) {
        onPatch(msgId, { status: "failed", failReason: "网络异常，消息未送达" });
        toast.error("发送失败，可点击重试");
      } else {
        onPatch(msgId, { status: "sent" });
      }
    }, delay);
  };

  const handleRetry = (msg: DirectMessage) => {
    onPatch(msg.id, { status: "sending", failReason: undefined });
    simulateSend(msg.id);
  };

  const handleSend = () => {
    const zh = draftZh.trim();
    if (!zh) return;
    const finalText = conv.peerLang === "zh" ? zh : translated || translateZhTo(conv.peerLang, zh);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const msgId = `${conv.id}-out-${Date.now()}`;
    onSend({
      id: msgId,
      direction: "out",
      lang: conv.peerLang,
      text: finalText,
      sourceZh: zh,
      time,
      status: "sending",
    });
    handleClear();
    simulateSend(msgId);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <img src={conv.peerAvatar} alt="" className="h-9 w-9 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{conv.peerName}</span>
            <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px] font-normal">
              {LANG_LABEL[conv.peerLang]}
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {conv.peerHandle} · 通过账号「{accountName}」({accountPlatform})
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-4 px-4 py-4">
          {conv.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} peerName={conv.peerName} onRetry={handleRetry} />
          ))}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-muted/30">
        {aiOptions.length > 0 && (
          <div className="space-y-1.5 border-b px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> AI 建议回复（点击填入）
            </div>
            {aiOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handlePickAi(opt)}
                className="w-full rounded-md border bg-card px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary hover:bg-accent"
              >
                <div>{opt.zh}</div>
                {conv.peerLang !== "zh" && (
                  <div className="mt-0.5 text-muted-foreground">{opt.translated}</div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="p-3">
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Languages className="h-3 w-3" />
              使用中文输入，
              <button
                onClick={() => setAutoTranslate((v) => !v)}
                className={cn(
                  "underline-offset-2 hover:underline",
                  autoTranslate ? "text-primary" : "",
                )}
              >
                自动翻译为 {LANG_LABEL[conv.peerLang]}
                {autoTranslate ? "（已开启）" : "（已关闭）"}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={handleAiGenerate}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    AI 生成回复
                  </Button>
                </TooltipTrigger>
                <TooltipContent>基于最新一条对方消息生成 3 条建议</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={handleClear}
                    disabled={!draftZh && !translated}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    清空
                  </Button>
                </TooltipTrigger>
                <TooltipContent>清空输入框及译文</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Textarea
            value={draftZh}
            onChange={(e) => setDraftZh(e.target.value)}
            placeholder="输入中文，系统将自动翻译为对方语言…（Ctrl/⌘ + Enter 发送）"
            rows={3}
            className="resize-none bg-card text-sm"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {autoTranslate && conv.peerLang !== "zh" && draftZh.trim() && (
            <div className="mt-2 rounded-md border border-dashed bg-card px-2.5 py-1.5">
              <div className="mb-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Languages className="h-3 w-3" />
                将发送为 {LANG_LABEL[conv.peerLang]}
              </div>
              <div className="text-sm">{translated || "…"}</div>
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={handleSend} disabled={!draftZh.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              发送回复
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function MessageBubble({
  msg,
  peerName,
  onRetry,
}: {
  msg: DirectMessage;
  peerName: string;
  onRetry: (msg: DirectMessage) => void;
}) {
  const isOut = msg.direction === "out";
  const status = msg.status;
  const isSending = isOut && status === "sending";
  const isFailed = isOut && status === "failed";
  return (
    <div className={cn("flex gap-2", isOut ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
          isOut ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isOut ? "我" : peerName.slice(0, 1)}
      </div>
      <div className={cn("max-w-[75%] space-y-1", isOut && "items-end text-right")}>
        <div className={cn("flex items-center gap-1.5", isOut && "flex-row-reverse")}>
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
              isOut
                ? "rounded-tr-sm bg-primary text-primary-foreground"
                : "rounded-tl-sm bg-card border",
              isSending && "opacity-70",
              isFailed && "opacity-90 ring-1 ring-destructive/40",
            )}
          >
            {msg.text}
          </div>
          {isSending && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
          {isFailed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRetry(msg)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                  aria-label="重新发送"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {msg.failReason ?? "发送失败"} · 点击重试
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {/* 翻译 */}
        {!isOut && msg.translation && (
          <div className="rounded-lg border border-dashed bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <div className="mb-0.5 flex items-center gap-1 text-[10px]">
              <Languages className="h-3 w-3" />
              译文(中文)
            </div>
            <div>{msg.translation}</div>
          </div>
        )}
        {isOut && msg.sourceZh && msg.sourceZh !== msg.text && (
          <div className="rounded-lg border border-dashed bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <div className="mb-0.5 flex items-center gap-1 text-[10px]">
              <Languages className="h-3 w-3" />
              原文(中文)
            </div>
            <div>{msg.sourceZh}</div>
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] text-muted-foreground",
            isOut && "justify-end",
          )}
        >
          <span>{msg.time.slice(5)}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{LANG_LABEL[msg.lang]}</span>
          {isOut && status === "sending" && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              发送中
            </span>
          )}
          {isOut && status === "sent" && (
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <CheckCheck className="h-3 w-3" />
              已送达
            </span>
          )}
          {isOut && status === "failed" && (
            <button
              onClick={() => onRetry(msg)}
              className="flex items-center gap-0.5 text-destructive hover:underline"
            >
              <AlertCircle className="h-3 w-3" />
              发送失败，重试
              <RotateCw className="h-3 w-3" />
            </button>
          )}
          {isOut && !status && <CheckCheck className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}
