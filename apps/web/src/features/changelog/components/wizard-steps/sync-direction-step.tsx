"use client";

import {
  ArrowDown,
  ArrowsLeftRight,
  ArrowUp,
  CheckCircle,
  GitBranch,
  Prohibit,
  Spinner,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SyncDirection = "github_first" | "reflet_first" | "bidirectional" | "none";

interface BranchInfo {
  name: string;
  isProtected: boolean;
}

interface SyncDirectionStepProps {
  value: SyncDirection;
  onChange: (direction: SyncDirection) => void;
  targetBranch: string;
  onBranchChange: (branch: string) => void;
  organizationId: Id<"organizations">;
}

const SYNC_OPTIONS = [
  {
    id: "github_first" as const,
    icon: ArrowDown,
    title: "GitHub → Reflet",
    description:
      "Tag releases on GitHub. Reflet imports them as drafts for enrichment.",
  },
  {
    id: "reflet_first" as const,
    icon: ArrowUp,
    title: "Reflet → GitHub",
    description:
      "Write releases in Reflet. On publish, a GitHub Release is created.",
  },
  {
    id: "bidirectional" as const,
    icon: ArrowsLeftRight,
    title: "Bidirectional",
    description:
      "Keep both in sync. Changes flow in both directions automatically.",
  },
  {
    id: "none" as const,
    icon: Prohibit,
    title: "No sync",
    description: "Manage releases only in Reflet, no GitHub integration.",
  },
] as const;

export function SyncDirectionStep({
  value,
  onChange,
  targetBranch,
  onBranchChange,
  organizationId,
}: SyncDirectionStepProps) {
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
  const needsGitHub = value !== "none";

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

  // Fetch branches when GitHub is connected
  useEffect(() => {
    if (isConnected && needsGitHub) {
      loadBranches();
    }
  }, [isConnected, needsGitHub, loadBranches]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Choose how releases flow between GitHub and Reflet:
      </p>
      <div className="grid gap-2">
        {SYNC_OPTIONS.map((option) => (
          <button
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              value === option.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <option.icon
              className={cn(
                "mt-0.5 h-5 w-5 flex-shrink-0",
                value === option.id ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div>
              <p className="font-medium text-sm">{option.title}</p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {option.description}
              </p>
            </div>
          </button>
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
