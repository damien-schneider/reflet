import { cn } from "@ctrl-ui/react/lib/cn";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "@ctrl-ui/react/ui/sidebar";
import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createContext, use, useState } from "react";
import { createPortal } from "react-dom";
import { FooterLinks } from "@/features/dashboard/components/navigation/footer-links";
import {
  type NavItem,
  NavLink,
} from "@/features/dashboard/components/navigation/nav-group";
import { activeNavItem } from "@/features/dashboard/components/navigation/org-sections";
import { useMemberOrganization } from "@/features/organizations/hooks/use-member-organization";

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

function PanelFooter() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  return (
    <SidebarFooter className="mt-auto max-lg:hidden">
      <FooterLinks org={useMemberOrganization(orgSlug)} />
    </SidebarFooter>
  );
}

export function SectionPanel({
  backHref,
  children,
  className,
  title,
}: {
  backHref?: string;
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
      data-section-panel=""
      label={title}
    >
      <SidebarHeader className="h-14 shrink-0 justify-center">
        <h2 className="mx-2 text-heading-2 tracking-tight">
          {backHref ? (
            <Link
              className="-ms-1 inline-flex items-center gap-1.5 rounded-md px-1 hover:text-muted-foreground"
              href={backHref}
            >
              <ArrowLeft aria-hidden className="size-5" />
              <span className="sr-only">Back to </span>
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
      </SidebarHeader>
      {children}
      <PanelFooter />
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
