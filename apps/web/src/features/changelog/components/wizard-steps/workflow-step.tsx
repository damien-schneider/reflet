"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ctrl-ui/react/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  CaretDown,
  CheckCircle,
  GitBranch,
  Lightning,
  LockSimple,
  PencilSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import type { Workflow } from "../wizard-config";

interface BranchInfo {
  isProtected: boolean;
  name: string;
}

interface WorkflowStepProps {
  onBranchChange: (branch: string) => void;
  onChange: (workflow: Workflow) => void;
  organizationId: Id<"organizations">;
  targetBranch: string;
  value: Workflow;
}

const WORKFLOW_OPTIONS = [
  {
    badge: "Recommended",
    description:
      "Reflet fetches your commits since the last release and generates polished release notes with AI. You review, edit, and publish.",
    howItWorks: [
      "You click 'New Release' in Reflet",
      "Reflet fetches commits since the last tag and generates release notes with AI",
      "You review, edit, and publish — a GitHub Release is created automatically",
    ],
    icon: Sparkle,
    id: "ai_powered" as const,
    title: "AI-Powered Release Notes",
  },
  {
    description:
      "Your release tool publishes GitHub Releases and Reflet imports them. Works with release-please, Changesets or semantic-release.",
    howItWorks: [
      "You use conventional commits (feat:, fix:, etc.) or changesets in your PRs",
      "Your release tool — release-please by default — opens a release PR with the version bump",
      "When it publishes the GitHub Release, Reflet imports it",
    ],
    icon: Lightning,
    id: "automated" as const,
    title: "Automated Releases",
  },
  {
    description:
      "Write release notes yourself in Reflet or GitHub. Sync between them as needed.",
    howItWorks: [
      "Write release notes in Reflet or directly on GitHub",
      "Optionally sync releases between Reflet and GitHub",
      "Full control over content, timing, and versioning",
    ],
    icon: PencilSimple,
    id: "manual" as const,
    title: "Manual",
  },
] as const;

export function WorkflowStep({
  value,
  onChange,
  targetBranch,
  onBranchChange,
  organizationId,
}: WorkflowStepProps) {
  const [loadedBranches, setLoadedBranches] = useState<{
    failed: boolean;
    list: BranchInfo[];
    organizationId: string;
  } | null>(null);

  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    {
      organizationId,
    }
  );

  const listBranches = useAction(
    api.integrations.github.repo_actions.listBranches
  );

  const isConnected = Boolean(
    githubConnection?.repositoryFullName && githubConnection?.installationId
  );
  const needsGitHub = value !== "manual";
  const shouldLoadBranches = isConnected && needsGitHub;
  const branches = loadedBranches?.list ?? [];
  const branchesFailed = loadedBranches?.failed ?? false;
  const isLoadingBranches =
    shouldLoadBranches && loadedBranches?.organizationId !== organizationId;

  useEffect(() => {
    if (!shouldLoadBranches) {
      return;
    }

    let cancelled = false;
    listBranches({ organizationId }).then(
      (list) => {
        if (!cancelled) {
          setLoadedBranches({ failed: false, list, organizationId });
        }
      },
      () => {
        if (!cancelled) {
          setLoadedBranches({ failed: true, list: [], organizationId });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [shouldLoadBranches, listBranches, organizationId]);

  return (
    <div className="space-y-3">
      <fieldset className="grid min-w-0 gap-2">
        <legend className="mb-3 text-pretty text-muted-foreground text-sm">
          How do you want to manage your releases?
        </legend>
        {WORKFLOW_OPTIONS.map((option) => (
          <WorkflowCard
            key={option.id}
            onChange={onChange}
            option={option}
            selected={value === option.id}
          />
        ))}
      </fieldset>

      {needsGitHub && isConnected && (
        <ConnectedBranchSelector
          branches={branches}
          failed={branchesFailed}
          isLoading={isLoadingBranches}
          onBranchChange={onBranchChange}
          repoFullName={githubConnection?.repositoryFullName ?? ""}
          targetBranch={targetBranch}
        />
      )}
    </div>
  );
}

function WorkflowCard({
  option,
  selected,
  onChange,
}: {
  option: (typeof WORKFLOW_OPTIONS)[number];
  selected: boolean;
  onChange: (workflow: Workflow) => void;
}) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors duration-(--duration-fast) has-focus-visible:ring-2 has-focus-visible:ring-ring",
        selected ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      <label className="flex cursor-pointer items-start gap-3 p-3">
        <input
          checked={selected}
          className="sr-only"
          name="release-workflow"
          onChange={() => onChange(option.id)}
          type="radio"
          value={option.id}
        />
        <option.icon
          aria-hidden
          className={cn(
            "mt-0.5 size-5 shrink-0",
            selected ? "text-primary" : "text-muted-foreground"
          )}
          weight={selected ? "fill" : "regular"}
        />
        <span className="block flex-1">
          <span className="flex items-center gap-2">
            <span className="font-medium text-sm">{option.title}</span>
            {"badge" in option && option.badge && (
              <Badge size="sm">{option.badge}</Badge>
            )}
          </span>
          <span className="mt-0.5 block text-pretty text-muted-foreground text-xs">
            {option.description}
          </span>
        </span>
      </label>

      {selected && (
        <Collapsible onOpenChange={setHowItWorksOpen} open={howItWorksOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 border-t px-3 py-2 text-muted-foreground text-xs hover:text-foreground">
            <CaretDown
              aria-hidden
              className={cn(
                "size-3 transition-transform duration-(--duration-base) ease-(--ease-standard)",
                howItWorksOpen && "rotate-180"
              )}
            />
            How it works
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="space-y-1.5 px-3 pb-3">
              {option.howItWorks.map((step, i) => (
                <li
                  className="flex items-start gap-2 text-muted-foreground text-xs"
                  key={step}
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-micro tabular-nums">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function ConnectedBranchSelector({
  branches,
  failed,
  isLoading,
  onBranchChange,
  repoFullName,
  targetBranch,
}: {
  branches: BranchInfo[];
  failed: boolean;
  isLoading: boolean;
  onBranchChange: (branch: string) => void;
  repoFullName: string;
  targetBranch: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-success-subtle p-3">
      <div className="flex items-center gap-2">
        <CheckCircle aria-hidden className="size-4 text-success-text" />
        <p className="min-w-0 truncate font-medium text-success-text text-xs">
          Connected to {repoFullName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <GitBranch
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <div className="flex flex-1 items-center gap-2">
          <Label className="whitespace-nowrap text-xs" htmlFor="target-branch">
            Target branch
          </Label>
          <BranchInput
            branches={branches}
            failed={failed}
            isLoading={isLoading}
            onBranchChange={onBranchChange}
            targetBranch={targetBranch}
          />
        </div>
      </div>
    </div>
  );
}

function BranchInput({
  branches,
  failed,
  isLoading,
  onBranchChange,
  targetBranch,
}: {
  branches: BranchInfo[];
  failed: boolean;
  isLoading: boolean;
  onBranchChange: (branch: string) => void;
  targetBranch: string;
}) {
  if (isLoading) {
    return (
      <div
        aria-live="polite"
        className="flex h-7 flex-1 items-center gap-1.5 text-muted-foreground text-xs"
      >
        <Spinner size="xs" />
        Loading branches…
      </div>
    );
  }

  if (branches.length > 0) {
    return (
      <Select
        onValueChange={(val) => {
          if (val) {
            onBranchChange(val);
          }
        }}
        value={targetBranch}
      >
        <SelectTrigger className="flex-1" id="target-branch" size="xs">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.name} value={branch.name}>
              {branch.name}
              {branch.isProtected && (
                <LockSimple
                  aria-label="Protected"
                  className="size-3.5 text-muted-foreground"
                />
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <p className="text-muted-foreground text-xs">
      {failed ? "Couldn’t load branches. Using " : "Using "}
      <span className="font-mono">{targetBranch}</span>
    </p>
  );
}
