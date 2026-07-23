import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListTodo,
  Users,
  FolderOpen,
  Building2,
  Tags,
  Server,
  Bot,
  Settings,
  Sparkles,
  Wallet,
  ChevronRight,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; url: string }[];
};

const nav: NavItem[] = [
  { title: "工作台", url: "/", icon: LayoutDashboard },
  {
    title: "账号管理",
    url: "/accounts",
    icon: Users,
    children: [
      { title: "账号列表", url: "/accounts/managed" },
      { title: "私信管理", url: "/accounts/messages" },
      { title: "好友管理", url: "/accounts/friends" },
    ],
  },
  {
    title: "成品素材",
    url: "/materials",
    icon: FolderOpen,
    children: [
      { title: "贴文素材", url: "/materials/posts" },
    ],
  },
  {
    title: "任务管理",
    url: "/tasks",
    icon: ListTodo,
    children: [
      { title: "任务模版", url: "/tasks/templates" },
      { title: "任务列表", url: "/tasks/list" },
    ],
  },

  {
    title: "AI 创作",
    url: "/ai",
    icon: Sparkles,
    children: [
      { title: "视频生成", url: "/ai/video" },
      { title: "内容消除", url: "/ai/erase" },
      { title: "图片生成", url: "/ai/image" },
      { title: "爆款复刻", url: "/ai/replicate" },
      { title: "视频混剪", url: "/ai/remix" },
      { title: "AI 成片库", url: "/ai/library" },
      { title: "我的原料", url: "/ai/materials" },
    ],
  },
  {
    title: "租户管理",
    url: "/tenants",
    icon: Building2,
    children: [{ title: "租户列表", url: "/tenants/list" }],
  },
  {
    title: "计费中心",
    url: "/billing",
    icon: Wallet,
    children: [
      { title: "套餐管理", url: "/billing/plans" },
      { title: "积分管理", url: "/billing/discounts" },
    ],
  },
  {
    title: "资源管理",
    url: "/resources",
    icon: Server,
    children: [
      { title: "设备列表", url: "/resources/devices" },
      { title: "IP列表", url: "/resources/ips" },
      { title: "镜像实例", url: "/resources/images" },
    ],
  },
  {
    title: "系统管理",
    url: "/system",
    icon: Settings,
    children: [
      { title: "用户管理", url: "/system/users" },
      { title: "角色管理", url: "/system/roles" },
      { title: "菜单管理", url: "/system/menus" },
      { title: "模型管理", url: "/system/models" },
      { title: "AI 预设物料", url: "/system/ai-presets" },
      { title: "标签管理", url: "/tags/list" },
    ],

  },

];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url;
  const isGroupActive = (item: NavItem) =>
    item.children?.some((c) => pathname === c.url) ?? false;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold leading-tight">BooPilot</span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              业务运营自动驾驶
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                if (!item.children) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.title}
                    defaultOpen={isGroupActive(item)}
                    className="group/collapsible"
                    asChild
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((c) => (
                            <SidebarMenuSubItem key={c.url}>
                              <SidebarMenuSubButton asChild isActive={isActive(c.url)}>
                                <Link to={c.url}>{c.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
