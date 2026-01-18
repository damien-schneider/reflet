import { CalendarCheck, Kanban, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import UserMenu from "@/components/user-menu";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  className?: string;
}

const navItems = [
  {
    title: "Boards",
    icon: MessageSquare,
    to: "/dashboard/$orgSlug/boards",
  },
  {
    title: "Changelog",
    icon: CalendarCheck,
    to: "/dashboard/$orgSlug/changelog",
  },
  {
    title: "Tags",
    icon: Kanban,
    to: "/dashboard/$orgSlug/tags",
  },
] as const;

const adminItems = [
  {
    title: "Settings",
    icon: Settings,
    to: "/dashboard/$orgSlug/settings",
  },
] as const;

const TRAILING_SLASH_REGEX = /\/$/;

export function AppSidebar({ className }: AppSidebarProps) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string | undefined;

  const currentPath = usePathname();

  const isActive = (to: string) => {
    const toPath = to.replace("$orgSlug", orgSlug ?? "");
    const normalizedPath =
      currentPath === "/" ? "/" : currentPath.replace(TRAILING_SLASH_REGEX, "");
    const normalizedTo =
      toPath === "/" ? "/" : toPath.replace(TRAILING_SLASH_REGEX, "");
    return (
      normalizedPath === normalizedTo ||
      normalizedPath.startsWith(`${normalizedTo}/`)
    );
  };

  return (
    <Sidebar className={cn(className)} collapsible="icon">
      <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:p-2">
        <OrganizationSwitcher currentOrgSlug={orgSlug} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const href = item.to.replace("$orgSlug", orgSlug ?? "");

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to)}
                      tooltip={item.title}
                    >
                      <Link href={href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => {
                const href = item.to.replace("$orgSlug", orgSlug ?? "");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to)}
                      tooltip={item.title}
                    >
                      <Link href={href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={cn("flex flex-col", className)}>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[variant=inset]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
