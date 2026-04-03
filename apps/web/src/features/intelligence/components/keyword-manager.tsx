"use client";

import { Hash, Plus, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KEYWORD_SOURCES = ["reddit", "web", "both"] as const;
type KeywordSource = (typeof KEYWORD_SOURCES)[number];

const isKeywordSource = (value: string): value is KeywordSource =>
  (KEYWORD_SOURCES as readonly string[]).includes(value);

const SOURCE_LABELS: Record<KeywordSource, string> = {
  reddit: "Reddit",
  web: "Web",
  both: "Both",
};

const SOURCE_COLORS: Record<KeywordSource, string> = {
  reddit: "orange",
  web: "blue",
  both: "purple",
};

interface KeywordManagerProps {
  organizationId: Id<"organizations">;
}

export function KeywordManager({ organizationId }: KeywordManagerProps) {
  const keywords = useQuery(api.autopilot.intelligence.keywords.list, {
    organizationId,
  });
  const createKeyword = useMutation(api.autopilot.intelligence.keywords.create);
  const removeKeyword = useMutation(api.autopilot.intelligence.keywords.remove);

  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState<KeywordSource>("both");
  const [subreddit, setSubreddit] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const showSubredditField = source === "reddit" || source === "both";
  const canSubmit = keyword.trim() !== "" && !isAdding;

  const resetForm = () => {
    setKeyword("");
    setSource("both");
    setSubreddit("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsAdding(true);
    try {
      await createKeyword({
        organizationId,
        keyword: keyword.trim(),
        source,
        subreddit:
          showSubredditField && subreddit.trim() ? subreddit.trim() : undefined,
      });

      toast.success("Keyword added");
      resetForm();
    } catch (error) {
      toast.error("Failed to add keyword", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: Id<"intelligenceKeywords">) => {
    try {
      await removeKeyword({ id });
      toast.success("Keyword removed");
    } catch (error) {
      toast.error("Failed to remove keyword", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keywords</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Add keyword form */}
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Enter a keyword..."
                  value={keyword}
                />
              </div>
              <Select
                onValueChange={(value) => {
                  if (value && isKeywordSource(value)) {
                    setSource(value);
                  }
                }}
                value={source}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reddit">Reddit</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={!canSubmit} size="sm" type="submit">
                <Plus className="mr-1.5 size-4" />
                {isAdding ? "Adding..." : "Add"}
              </Button>
            </div>
            {showSubredditField && (
              <Input
                onChange={(e) => setSubreddit(e.target.value)}
                placeholder="Subreddit (optional, e.g. r/SaaS)"
                value={subreddit}
              />
            )}
          </form>

          {/* Keywords list */}
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
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  if (keywords.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No keywords added yet. Add keywords to monitor discussions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {keywords.map((kw) => (
        <div
          className="flex items-center justify-between rounded-md border px-3 py-2"
          key={kw._id}
        >
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-muted-foreground" />
            <span className="text-sm">{kw.keyword}</span>
            <Badge
              color={
                SOURCE_COLORS[isKeywordSource(kw.source) ? kw.source : "both"]
              }
            >
              {SOURCE_LABELS[isKeywordSource(kw.source) ? kw.source : "both"]}
            </Badge>
            {kw.subreddit && (
              <span className="text-muted-foreground text-xs">
                {kw.subreddit}
              </span>
            )}
          </div>
          <Button
            aria-label={`Remove keyword ${kw.keyword}`}
            onClick={() => onRemove(kw._id)}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
