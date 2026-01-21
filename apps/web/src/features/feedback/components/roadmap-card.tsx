import { CaretUp } from "@phosphor-icons/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface RoadmapCardProps {
  feedback: {
    _id: string;
    title: string;
    voteCount: number;
    tags?: { _id: string; name: string; color: string }[];
  };
  orgSlug: string;
  boardSlug: string;
}

export function RoadmapCard({
  feedback,
  orgSlug,
  boardSlug,
}: RoadmapCardProps) {
  return (
    <Link
      href={`/dashboard/${orgSlug}/boards/${boardSlug}/feedback/${feedback._id}`}
    >
      <Card className="group cursor-pointer transition-all hover:border-primary hover:bg-accent/50">
        <CardContent className="p-3">
          <h4 className="font-medium text-sm transition-colors group-hover:text-primary">
            {feedback.title}
          </h4>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {feedback.tags
                ?.filter((t): t is NonNullable<typeof t> => t !== null)
                ?.slice(0, 2)
                .map((tag) => (
                  <Badge
                    className="h-4 px-1 text-[10px]"
                    key={tag._id}
                    style={{ borderColor: tag.color, color: tag.color }}
                    variant="outline"
                  >
                    {tag.name}
                  </Badge>
                ))}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <CaretUp className="h-3 w-3" />
              {feedback.voteCount}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
