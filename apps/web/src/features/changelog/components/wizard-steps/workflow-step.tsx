"use client";

import { Button } from "@ctrl-ui/react/ui/button";
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
  PencilSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
      "Automatically create versioned releases when merging to your target branch. Uses conventional commits to determine version bumps.",
    howItWorks: [
      "You use conventional commits (feat:, fix:, etc.) in your PRs",
      "On merge, release-please creates a release PR with the correct version bump",
      "When merged, a GitHub Release is created and synced to Reflet",
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
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

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

  useEffect(() => {
    if (!(isConnected && needsGitHub)) {
      return;
    }

    let cancelled = false;
    setIsLoadingBranches(true);
    listBranches({ organizationId }).then(
      (result) => {
        if (cancelled) {
          return;
        }
        setBranches(result);
        setIsLoadingBranches(false);
      },
      () => {
        if (cancelled) {
          return;
        }
        setBranches([]);
        setIsLoadingBranches(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isConnected, needsGitHub, listBranches, organizationId]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        How do you want to manage your releases?
      </p>
      <div className="grid gap-2">
        {WORKFLOW_OPTIONS.map((option) => (
          <WorkflowCard
            key={option.id}
            onChange={onChange}
            option={option}
            selected={value === option.id}
          />
        ))}
      </div>

      {needsGitHub && isConnected && (
        <ConnectedBranchSelector
          branches={branches}
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
        "rounded-lg border transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      <Button
        active={selected}
        aria-pressed={selected}
        className={cn(
          "h-auto w-full items-start justify-start gap-3 rounded-lg p-3 text-left",
          !selected && "hover:border-primary/50"
        )}
        onClick={() => onChange(option.id)}
        type="button"
        variant="quiet"
      >
        <option.icon
          className={cn(
            "mt-0.5 h-5 w-5 flex-shrink-0",
            selected ? "text-primary" : "text-muted-foreground"
          )}
          weight={selected ? "fill" : "regular"}
        />
        <span className="block flex-1">
          <span className="flex items-center gap-2">
            <span className="font-medium text-sm">{option.title}</span>
            {"badge" in option && option.badge && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-caption text-primary">
                {option.badge}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-muted-foreground text-xs">
            {option.description}
          </span>
        </span>
      </Button>

      {selected && (
        <Collapsible onOpenChange={setHowItWorksOpen} open={howItWorksOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 border-t px-3 py-2 text-muted-foreground text-xs transition-colors hover:text-foreground">
            <CaretDown
              className={cn(
                "h-3 w-3 transition-transform",
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
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-muted font-medium text-micro tabular-nums">
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
  isLoading,
  onBranchChange,
  repoFullName,
  targetBranch,
}: {
  branches: BranchInfo[];
  isLoading: boolean;
  onBranchChange: (branch: string) => void;
  repoFullName: string;
  targetBranch: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-success-subtle p-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-success-text" />
        <p className="font-medium text-success-text text-xs">
          Connected to {repoFullName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <GitBranch className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="flex flex-1 items-center gap-2">
          <Label className="whitespace-nowrap text-xs" htmlFor="target-branch">
            Target branch
          </Label>
          <BranchInput
            branches={branches}
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
  isLoading,
  onBranchChange,
  targetBranch,
}: {
  branches: BranchInfo[];
  isLoading: boolean;
  onBranchChange: (branch: string) => void;
  targetBranch: string;
}) {
  if (isLoading) {
    return (
      <div className="flex h-7 flex-1 items-center gap-1.5 text-muted-foreground text-xs">
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
        <SelectTrigger className="h-7 flex-1 text-xs" id="target-branch">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.name} value={branch.name}>
              {branch.name}
              {branch.isProtected ? " 🔒" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <p className="text-muted-foreground text-xs">
      Using: <span className="font-mono">{targetBranch}</span>
    </p>
  );
}
