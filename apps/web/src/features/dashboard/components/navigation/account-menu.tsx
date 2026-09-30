import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import { CaretUpDown, SignOut, User } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import posthog from "posthog-js";
import { UserAvatar } from "@/features/account/components/user-avatar";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

function AccountTrigger(props: React.ComponentProps<typeof SidebarMenuButton>) {
  const currentUser = useQuery(api.auth.queries.getCurrentUser);
  const name = currentUser?.name || currentUser?.email || "Account";
  return (
    <SidebarMenuButton
      {...props}
      aria-label={`Account: ${name}`}
      className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center"
      size="lg"
      tooltip={name}
    >
      <UserAvatar className="size-8" user={currentUser} />
      <span className="grid min-w-0 flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:sr-only">
        <span className="truncate font-medium" title={name}>
          {name}
        </span>
        {currentUser?.email ? (
          <span
            className="truncate text-muted-foreground text-xs"
            title={currentUser.email}
          >
            {currentUser.email}
          </span>
        ) : null}
      </span>
      <CaretUpDown
        aria-hidden="true"
        className="ms-auto group-data-[collapsible=icon]:hidden"
      />
    </SidebarMenuButton>
  );
}

export function AccountMenu() {
  const { isMobile, setOpenMobile } = useSidebar();
  async function handleSignOut() {
    capture("sign_out");
    posthog.reset();
    await authClient.signOut();
    window.location.href = "/";
  }
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<AccountTrigger />} />
        <DropdownMenuContent
          align="end"
          className="min-w-56"
          side={isMobile ? "top" : "right"}
          sideOffset={4}
        >
          <DropdownMenuItem
            render={
              <Link
                href="/dashboard/account"
                onNavigate={() => setOpenMobile(false)}
              />
            }
          >
            <User aria-hidden="true" className="size-4" />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <SignOut aria-hidden="true" className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
