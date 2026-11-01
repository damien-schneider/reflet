"use client";

import { SidebarMenuButton, SidebarMenuItem } from "@ctrl-ui/react/ui/sidebar";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Globe } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

export function MakePublicItem({ orgId }: { orgId: Id<"organizations"> }) {
  const updateOrg = useMutation(api.organizations.mutations.update);
  const [isMakingPublic, setIsMakingPublic] = useState(false);

  const setVisibility = async (isPublic: boolean) => {
    await updateOrg({ id: orgId, isPublic });
  };

  const handleMakePublic = async () => {
    setIsMakingPublic(true);
    try {
      await setVisibility(true);
      toast("Organization is now public", {
        actionProps: {
          children: "Undo",
          onClick: () => {
            setVisibility(false).catch(() => {
              toast.error("Couldn’t make the organization private. Try again.");
            });
          },
        },
      });
    } catch {
      toast.error("Couldn’t make the organization public. Try again.");
    }
    setIsMakingPublic(false);
  };

  const label = isMakingPublic ? "Making public…" : "Make organization public";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        disabled={isMakingPublic}
        onClick={handleMakePublic}
        tooltip={label}
      >
        {isMakingPublic ? <Spinner size="xs" /> : <Globe aria-hidden="true" />}
        <span className="group-data-[collapsible=icon]:sr-only">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
