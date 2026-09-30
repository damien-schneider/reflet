import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { NavBadge } from "@/features/dashboard/components/nav-badge";

export interface NavItem {
  adminOnly?: boolean;
  badge?: { count: number; tone: "attention" | "neutral"; label: string };
  childRoutePrefix?: string;
  href: string;
  icon: Icon;
  label: string;
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const name = item.badge
    ? `${item.label}, ${item.badge.count} ${item.badge.label}`
    : item.label;
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-current={isActive ? "page" : undefined}
        aria-label={item.badge ? name : undefined}
        className="group-data-[collapsible=icon]:justify-center"
        isActive={isActive}
        render={
          <Link href={item.href} onNavigate={() => setOpenMobile(false)} />
        }
        size={isMobile ? "default" : "sm"}
        tooltip={name}
      >
        <item.icon aria-hidden="true" />
        <span className="flex-1 group-data-[collapsible=icon]:sr-only">
          {item.label}
        </span>
        {item.badge ? (
          <NavBadge count={item.badge.count} tone={item.badge.tone} />
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  const activeItem = items
    .filter(
      ({ href, childRoutePrefix = href }) =>
        pathname === href || pathname.startsWith(`${childRoutePrefix}/`)
    )
    .sort((first, second) => second.href.length - first.href.length)[0];
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label={label}>
          {items.map((item) => (
            <NavLink
              isActive={item === activeItem}
              item={item}
              key={item.href}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
