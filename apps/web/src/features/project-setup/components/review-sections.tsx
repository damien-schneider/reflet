"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Check, FileText, Lightning, Tag } from "@phosphor-icons/react";
import { CopyButton } from "@/components/copy-button";
import { Muted, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type {
  ChangelogConfig,
  SuggestedPrompt,
  SuggestedTag,
} from "./setup-types";

const WORKFLOW_LABELS = {
  ai_powered: "AI-powered",
  automated: "Automated",
  manual: "Manual",
} as const;

const VISIBLE_PROMPTS = 3;

export function ChangelogCard({ config }: { config: ChangelogConfig }) {
  const releaseCount = config.releaseCount ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText aria-hidden className="size-4" />
          Changelog
        </CardTitle>
        {releaseCount > 0 && (
          <CardDescription className="tabular-nums">
            Found {releaseCount} existing release{releaseCount === 1 ? "" : "s"}
            {config.hasConventionalCommits && " with semver tags"}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={config.workflow === "ai_powered" ? "default" : "outline"}
          >
            {WORKFLOW_LABELS[config.workflow]}
          </Badge>
          {config.versionPrefix && (
            <Badge variant="outline">Prefix: {config.versionPrefix}</Badge>
          )}
          <Badge variant="outline">Branch: {config.targetBranch}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function TagsCard({
  onToggle,
  onToggleAll,
  tags,
}: {
  onToggle: (index: number) => void;
  onToggleAll: (accepted: boolean) => void;
  tags: SuggestedTag[];
}) {
  if (tags.length === 0) {
    return null;
  }
  const acceptedCount = tags.filter((t) => t.accepted).length;
  const allAccepted = acceptedCount === tags.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag aria-hidden className="size-4" />
              Tags
            </CardTitle>
            <CardDescription className="tabular-nums">
              {acceptedCount} of {tags.length} selected
            </CardDescription>
          </div>
          <Button
            onClick={() => onToggleAll(!allAccepted)}
            size="xs"
            variant="ghost"
          >
            {allAccepted ? "Deselect all" : "Select all"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <button
              aria-pressed={tag.accepted}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                tag.accepted
                  ? "border-foreground/20 bg-foreground/5"
                  : "border-transparent bg-muted/50 text-muted-foreground"
              )}
              key={tag.name}
              onClick={() => onToggle(index)}
              type="button"
            >
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <Check
                aria-hidden
                className={cn("size-3", !tag.accepted && "invisible")}
              />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PromptsCard({ prompts }: { prompts: SuggestedPrompt[] }) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightning aria-hidden className="size-4" />
          AI prompts
        </CardTitle>
        <CardDescription>Written for this repository.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {prompts.slice(0, VISIBLE_PROMPTS).map((prompt) => (
            <li
              className="flex items-start justify-between gap-3 rounded-md bg-muted/50 p-3"
              key={prompt.title}
            >
              <div className="min-w-0 flex-1">
                <Text className="font-medium" variant="bodySmall">
                  {prompt.title}
                </Text>
                <Muted className="mt-0.5 line-clamp-2 text-caption">
                  {prompt.prompt}
                </Muted>
              </div>
              <CopyButton
                label={`Copy prompt: ${prompt.title}`}
                size="xs"
                value={prompt.prompt}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
