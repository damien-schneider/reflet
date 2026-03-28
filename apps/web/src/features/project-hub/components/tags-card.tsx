import { Tag } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Muted, Text } from "@/components/ui/typography";

interface TagItem {
  _id: Id<"tags">;
  color: string;
  name: string;
}

interface TagsCardProps {
  basePath: string;
  tags: TagItem[] | undefined;
}

export function TagsCard({ basePath, tags }: TagsCardProps) {
  return (
    <Link href={`${basePath}/settings`}>
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tags ? (
            <>
              <Text className="font-medium" variant="bodySmall">
                {tags.length} tag{tags.length === 1 ? "" : "s"}
              </Text>
              {tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {tags.slice(0, 4).map((tag) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]"
                      key={tag._id}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                  ))}
                  {tags.length > 4 && (
                    <Badge className="text-[10px]" variant="outline">
                      +{tags.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </>
          ) : (
            <Muted className="text-xs">Loading...</Muted>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
