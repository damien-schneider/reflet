import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { CaretUp, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { TagBadge } from "@/components/tag-badge";

interface RoadmapCardProps {
  boardSlug: string;
  feedback: {
    _id: string;
    title: string;
    voteCount: number;
    tags?: {
      _id: string;
      name: string;
      color: string;
      icon?: string;
      appliedByAi?: boolean;
    }[];
  };
  orgSlug: string;
}

export function RoadmapCard({
  feedback,
  orgSlug,
  boardSlug,
}: RoadmapCardProps) {
  return (
    <Link
      href={`/dashboard/${orgSlug}/boards/${boardSlug}/feedback/${feedback._id}`}
      prefetch={true}
    >
      <Card className="group cursor-pointer transition-colors hover:border-brand hover:bg-accent/50">
        <CardContent className="p-3">
          <h4 className="font-medium text-sm transition-colors group-hover:text-brand-text">
            {feedback.title}
          </h4>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {feedback.tags
                ?.filter((t): t is NonNullable<typeof t> => t !== null)
                ?.slice(0, 2)
                .map((tag) => (
                  <TagBadge
                    className="h-5 font-normal text-caption"
                    color={tag.color}
                    key={tag._id}
                  >
                    {tag.icon && <span>{tag.icon}</span>}
                    {tag.name}
                    {tag.appliedByAi && (
                      <>
                        <Sparkle
                          className="h-2.5 w-2.5 opacity-60"
                          weight="fill"
                        />
                        <span className="sr-only">Applied by AI</span>
                      </>
                    )}
                  </TagBadge>
                ))}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <CaretUp className="h-3 w-3" />
              <span className="tabular-nums">{feedback.voteCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
