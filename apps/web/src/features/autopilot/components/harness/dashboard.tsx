"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { GitPullRequest, Play, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HarnessSetupPanel } from "./setup-panel";
import type {
  HarnessArtifactView,
  HarnessBridgeView,
  HarnessEventView,
  HarnessJobView,
  HarnessOverview,
  HarnessRecipeView,
} from "./types";

interface HarnessDashboardProps {
  organizationId: Id<"organizations">;
}

function BridgeSummary({
  bridge,
  onRunProductBrain,
}: {
  bridge: HarnessBridgeView | null;
  onRunProductBrain: () => void;
}) {
  const canRun = bridge?.status === "online" && bridge.claudeAvailable;
  return (
    <section className="grid gap-3 md:grid-cols-[1fr_auto]">
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-normal">
          Product Harness
        </h1>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Repo-native ProductMap TASK framework: Topics, Agents, Skills, and
          Knowledge run through Claude Code worktrees and sync back into Reflet.
        </p>
      </div>
      <div className="flex items-start">
        <Button disabled={!canRun} onClick={onRunProductBrain}>
          <Play className="size-4" />
          Build Product Brain
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Badge variant={bridge?.status === "online" ? "secondary" : "outline"}>
          Bridge {bridge?.status ?? "offline"}
        </Badge>
        <Badge variant={bridge?.claudeAvailable ? "secondary" : "outline"}>
          Claude Code {bridge?.claudeAvailable ? "ready" : "missing"}
        </Badge>
        <Badge variant="outline">{bridge?.repoFullName ?? "No repo"}</Badge>
      </div>
    </section>
  );
}

function RecipesGrid({
  canRun,
  onRunRecipe,
  recipes,
}: {
  canRun: boolean;
  onRunRecipe: (recipeId: string) => void;
  recipes: HarnessRecipeView[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-lg">Harness recipes</h2>
        <p className="text-muted-foreground text-xs">
          Versioned ProductMap-inspired workflows with explicit subagents,
          validators, and Git artifacts.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {recipes.map((recipe) => (
          <Card key={recipe.id} size="sm">
            <CardHeader>
              <CardTitle>{recipe.title}</CardTitle>
              <CardDescription>
                {recipe.productMapLifecycle} / {recipe.productMapTopic}
              </CardDescription>
              <CardAction>
                <Badge variant="outline">v{recipe.version}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {recipe.subagents.map((subagent) => (
                  <Badge key={subagent} variant="secondary">
                    {subagent}
                  </Badge>
                ))}
              </div>
              <div className="space-y-1">
                {recipe.outputs.map((output) => (
                  <div
                    className="truncate rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-xs"
                    key={`${recipe.id}-${output.path}`}
                  >
                    {output.path}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(recipe.dependsOn.length > 0
                  ? recipe.dependsOn
                  : ["root"]
                ).map((dependency) => (
                  <Badge key={`${recipe.id}-${dependency}`} variant="outline">
                    {dependency}
                  </Badge>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!canRun}
                  onClick={() => onRunRecipe(recipe.id)}
                  size="sm"
                  variant="outline"
                >
                  <Play className="size-4" />
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function JobsList({ jobs }: { jobs: HarnessJobView[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Worktrees and PRs</h2>
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm md:flex-row md:items-center md:justify-between"
            key={job.id}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <GitPullRequest className="size-4 text-muted-foreground" />
                <span className="font-medium">{job.title}</span>
                <Badge variant="outline">{job.status}</Badge>
              </div>
              <div className="mt-1 truncate font-mono text-muted-foreground text-xs">
                {job.worktreeBranch ?? "waiting for bridge claim"}
              </div>
              {job.blockerMessage ? (
                <div className="mt-1 text-destructive text-xs">
                  Blocked: {job.blockerMessage}
                </div>
              ) : null}
              {job.commitSha ? (
                <div className="mt-1 truncate font-mono text-muted-foreground text-xs">
                  {job.commitSha}
                </div>
              ) : null}
            </div>
            {job.prUrl ? (
              <a
                className="text-primary text-sm underline-offset-4 hover:underline"
                href={job.prUrl}
              >
                Draft PR
              </a>
            ) : null}
          </div>
        ))}
        {jobs.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
            No Bridge jobs yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ArtifactsList({ artifacts }: { artifacts: HarnessArtifactView[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Projected artifacts</h2>
      <div className="grid gap-2 lg:grid-cols-2">
        {artifacts.map((artifact) => (
          <div
            className="rounded-lg border bg-card p-3 text-sm"
            key={artifact.id}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{artifact.title}</span>
              <Badge
                variant={
                  artifact.validationStatus === "passed"
                    ? "secondary"
                    : "outline"
                }
              >
                {artifact.validationScore}
              </Badge>
            </div>
            <div className="mt-2 truncate font-mono text-muted-foreground text-xs">
              {artifact.path}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">
                {Object.keys(artifact.evidenceHashes).length} evidence
              </Badge>
              <Badge variant="outline">
                {Object.keys(artifact.inputArtifactHashes).length} inputs
              </Badge>
            </div>
            {artifact.validatorMessages.length > 0 ? (
              <div className="mt-2 text-muted-foreground text-xs">
                {artifact.validatorMessages[0]}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function EventsList({ events }: { events: HarnessEventView[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Live run timeline</h2>
      <div className="space-y-2">
        {events.map((event) => (
          <div className="flex items-center gap-2 text-sm" key={event.id}>
            <ShieldCheck className="size-4 text-muted-foreground" />
            <Badge variant="outline">{event.level}</Badge>
            <span>{event.message}</span>
          </div>
        ))}
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
            Bridge events appear here while Claude Code is running.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function HarnessSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-52 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

export function HarnessDashboard({ organizationId }: HarnessDashboardProps) {
  const overview: HarnessOverview | undefined = useQuery(
    api.autopilot.harness.queries.getHarnessOverview,
    {
      organizationId,
    }
  );
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    { organizationId }
  );
  const enqueueProductBrain = useMutation(
    api.autopilot.harness.mutations.enqueueProductBrain
  );
  const enqueueHarnessJob = useMutation(
    api.autopilot.harness.mutations.enqueueHarnessJob
  );

  if (!overview) {
    return <HarnessSkeleton />;
  }

  const bridgeReady =
    overview.bridge?.status === "online" && overview.bridge.claudeAvailable;

  const handleRunProductBrain = async () => {
    if (!overview.bridge) {
      toast.error("Connect the Bridge before starting a harness run.");
      return;
    }
    try {
      await enqueueProductBrain({
        organizationId,
        repoFullName: overview.bridge.repoFullName,
      });
      toast.success("Product Brain job queued");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not queue harness job"
      );
    }
  };

  const handleRunRecipe = async (recipeId: string) => {
    if (!overview.bridge) {
      toast.error("Connect the Bridge before starting a harness run.");
      return;
    }
    try {
      await enqueueHarnessJob({
        organizationId,
        recipeId,
        repoFullName: overview.bridge.repoFullName,
      });
      toast.success("Harness job queued");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not queue harness job"
      );
    }
  };

  return (
    <div className="space-y-6">
      <BridgeSummary
        bridge={overview.bridge}
        onRunProductBrain={handleRunProductBrain}
      />
      <HarnessSetupPanel
        bridge={overview.bridge}
        organizationId={organizationId}
        repoFullName={
          githubConnection?.repositoryFullName ??
          overview.bridge?.repoFullName ??
          null
        }
      />
      <RecipesGrid
        canRun={bridgeReady}
        onRunRecipe={handleRunRecipe}
        recipes={overview.recipes}
      />
      <JobsList jobs={overview.jobs} />
      <ArtifactsList artifacts={overview.artifacts} />
      <EventsList events={overview.events} />
    </div>
  );
}
