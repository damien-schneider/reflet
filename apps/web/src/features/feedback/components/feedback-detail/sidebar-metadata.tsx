"use client";

import { Calendar } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Author {
  name?: string | null;
  email?: string;
  image?: string | null;
}

interface SidebarMetadataProps {
  createdAt: number;
  author?: Author | null;
}

export function SidebarMetadata({ createdAt, author }: SidebarMetadataProps) {
  return (
    <>
      <div>
        <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Date
        </h4>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>

      {author && (
        <div>
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Author
          </h4>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={author.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {author.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{author.name || "Anonymous"}</span>
          </div>
        </div>
      )}
    </>
  );
}
