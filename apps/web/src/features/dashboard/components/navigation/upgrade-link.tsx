import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import { Crown } from "@phosphor-icons/react";
import Link from "next/link";

export function UpgradeLink({ orgSlug }: { orgSlug: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="group-data-[collapsible=icon]:justify-center"
          render={
            <Link
              href={`/dashboard/${orgSlug}/project/billing`}
              onNavigate={() => setOpenMobile(false)}
            />
          }
          tooltip="Upgrade to Pro"
        >
          <Crown aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:sr-only">
            Upgrade to Pro
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
