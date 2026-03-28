import { Binoculars } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Muted, Text } from "@/components/ui/typography";

interface Keyword {
  _id: Id<"intelligenceKeywords">;
  keyword: string;
}

interface IntelligenceCardProps {
  basePath: string;
  keywords: Keyword[] | undefined;
}

export function IntelligenceCard({
  basePath,
  keywords,
}: IntelligenceCardProps) {
  if (!keywords) {
    return (
      <Link href={`${basePath}/intelligence`}>
        <Card className="h-full transition-colors hover:bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Binoculars className="size-4" />
              Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Muted className="text-xs">Loading...</Muted>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`${basePath}/intelligence`}>
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Binoculars className="size-4" />
            Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="font-medium" variant="bodySmall">
            {keywords.length} keyword
            {keywords.length === 1 ? "" : "s"} tracked
          </Text>
          {keywords.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {keywords.slice(0, 3).map((kw) => (
                <Badge className="text-[10px]" key={kw._id} variant="secondary">
                  {kw.keyword}
                </Badge>
              ))}
              {keywords.length > 3 && (
                <Badge className="text-[10px]" variant="outline">
                  +{keywords.length - 3}
                </Badge>
              )}
            </div>
          ) : (
            <Muted className="mt-1 text-xs">
              Add keywords to track mentions
            </Muted>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
