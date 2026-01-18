import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import DOMPurify from "isomorphic-dompurify";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LinkedFeedback {
  _id: Id<"feedback">;
  title: string;
}

interface ReleaseCardProps {
  release: Doc<"releases"> & {
    feedback?: LinkedFeedback[];
  };
  onClick?: (releaseId: Id<"releases">) => void;
  className?: string;
  showFullContent?: boolean;
}

export function ReleaseCard({
  release,
  onClick,
  className,
  showFullContent = false,
}: ReleaseCardProps) {
  const isPublished = release.publishedAt !== undefined;
  const publishDate = release.publishedAt
    ? format(release.publishedAt, "MMMM d, yyyy")
    : null;

  const content = (
    <>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            {release.version && (
              <Badge className="font-mono" variant="outline">
                {release.version}
              </Badge>
            )}
            {!isPublished && <Badge variant="secondary">Draft</Badge>}
          </div>

          <h2 className="font-semibold text-xl transition-colors group-hover:text-primary">
            {release.title}
          </h2>
        </div>

        {publishDate && (
          <div className="flex shrink-0 items-center gap-1 text-muted-foreground text-sm">
            <CalendarDays className="h-4 w-4" />
            <time
              dateTime={
                release.publishedAt
                  ? new Date(release.publishedAt).toISOString()
                  : undefined
              }
            >
              {publishDate}
            </time>
          </div>
        )}
      </div>

      {/* Description */}
      {release.description && (
        <div className={cn("prose prose-sm dark:prose-invert mb-4 max-w-none")}>
          {showFullContent ? (
            <div
              // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized markdown content
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(release.description),
              }}
            />
          ) : (
            <p className="line-clamp-3 text-muted-foreground">
              {release.description.replace(/<[^>]*>/g, "").slice(0, 200)}
              {release.description.length > 200 && "..."}
            </p>
          )}
        </div>
      )}

      {/* Linked feedback */}
      {release.feedback && release.feedback.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h3 className="mb-2 font-medium text-muted-foreground text-sm">
            Related feedback
          </h3>
          <ul className="space-y-1">
            {release.feedback
              .slice(0, showFullContent ? undefined : 3)
              .map((item: LinkedFeedback) => (
                <li className="flex items-center gap-2" key={item._id}>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{item.title}</span>
                </li>
              ))}
            {!showFullContent && release.feedback.length > 3 && (
              <li className="text-muted-foreground text-sm">
                +{release.feedback.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Read more link */}
      {!showFullContent && onClick && (
        <div className="mt-4">
          <span className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
            Read more
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        className={cn(
          "rounded-lg border bg-card p-6 text-left transition-colors hover:bg-accent/30",
          !isPublished && "border-dashed opacity-70",
          "cursor-pointer",
          className
        )}
        onClick={() => onClick(release._id)}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-6 transition-colors hover:bg-accent/30",
        !isPublished && "border-dashed opacity-70",
        className
      )}
    >
      {content}
    </article>
  );
}
