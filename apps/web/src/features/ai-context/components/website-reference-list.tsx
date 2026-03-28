"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";

import { AddWebsiteDialog } from "./add-website-dialog";
import { WebsiteReferenceCard } from "./website-reference-card";

interface WebsiteReferenceListProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

export function useWebsiteReferenceDialog() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, setIsOpen };
}

export function WebsiteReferenceAddButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button onClick={onOpen} size="sm" variant="outline">
      <Plus className="mr-1.5 h-4 w-4" />
      Add Website
    </Button>
  );
}

export function WebsiteReferenceList({
  organizationId,
  isAdmin,
  dialogState,
}: WebsiteReferenceListProps & {
  dialogState: { isOpen: boolean; setIsOpen: (open: boolean) => void };
}) {
  const references = useQuery(api.integrations.website_references.list, {
    organizationId,
  });

  if (references === undefined) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {references.length === 0 ? (
        <div className="py-4 text-center">
          <Muted>Nothing yet</Muted>
        </div>
      ) : (
        <div className="space-y-3">
          {references.map((reference) => (
            <WebsiteReferenceCard
              isAdmin={isAdmin}
              key={reference._id}
              reference={reference}
            />
          ))}
        </div>
      )}

      <AddWebsiteDialog
        onOpenChange={dialogState.setIsOpen}
        open={dialogState.isOpen}
        organizationId={organizationId}
      />
    </div>
  );
}
