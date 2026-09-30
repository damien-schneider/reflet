"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Globe } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

interface MakePublicBannerProps {
  orgId: Id<"organizations">;
}

export function MakePublicBanner({ orgId }: MakePublicBannerProps) {
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

  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <Button
        className="w-full justify-start"
        disabled={isMakingPublic}
        onClick={handleMakePublic}
        size="xs"
        variant="ghost"
      >
        {isMakingPublic ? (
          <Spinner data-icon="inline-start" size="xs" />
        ) : (
          <Globe
            aria-hidden="true"
            className="size-4"
            data-icon="inline-start"
          />
        )}
        {isMakingPublic ? "Making public…" : "Make organization public"}
      </Button>
    </div>
  );
}
