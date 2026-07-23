import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/accounts/messages")({
  head: () => ({
    meta: [
      { title: "私信管理 — BooPilot" },
      { name: "description", content: "统一管理各账号的私信会话与回复策略。" },
      { property: "og:title", content: "私信管理 — BooPilot" },
      { property: "og:description", content: "统一管理各账号的私信会话与回复策略。" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <PlaceholderPage
      title="私信管理"
      description="统一查看与处理各账号的私信会话，功能细节将在后续版本中上线。"
    />
  );
}
