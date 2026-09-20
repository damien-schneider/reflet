"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  ArrowDown,
  ArrowsLeftRight,
  ArrowUp,
  CheckCircle,
  GitBranch,
  Prohibit,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SyncDirection = "github_first" | "reflet_first" | "bidirectional" | "none";

interface BranchInfo {
  isProtected: boolean;
  name: string;
}

interface SyncDirectionStepProps {
  onBranchChange: (branch: string) => void;
  onChange: (direction: SyncDirection) => void;
  organizationId: Id<"organizations">;
  targetBranch: string;
  value: SyncDirection;
}

const SYNC_OPTIONS = [
  {
    description:
      "Tag releases on GitHub. Reflet imports them as drafts for enrichment.",
    icon: ArrowDown,
    id: "github_first" as const,
    title: "GitHub → Reflet",
  },
  {
    description:
      "Write releases in Reflet. On publish, a GitHub Release is created.",
    icon: ArrowUp,
    id: "reflet_first" as const,
    title: "Reflet → GitHub",
  },
  {
    description:
      "Keep both in sync. Changes flow in both directions automatically.",
    icon: ArrowsLeftRight,
    id: "bidirectional" as const,
    title: "Bidirectional",
  },
  {
    description: "Manage releases only in Reflet, no GitHub integration.",
    icon: Prohibit,
    id: "none" as const,
    title: "No sync",
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
  const needsGitHub = value !== "none";

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
        Choose how releases flow between GitHub and Reflet:
      </p>
      <fieldset aria-label="Sync direction" className="grid min-w-0 gap-2">
        {SYNC_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <Button
              active={selected}
              aria-pressed={selected}
              className={cn(
                "h-auto w-full items-start justify-start gap-3 rounded-lg border p-3 text-left",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              key={option.id}
              onClick={() => onChange(option.id)}
              type="button"
              variant="quiet"
            >
              <option.icon
                className={cn(
                  "mt-0.5 h-5 w-5 flex-shrink-0",
                  selected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="block">
                <span className="block font-medium text-sm">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-muted-foreground text-xs">
                  {option.description}
                </span>
              </span>
            </Button>
          );
        })}
      </fieldset>

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
