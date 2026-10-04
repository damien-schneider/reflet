import { cn } from "@ctrl-ui/react/lib/cn";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "@ctrl-ui/react/ui/sidebar";
import { useSearchParams } from "next/navigation";
import { createContext, use, useState } from "react";
import { createPortal } from "react-dom";
import {
  type NavItem,
  NavLink,
} from "@/features/dashboard/components/navigation/nav-group";
import { activeNavItem } from "@/features/dashboard/components/navigation/org-sections";

const SectionPanelSlot = createContext<HTMLElement | null>(null);

export function SectionPanelHost({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <SectionPanelSlot value={slot}>
      <div className="contents" ref={setSlot} />
      {children}
    </SectionPanelSlot>
  );
}

export function SectionPanel({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  const slot = use(SectionPanelSlot);
  if (!slot) {
    return null;
  }
  return createPortal(
    <Sidebar
      className={cn("hidden shrink-0 lg:flex", className)}
      collapsible="none"
      label={title}
    >
      <SidebarHeader className="h-14 shrink-0 justify-center px-4">
        <h2 className="text-heading-2 tracking-tight">{title}</h2>
      </SidebarHeader>
      {children}
      <SidebarRail aria-label="Resize panel" resizable />
    </Sidebar>,
    slot
  );
}

export interface NavItemGroup {
  items: NavItem[];
  label?: string;
}

export function SectionNavPanel({
  groups,
  pathname,
  title,
}: {
  groups: NavItemGroup[];
  pathname: string;
  title: string;
}) {
  const activeItem = activeNavItem(
    groups.flatMap((group) => group.items),
    pathname,
    useSearchParams()
  );
  return (
    <SectionPanel title={title}>
      <SidebarContent>
        {groups.map(({ items, label = title }) => (
          <SidebarGroup key={label}>
            {label === title ? null : (
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
            )}
            <SidebarMenu aria-label={label}>
              {items.map((item) => (
                <NavLink
                  isActive={item === activeItem}
                  item={item}
                  key={item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </SectionPanel>
  );
}
