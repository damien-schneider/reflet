"use client";

import { Globe, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MakePublicBannerProps {
  orgId: Id<"organizations">;
}

export function MakePublicBanner({ orgId }: MakePublicBannerProps) {
  const updateOrg = useMutation(api.organizations.mutations.update);
  const [isMakingPublic, setIsMakingPublic] = useState(false);

  const handleMakePublic = async () => {
    setIsMakingPublic(true);
    try {
      await updateOrg({
        id: orgId,
        isPublic: true,
      });
    } finally {
      setIsMakingPublic(false);
    }
  };

  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <Button
        className="w-full justify-start"
        disabled={isMakingPublic}
        onClick={handleMakePublic}
        size="sm"
        variant="ghost"
      >
        {isMakingPublic ? (
          <Spinner className="size-4 animate-spin" />
        ) : (
          <Globe className="size-4" />
        )}
        {isMakingPublic ? "Making public..." : "Make public"}
      </Button>
    </div>
  );
}
