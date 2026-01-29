"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { AddWebsiteDialog } from "./add-website-dialog";
import { WebsiteReferenceCard } from "./website-reference-card";

interface WebsiteReferenceListProps {
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}

export function WebsiteReferenceList({
  organizationId,
  isAdmin,
}: WebsiteReferenceListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const references = useQuery(api.website_references.list, { organizationId });

  if (references === undefined) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Website
          </Button>
        </div>
      )}

      {references.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <p className="text-muted-foreground">
              No website references added yet. Add websites to provide
              additional context for AI clarifications.
            </p>
          </CardContent>
        </Card>
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
        onOpenChange={setIsAddDialogOpen}
        open={isAddDialogOpen}
        organizationId={organizationId}
      />
    </div>
  );
}
