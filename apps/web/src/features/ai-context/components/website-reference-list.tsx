"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Globe, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

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
    <Button onClick={onOpen} size="sm" variant="surface">
      <Plus aria-hidden />
      Add website
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
      <div
        aria-busy="true"
        className="flex flex-col gap-3"
        data-testid="website-references-loading"
      >
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {references.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Globe aria-hidden className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No website references</EmptyTitle>
            <EmptyDescription>
              {isAdmin
                ? "Add docs or marketing pages so the AI understands your product."
                : "An admin can add docs or marketing pages for extra AI context."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        references.map((reference) => (
          <WebsiteReferenceCard
            isAdmin={isAdmin}
            key={reference._id}
            reference={reference}
          />
        ))
      )}

      <AddWebsiteDialog
        onOpenChange={dialogState.setIsOpen}
        open={dialogState.isOpen}
        organizationId={organizationId}
      />
    </div>
  );
}
