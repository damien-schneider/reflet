"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Info, Lightning, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { ReleaseSource } from "@reflet/backend/convex/changelog/source";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { capture } from "@/lib/analytics";
import { describeCommitCount } from "./release-commits-list";

const GENERATE_HINT =
  "Generate release notes from the code changes in this release on GitHub";

type GenerationPhase = "idle" | "resolving" | "writing" | "finishing";

const PHASE_LABELS: Record<Exclude<GenerationPhase, "idle">, string> = {
  finishing: "Saving draft…",
  resolving: "Reading changes…",
  writing: "Writing…",
};

interface GenerateFromCommitsProps {
  disabled?: boolean;
  onApplied: () => void;
  onPreviewChange: (preview: string | null) => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
  saveRelease: () => Promise<Id<"releases">>;
  version: string;
}

interface ReleaseNotesRequest {
  organizationId: Id<"organizations">;
  releaseId: Id<"releases">;
  repositoryName?: string;
  source: ReleaseSource;
  version?: string;
}

async function readErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return "Unable to generate release notes. Try again.";
}

async function streamReleaseNotes(
  request: ReleaseNotesRequest,
  signal: AbortSignal,
  onChunk: (content: string) => void
): Promise<string> {
  const response = await fetch("/api/ai/generate-release-notes", {
    body: JSON.stringify(request),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal,
  });
  if (!(response.ok && response.body)) {
    throw new Error(await readErrorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return content;
    }
    content += decoder.decode(value, { stream: true });
    onChunk(content);
  }
}

export function GenerateFromCommits({
  disabled,
  onApplied,
  onPreviewChange,
  organizationId,
  orgSlug,
  saveRelease,
  version,
}: GenerateFromCommitsProps) {
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
  );
  const resolveReleaseSource = useAction(
    api.changelog.source_actions.resolveReleaseSource
  );
  const generateReleaseTitle = useAction(
    api.changelog.ai_actions.generateReleaseTitle
  );
  const saveGeneratedDraft = useMutation(
    api.changelog.release_drafts.saveGeneratedDraft
  );

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const repositoryName = githubConnection?.repositoryFullName;

  const generate = async (signal: AbortSignal) => {
    const releaseId = await saveRelease();
    const tagName = version.trim() || undefined;
    const source = await resolveReleaseSource({ releaseId, version: tagName });
    signal.throwIfAborted();

    const hasSourceMaterial =
      source.commits.length > 0 ||
      source.pullRequests.length > 0 ||
      Boolean(source.maintainerNotes);
    if (!hasSourceMaterial) {
      toast.info("No changes found for this release on GitHub.");
      return;
    }

    setPhase("writing");
    onPreviewChange("");
    const description = await streamReleaseNotes(
      {
        organizationId,
        releaseId,
        repositoryName,
        source,
        version: tagName,
      },
      signal,
      onPreviewChange
    );

    setPhase("finishing");
    const title = await generateReleaseTitle({
      description,
      releaseId,
      version: tagName,
    }).catch(() => undefined);
    signal.throwIfAborted();

    const { applied } = await saveGeneratedDraft({
      description,
      releaseId,
      source,
      title,
    });
    capture("ai_release_notes_generated");
    const commitCount = describeCommitCount(
      source.commits.length,
      source.totalCommits
    );
    if (applied) {
      toast.success(`Generated from ${commitCount}`);
      onApplied();
      return;
    }
    toast.success(
      `Generated from ${commitCount}. Your edits were kept — review the draft.`
    );
  };

  const handleGenerate = async () => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setPhase("resolving");
    try {
      await generate(abortController.signal);
    } catch (error) {
      if (!abortController.signal.aborted) {
        toast.error(
          error instanceof Error ? error.message : "Failed to generate notes"
        );
      }
    } finally {
      abortControllerRef.current = null;
      onPreviewChange(null);
      setPhase("idle");
    }
  };

  if (!githubConnection?.installationId) {
    return null;
  }

  if (!repositoryName) {
    return (
      <Link
        className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
        href={`/dashboard/${orgSlug}/project/github`}
      >
        <Info aria-hidden className="size-3" />
        Connect a repository to generate
      </Link>
    );
  }

  if (phase !== "idle") {
    return (
      <div className="flex items-center gap-1.5">
        <span
          aria-live="polite"
          className="flex items-center gap-1.5 text-muted-foreground text-xs"
          role="status"
        >
          <Spinner size="xs" />
          {PHASE_LABELS[phase]}
        </span>
        <Button
          onClick={() => abortControllerRef.current?.abort()}
          size="xs"
          type="button"
          variant="ghost"
        >
          <X aria-hidden className="size-3" />
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            disabled={disabled}
            onClick={handleGenerate}
            size="xs"
            type="button"
            variant="surface"
          >
            <Lightning aria-hidden className="size-3" />
            Generate with AI
          </Button>
        }
      />
      <TooltipContent>{GENERATE_HINT}</TooltipContent>
    </Tooltip>
  );
}
