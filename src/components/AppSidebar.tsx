import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, FolderKanban, LayoutDashboard, LogOut, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/authService";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = () => {
    qc.clear();
    authService.logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Zap className="size-4" />
          </div>
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">TaskFlow</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path.startsWith(i.url)} tooltip={i.title}>
                    <Link to={i.url}>
                      <i.icon />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:hidden">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase">
            {user?.name?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
