import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/accounts/friends")({
  head: () => ({
    meta: [
      { title: "好友管理 — BooPilot" },
      { name: "description", content: "统一管理各账号的好友关系与加友策略。" },
      { property: "og:title", content: "好友管理 — BooPilot" },
      { property: "og:description", content: "统一管理各账号的好友关系与加友策略。" },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  return (
    <PlaceholderPage
      title="好友管理"
      description="统一查看与维护各账号的好友关系，功能细节将在后续版本中上线。"
    />
  );
}
