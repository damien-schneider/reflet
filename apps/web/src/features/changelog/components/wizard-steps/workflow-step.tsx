"use client";

import {
  CaretDown,
  CheckCircle,
  GitBranch,
  Lightning,
  PencilSimple,
  Sparkle,
  Spinner,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Workflow } from "../release-setup-wizard";

interface BranchInfo {
  name: string;
  isProtected: boolean;
}

interface WorkflowStepProps {
  value: Workflow;
  onChange: (workflow: Workflow) => void;
  targetBranch: string;
  onBranchChange: (branch: string) => void;
  organizationId: Id<"organizations">;
}

const WORKFLOW_OPTIONS = [
  {
    id: "ai_powered" as const,
    icon: Sparkle,
    title: "AI-Powered Release Notes",
    badge: "Recommended",
    description:
      "Reflet fetches your commits since the last release and generates polished release notes with AI. You review, edit, and publish.",
    howItWorks: [
      "You click 'New Release' in Reflet",
      "Reflet fetches commits since the last tag and generates release notes with AI",
      "You review, edit, and publish — a GitHub Release is created automatically",
    ],
  },
  {
    id: "automated" as const,
    icon: Lightning,
    title: "Automated Releases",
    description:
      "Automatically create versioned releases when merging to your target branch. Uses conventional commits to determine version bumps.",
    howItWorks: [
      "You use conventional commits (feat:, fix:, etc.) in your PRs",
      "On merge, release-please creates a release PR with the correct version bump",
      "When merged, a GitHub Release is created and synced to Reflet",
    ],
  },
  {
    id: "manual" as const,
    icon: PencilSimple,
    title: "Manual",
    description:
      "Write release notes yourself in Reflet or GitHub. Sync between them as needed.",
    howItWorks: [
      "Write release notes in Reflet or directly on GitHub",
      "Optionally sync releases between Reflet and GitHub",
      "Full control over content, timing, and versioning",
    ],
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

  const githubConnection = useQuery(api.github.getConnection, {
    organizationId,
  });

  const getToken = useAction(api.github_node_actions.getInstallationToken);
  const fetchBranches = useAction(api.github_release_actions.fetchBranches);

  const isConnected = Boolean(
    githubConnection?.repositoryFullName && githubConnection?.installationId
  );
  const needsGitHub = value !== "manual";

  const loadBranches = useCallback(async () => {
    if (
      !(githubConnection?.installationId && githubConnection.repositoryFullName)
    ) {
      return;
    }

    setIsLoadingBranches(true);
    try {
      const { token } = await getToken({
        installationId: githubConnection.installationId,
      });
      const result = await fetchBranches({
        installationToken: token,
        repositoryFullName: githubConnection.repositoryFullName,
      });
      setBranches(result);
    } catch {
      setBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  }, [
    githubConnection?.installationId,
    githubConnection?.repositoryFullName,
    getToken,
    fetchBranches,
  ]);

  useEffect(() => {
    if (isConnected && needsGitHub) {
      loadBranches();
    }
  }, [isConnected, needsGitHub, loadBranches]);

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
      <button
        className={cn(
          "flex w-full items-start gap-3 p-3 text-left transition-colors",
          !selected && "hover:border-primary/50"
        )}
        onClick={() => onChange(option.id)}
        type="button"
      >
        <option.icon
          className={cn(
            "mt-0.5 h-5 w-5 flex-shrink-0",
            selected ? "text-primary" : "text-muted-foreground"
          )}
          weight={selected ? "fill" : "regular"}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{option.title}</p>
            {"badge" in option && option.badge && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-[10px] text-primary">
                {option.badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {option.description}
          </p>
        </div>
      </button>

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
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[10px]">
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
    <div className="space-y-2 rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/20">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <p className="font-medium text-green-700 text-xs dark:text-green-300">
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
        <Spinner className="h-3 w-3 animate-spin" />
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
