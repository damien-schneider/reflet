"use client";

import {
  CheckCircle,
  DotsSixVertical,
  DotsThreeVertical,
  MapPin,
  Trash,
} from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";

interface TagCardProps {
  tag: {
    _id: Id<"tags">;
    name: string;
    color: string;
    isDoneStatus: boolean;
    isRoadmapLane: boolean;
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
            {tag.isRoadmapLane && (
              <DotsSixVertical className="h-4 w-4 text-muted-foreground" />
            )}
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: tag.color }}
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
      <CardContent className="pt-0">
        <div className="flex gap-2">
          {tag.isRoadmapLane && (
            <Badge variant="outline">
              <MapPin className="mr-1 h-3 w-3" />
              Roadmap Lane
            </Badge>
          )}
          {tag.isDoneStatus && (
            <Badge variant="secondary">
              <CheckCircle className="mr-1 h-3 w-3" />
              Done Status
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
