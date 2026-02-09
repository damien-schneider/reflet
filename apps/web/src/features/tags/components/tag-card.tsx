"use client";

import { DotsThreeVertical, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface TagCardProps {
  tag: {
    _id: Id<"tags">;
    name: string;
    color: string;
  };
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function TagCard({ tag, isAdmin, onEdit, onDelete }: TagCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-4 w-4 rounded border",
                getTagSwatchClass(tag.color)
              )}
            />
            <CardTitle className="text-base">{tag.name}</CardTitle>
          </div>
          {isAdmin && (
            <DropdownList>
              <DropdownListTrigger
                render={(props: React.ComponentProps<"button">) => (
                  <Button
                    {...props}
                    className="h-8 w-8"
                    size="icon"
                    variant="ghost"
                  >
                    <DotsThreeVertical className="h-4 w-4" />
                  </Button>
                )}
              />
              <DropdownListContent align="end">
                <DropdownListItem onClick={onEdit}>Edit</DropdownListItem>
                <DropdownListItem
                  className="text-destructive"
                  onClick={onDelete}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
