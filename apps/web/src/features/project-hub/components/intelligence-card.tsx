import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Binoculars } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
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
                <Badge className="text-caption" key={kw._id}>
                  {kw.keyword}
                </Badge>
              ))}
              {keywords.length > 3 && (
                <Badge className="text-caption" variant="outline">
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
