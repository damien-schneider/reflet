"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Hash, Plus, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useId, useState } from "react";
import { TagBadge } from "@/components/tag-badge";

const KEYWORD_SOURCES = ["reddit", "web", "both"] as const;
type KeywordSource = (typeof KEYWORD_SOURCES)[number];

const isKeywordSource = (value: string): value is KeywordSource =>
  (KEYWORD_SOURCES as readonly string[]).includes(value);

const SOURCE_LABELS: Record<KeywordSource, string> = {
  both: "Both",
  reddit: "Reddit",
  web: "Web",
};

const SOURCE_COLORS: Record<KeywordSource, string> = {
  both: "purple",
  reddit: "orange",
  web: "blue",
};

interface KeywordManagerProps {
  organizationId: Id<"organizations">;
}

export function KeywordManager({ organizationId }: KeywordManagerProps) {
  const keywords = useQuery(api.intelligence.keywords.list, {
    organizationId,
  });
  const createKeyword = useMutation(api.intelligence.keywords.create);
  const removeKeyword = useMutation(api.intelligence.keywords.remove);

  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState<KeywordSource>("both");
  const [subreddit, setSubreddit] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keywordId = useId();
  const sourceId = useId();
  const subredditId = useId();
  const errorId = useId();

  const showSubredditField = source === "reddit" || source === "both";
  const canSubmit = keyword.trim() !== "" && !isAdding;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed || isAdding) {
      return;
    }
    const isDuplicate = keywords?.some(
      (kw) => kw.keyword.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setError(`“${trimmed}” is already tracked.`);
      return;
    }

    const trimmedSubreddit = subreddit.trim();
    const keywordInput = {
      keyword: trimmed,
      organizationId,
      source,
      subreddit:
        showSubredditField && trimmedSubreddit ? trimmedSubreddit : undefined,
    };
    setIsAdding(true);
    setError(null);
    try {
      await createKeyword(keywordInput);
      setKeyword("");
      setSubreddit("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn’t add the keyword. Try again."
      );
    }
    setIsAdding(false);
  };

  const handleRemove = async (id: Id<"intelligenceKeywords">) => {
    try {
      await removeKeyword({ id });
    } catch {
      toast.error("Couldn’t remove the keyword. Try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keywords</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-3"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                <label className="font-medium text-sm" htmlFor={keywordId}>
                  Keyword
                </label>
                <Input
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={error ? true : undefined}
                  autoComplete="off"
                  enterKeyHint="done"
                  id={keywordId}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. user feedback tool"
                  value={keyword}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-sm" htmlFor={sourceId}>
                  Source
                </label>
                <Select
                  onValueChange={(value) => {
                    if (value && isKeywordSource(value)) {
                      setSource(value);
                    }
                  }}
                  value={source}
                >
                  <SelectTrigger className="w-32" id={sourceId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KEYWORD_SOURCES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {SOURCE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!canSubmit}
                tone="primary"
                type="submit"
                variant="solid"
              >
                <Plus data-icon="inline-start" />
                {isAdding ? "Adding…" : "Add"}
              </Button>
            </div>
            {showSubredditField && (
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-sm" htmlFor={subredditId}>
                  Subreddit{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Input
                  autoCapitalize="none"
                  autoComplete="off"
                  id={subredditId}
                  onChange={(e) => setSubreddit(e.target.value)}
                  placeholder="r/SaaS"
                  spellCheck={false}
                  value={subreddit}
                />
              </div>
            )}
            {error && (
              <p
                className="text-destructive-text text-sm"
                id={errorId}
                role="alert"
              >
                {error}
              </p>
            )}
          </form>

          <KeywordsList keywords={keywords} onRemove={handleRemove} />
        </div>
      </CardContent>
    </Card>
  );
}

function KeywordsList({
  keywords,
  onRemove,
}: {
  keywords:
    | {
        _id: Id<"intelligenceKeywords">;
        keyword: string;
        source: string;
        subreddit?: string;
      }[]
    | undefined;
  onRemove: (id: Id<"intelligenceKeywords">) => void;
}) {
  if (keywords === undefined) {
    return (
      <div
        aria-label="Loading keywords"
        className="flex flex-col gap-1"
        role="status"
      >
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-11 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <p className="text-pretty text-muted-foreground text-sm">
        No keywords yet. Add one to start monitoring discussions.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {keywords.map((kw) => {
        const kwSource = isKeywordSource(kw.source) ? kw.source : "both";
        return (
          <li
            className="flex items-center justify-between gap-2 rounded-md border py-1 pr-1 pl-3"
            key={kw._id}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Hash
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="truncate text-sm" title={kw.keyword}>
                {kw.keyword}
              </span>
              <TagBadge color={SOURCE_COLORS[kwSource]}>
                {SOURCE_LABELS[kwSource]}
              </TagBadge>
              {kw.subreddit && (
                <span className="truncate text-muted-foreground text-xs">
                  {kw.subreddit}
                </span>
              )}
            </div>
            <Button
              aria-label={`Remove keyword ${kw.keyword}`}
              iconOnly
              onClick={() => onRemove(kw._id)}
              size="sm"
              variant="ghost"
            >
              <X />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
