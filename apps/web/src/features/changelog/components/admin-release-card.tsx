"use client";

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import {
  Calendar,
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminReleaseCardProps {
  release: {
    _id: Id<"releases">;
    version?: string;
    title: string;
    description?: string;
    publishedAt?: number;
    _creationTime: number;
  };
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

export function AdminReleaseCard({
  release,
  isAdmin,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
}: AdminReleaseCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{release.version}</Badge>
            <CardTitle className="text-lg">{release.title}</CardTitle>
            {release.publishedAt ? (
              <Badge variant="secondary">
                <Eye className="mr-1 h-3 w-3" />
                Published
              </Badge>
            ) : (
              <Badge variant="outline">
                <EyeOff className="mr-1 h-3 w-3" />
                Draft
              </Badge>
            )}
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props) => (
                  <Button {...props} size="icon" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {release.publishedAt ? (
                  <DropdownMenuItem onClick={onUnpublish}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Unpublish
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onPublish}>
                    <Eye className="mr-2 h-4 w-4" />
                    Publish
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <CardDescription className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Created {new Date(release._creationTime).toLocaleDateString()}
          </span>
          {release.publishedAt && (
            <span>
              Published {new Date(release.publishedAt).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-muted-foreground text-sm">
          {(release.description ?? "").replace(/<[^>]*>/g, "").slice(0, 300)}
          ...
        </p>
      </CardContent>
    </Card>
  );
}
