"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardHeader, CardTitle } from "@ctrl-ui/react/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { DotsThreeVertical, Trash } from "@phosphor-icons/react";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { categoryIsPublic } from "@reflet/backend/convex/feedback/categories/audience";
import { getTagSwatchClass } from "@/lib/tag-colors";

interface TagActions {
  onDelete: () => void;
  onEdit: () => void;
}
interface TagCardProps {
  actions: TagActions;
  isAdmin: boolean;
  tag: Pick<Doc<"tags">, "_id" | "name" | "color" | "settings">;
}

function TagCardActions({
  tagName,
  actions,
}: {
  tagName: string;
  actions: TagActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${tagName}`}
            className="h-8 w-8"
            iconOnly
            variant="ghost"
          />
        }
      >
        <DotsThreeVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={actions.onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem
          className="menu-item-danger"
          onClick={actions.onDelete}
        >
          <Trash aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TagCard({ tag, isAdmin, actions }: TagCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-4 w-4 rounded border",
                  getTagSwatchClass(tag.color)
                )}
              />
              <CardTitle className="text-base">{tag.name}</CardTitle>
            </div>
            <Badge variant="outline">
              {categoryIsPublic(tag) ? "Public" : "Team"}
            </Badge>
          </div>
          {isAdmin && <TagCardActions actions={actions} tagName={tag.name} />}
        </div>
      </CardHeader>
    </Card>
  );
}
