"use client";

import { SidebarMenuButton, SidebarMenuItem } from "@ctrl-ui/react/ui/sidebar";
import { ChatTeardropText } from "@phosphor-icons/react";
import { env } from "@reflet/env/web";
import { useTheme } from "next-themes";
import { RefletFeedback } from "reflet-sdk/feedback";
import { authClient } from "@/lib/auth-client";

export function DashboardFeedback() {
  const { data: session } = authClient.useSession();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <RefletFeedback
      publicKey={env.NEXT_PUBLIC_REFLET_PUBLIC_KEY}
      renderTrigger={(props) => (
        <SidebarMenuItem>
          <SidebarMenuButton
            {...props}
            aria-label="Give feedback to Reflet"
            className="group-data-[collapsible=icon]:justify-center"
            tooltip="Give feedback"
          >
            <ChatTeardropText aria-hidden />
            <span className="group-data-[collapsible=icon]:sr-only">
              Give feedback
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      theme={theme}
      user={
        session?.user && {
          email: session.user.email,
          id: session.user.id,
          name: session.user.name,
        }
      }
    />
  );
}
