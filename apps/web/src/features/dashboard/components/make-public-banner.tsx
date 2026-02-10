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
  const updateOrg = useMutation(api.organizations.update);
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
      <div className="space-y-2 rounded-lg border border-olive-600/20 bg-olive-600/5 p-3">
        <div className="flex items-center gap-2">
          <Globe className="size-4 shrink-0 text-olive-600" />
          <h3 className="font-medium text-olive-600 text-sm">
            Rendre l&apos;organisation publique
          </h3>
        </div>
        <p className="text-muted-foreground text-xs">
          Partagez votre roadmap et votre changelog avec le monde entier.
        </p>
        <Button
          className="h-7 w-full text-xs"
          disabled={isMakingPublic}
          onClick={handleMakePublic}
          size="sm"
          variant="default"
        >
          {isMakingPublic ? (
            <>
              <Spinner className="mr-2 h-3 w-3 animate-spin" />
              En cours...
            </>
          ) : (
            "Rendre publique"
          )}
        </Button>
      </div>
    </div>
  );
}
