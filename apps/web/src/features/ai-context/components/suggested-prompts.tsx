"use client";

import { ArrowRight, Check, Copy } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { H2, Text } from "@/components/ui/typography";

interface Prompt {
  title: string;
  description: string;
  prompt: string;
  category: "explore" | "manage" | "automate" | "analyze";
}

const PROMPT_CATEGORIES = [
  { id: "explore" as const, label: "Explore" },
  { id: "manage" as const, label: "Manage" },
  { id: "automate" as const, label: "Automate" },
  { id: "analyze" as const, label: "Analyze" },
] as const;

const SUGGESTED_PROMPTS: Prompt[] = [
  // Explore
  {
    title: "Explore feedback and suggest priorities",
    description:
      "Review all recent feedback and suggest which items should be prioritized based on votes and frequency.",
    prompt:
      "List all feedback sorted by votes. Analyze the top items and suggest which ones should be marked as high priority. Group similar feedback together and recommend which to tackle first.",
    category: "explore",
  },
  {
    title: "Summarize feedback trends",
    description:
      "Get an overview of recent feedback themes and recurring patterns.",
    prompt:
      "List all recent feedback. Identify common themes and patterns. Summarize the top 5 most requested features or reported issues, with vote counts and how many feedback items mention each theme.",
    category: "explore",
  },
  {
    title: "Find feedback by topic",
    description: "Search for feedback related to a specific feature or topic.",
    prompt:
      'Search feedback for items related to "[your topic]". Show the title, status, vote count, and any comments for each result.',
    category: "explore",
  },

  // Manage
  {
    title: "Check feedback and suggest replies",
    description:
      "Review recent comments that need responses and draft helpful replies.",
    prompt:
      "List feedback that has recent comments. For any feedback where the last comment is from a user (not a team member), draft a helpful reply acknowledging their input and providing a status update.",
    category: "manage",
  },
  {
    title: "Triage untagged feedback",
    description:
      "Find feedback without tags and suggest appropriate categorization.",
    prompt:
      "List all available tags, then list feedback that has no tags. For each untagged item, suggest which tags should be applied based on the title and description.",
    category: "manage",
  },
  {
    title: "Update roadmap with completed items",
    description:
      "Find completed feedback and link it to the appropriate milestone.",
    prompt:
      'List all milestones, then list feedback with status "completed" or "done". For any completed feedback not linked to a milestone, suggest which milestone it belongs to and link it.',
    category: "manage",
  },
  {
    title: "Prepare a release from recent work",
    description:
      "Create a changelog entry from recently completed feedback items.",
    prompt:
      'List feedback with status "completed" that is not yet linked to any release. Create a new release with a descriptive title and link all the relevant completed feedback to it.',
    category: "manage",
  },

  // Automate
  {
    title: "Find this feedback and implement the fix",
    description:
      "Locate specific feedback, understand the issue, and apply the fix in code.",
    prompt:
      'Search feedback for "[feedback title or keyword]". Read the feedback details and comments to understand the issue. Then explore the codebase, implement the fix, and update the feedback status to reflect your progress.',
    category: "automate",
  },
  {
    title: "Bulk-assign feedback to team members",
    description: "Distribute unassigned feedback among available team members.",
    prompt:
      "List all team members, then list feedback that has no assignee. Suggest assignments based on the feedback content and assign each item to the most relevant team member.",
    category: "automate",
  },
  {
    title: "Create tags from feedback patterns",
    description: "Analyze feedback topics and create missing tags.",
    prompt:
      "List all existing tags. Then list all feedback and identify common topics that don't have a matching tag. Create new tags for the most common uncategorized themes.",
    category: "automate",
  },

  // Analyze
  {
    title: "Generate a weekly feedback report",
    description:
      "Summarize this week's feedback activity with stats and highlights.",
    prompt:
      "List all recent feedback. Provide a summary report including: total new feedback this week, most voted items, status distribution (how many open, in progress, completed), and any feedback that needs urgent attention.",
    category: "analyze",
  },
  {
    title: "Audit feedback statuses",
    description: "Find stale or inconsistent feedback statuses.",
    prompt:
      'List all feedback that has been "in progress" for a long time or has a status that seems inconsistent with its activity. Suggest status updates for any stale items.',
    category: "analyze",
  },
  {
    title: "Compare milestones progress",
    description: "Show progress across all active milestones.",
    prompt:
      "List all active milestones. For each one, show how many feedback items are linked, their status breakdown (open vs completed), and an estimated completion percentage.",
    category: "analyze",
  },
] as const;

function PromptCopyButton({ text }: { text: string }) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt copied to clipboard");
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }, [text]);

  return (
    <Button className="shrink-0" onClick={handleCopy} size="sm" variant="ghost">
      {hasCopied ? (
        <>
          <Check className="mr-1 h-3.5 w-3.5 text-green-500" />
          <span className="text-green-500 text-xs">Copied</span>
        </>
      ) : (
        <>
          <Copy className="mr-1 h-3.5 w-3.5" />
          <span className="text-xs">Copy</span>
        </>
      )}
    </Button>
  );
}

export function SuggestedPrompts() {
  const [activeCategory, setActiveCategory] = useState<
    "explore" | "manage" | "automate" | "analyze"
  >("explore");

  const filteredPrompts = SUGGESTED_PROMPTS.filter(
    (p) => p.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <H2 variant="card">Suggested Prompts</H2>
        <Text className="mt-1" variant="bodySmall">
          Copy these prompts and paste them into your AI coding assistant. They
          work with any tool that has the Reflet MCP server connected.
        </Text>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {PROMPT_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            size="sm"
            variant={activeCategory === category.id ? "default" : "outline"}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Prompts */}
      <div className="space-y-3">
        {filteredPrompts.map((prompt) => (
          <Card key={prompt.title}>
            <CardContent className="flex items-start gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <h3 className="font-medium text-sm">{prompt.title}</h3>
                </div>
                <p className="mt-1 pl-5.5 text-muted-foreground text-xs">
                  {prompt.description}
                </p>
                <div className="mt-2 rounded-md bg-muted/50 px-3 py-2">
                  <p className="font-mono text-xs leading-relaxed">
                    {prompt.prompt}
                  </p>
                </div>
              </div>
              <PromptCopyButton text={prompt.prompt} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <h3 className="font-semibold text-blue-900 text-sm dark:text-blue-100">
          Tips for effective prompts
        </h3>
        <ul className="mt-2 space-y-1.5 text-blue-800 text-xs dark:text-blue-200">
          <li className="flex items-start gap-2">
            <Badge
              className="mt-0.5 h-4 w-4 shrink-0 items-center justify-center rounded-full p-0 text-[10px]"
              variant="secondary"
            >
              1
            </Badge>
            <span>
              Be specific — mention tags, statuses, or member names when
              relevant
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge
              className="mt-0.5 h-4 w-4 shrink-0 items-center justify-center rounded-full p-0 text-[10px]"
              variant="secondary"
            >
              2
            </Badge>
            <span>
              Chain actions — ask the agent to read, analyze, then act in one
              prompt
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge
              className="mt-0.5 h-4 w-4 shrink-0 items-center justify-center rounded-full p-0 text-[10px]"
              variant="secondary"
            >
              3
            </Badge>
            <span>
              Use with your codebase — combine feedback context with code
              changes
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
