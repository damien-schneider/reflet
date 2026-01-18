import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ChevronsUpDown,
  CreditCard,
  FileText,
  LogOut,
  MessageSquare,
  Settings,
  Tag,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

interface DashboardSidebarProps {
  orgSlug?: string;
  pathname: string;
}

export function DashboardSidebar({ orgSlug, pathname }: DashboardSidebarProps) {
  const currentUser = useQuery(api.auth.getCurrentUser);

  const buildPath = (path: string) =>
    orgSlug ? path.replace("$orgSlug", orgSlug) : "";

  const buildHref = (path: string) => {
    if (!orgSlug) {
      return "#";
    }
    return path.replace("$orgSlug", orgSlug);
  };

  const mainNavItems = orgSlug
    ? [
        {
          href: "/dashboard/$orgSlug/boards",
          icon: MessageSquare,
          label: "Boards",
        },
        {
          href: "/dashboard/$orgSlug/settings",
          icon: Settings,
          label: "Settings",
        },
      ]
    : [];

  const adminNavItems = orgSlug
    ? [
        {
          href: "/dashboard/$orgSlug/tags",
          icon: Tag,
          label: "Tags",
        },
        {
          href: "/dashboard/$orgSlug/changelog",
          icon: FileText,
          label: "Changelog",
        },
        {
          href: "/dashboard/$orgSlug/settings/members",
          icon: Users,
          label: "Members",
        },
        {
          href: "/dashboard/$orgSlug/settings/billing",
          icon: CreditCard,
          label: "Billing",
        },
      ]
    : [];

  const isActive = (path: string) => {
    const fullPath = buildPath(path);
    return fullPath ? pathname.startsWith(fullPath) : false;
  };

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          location.reload();
        },
      },
    });
  };

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b p-4">
        <OrganizationSwitcher currentOrgSlug={orgSlug} />
      </SidebarHeader>

      <SidebarContent>
        {orgSlug ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive(item.href)}
                        render={(props) => (
                          <Link href={buildHref(item.href)} {...props}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        )}
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive(item.href)}
                        render={(props) => (
                          <Link href={buildHref(item.href)} {...props}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        )}
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 py-4 text-muted-foreground text-sm">
                Select an organization to get started.
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <Collapsible className="group/collapsible">
              <CollapsibleTrigger
                render={(props) => (
                  <SidebarMenuButton {...props} size="lg">
                    <div className="flex size-8 items-center justify-center rounded-none bg-muted text-muted-foreground">
                      <User className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {currentUser?.name ?? "Account"}
                      </span>
                      <span className="truncate text-muted-foreground text-xs">
                        {currentUser?.email ?? ""}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                )}
              />
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton onClick={handleSignOut}>
                      <LogOut className="mr-2 size-4" />
                      <span>Sign out</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
