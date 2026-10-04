"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ctrl-ui/react/ui/sheet";
import { SidebarMenuButton, SidebarMenuItem } from "@ctrl-ui/react/ui/sidebar";
import { Lifebuoy, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/web";
import { useQuery } from "convex/react";
import { useState } from "react";
import { NavBadge } from "@/features/dashboard/components/nav-badge";
import { SupportDesk } from "@/features/support/components/desk/support-desk";

export function DashboardSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const desk = useQuery(api.support.settings.findOpenDeskByPublicKey, {
    publicKey: env.NEXT_PUBLIC_REFLET_PUBLIC_KEY,
  });
  const unreadReplies = useQuery(
    api.support.conversations.getUnreadCountForUser,
    desk ? { organizationId: desk._id } : "skip"
  );

  if (!desk) {
    return null;
  }

  const supportLabel = unreadReplies
    ? `Contact ${desk.name} support, ${unreadReplies} unread`
    : `Contact ${desk.name} support`;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-label={supportLabel}
          className="group-data-[collapsible=icon]:justify-center"
          onClick={() => setIsOpen(true)}
          tooltip={supportLabel}
        >
          <Lifebuoy aria-hidden />
          <span className="flex-1 group-data-[collapsible=icon]:sr-only">
            Support
          </span>
          {unreadReplies ? (
            <NavBadge count={unreadReplies} tone="attention" />
          ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>
      <Sheet onOpenChange={setIsOpen} open={isOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md" side="right">
          <SheetHeader className="flex-row items-start gap-3 border-b px-4 py-3">
            <div className="min-w-0 flex-1">
              <SheetTitle>{desk.name} support</SheetTitle>
              <SheetDescription>
                Questions, bugs, billing — the team replies right here.
              </SheetDescription>
            </div>
            <SheetClose
              render={
                <Button
                  aria-label="Close support"
                  iconOnly
                  size="sm"
                  variant="ghost"
                />
              }
            >
              <X aria-hidden />
            </SheetClose>
          </SheetHeader>
          <SupportDesk isGuest={false} org={desk} surface="panel" />
        </SheetContent>
      </Sheet>
    </>
  );
}
