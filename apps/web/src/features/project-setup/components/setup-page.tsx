"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { FieldSeparator } from "@ctrl-ui/react/ui/field";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  ArrowRight,
  Check,
  Gear,
  GithubLogo,
  WarningCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { RedirectType, redirect, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { H1, Muted, Text } from "@/components/ui/typography";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import { AnalyzingView } from "./analyzing-view";
import { ReviewView } from "./review-view";

const SETUP_BENEFITS = [
  "Analyze your tech stack and architecture",
  "Discover services to monitor",
  "Extract keywords for market intelligence",
  "Configure your changelog from releases",
  "Suggest tags from your codebase",
  "Generate AI prompts for your project",
  "Hand feedback to your coding agent through the CLI",
] as const;

type PendingAction = "analyze" | "manual" | "skipped";

interface SetupPageProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  userId: string | undefined;
}

interface SetupActions {
  actionError: string | null;
  onManual: () => void;
  onSkip: () => void;
  onStart: () => void;
  pending: PendingAction | null;
}

function SetupShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
      <div className={className ?? "w-full max-w-lg"}>{children}</div>
    </div>
  );
}

function ActionError({ message }: { message: string | null }) {
  return (
    <p
      className="mt-4 min-h-[1lh] text-center text-destructive-text text-sm"
      role="alert"
    >
      {message}
    </p>
  );
}

export function SetupPage({ organizationId, orgSlug, userId }: SetupPageProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setupStatus = useQuery(
    api.integrations.github.project_setup.getSetupStatus,
    { organizationId }
  );
  const projectSetup = useQuery(
    api.integrations.github.project_setup.getProjectSetup,
    { organizationId }
  );
  const startProjectSetup = useMutation(
    api.integrations.github.project_setup.startProjectSetup
  );
  const skipSetup = useMutation(
    api.integrations.github.project_setup.skipSetup
  );

  const isCompleted = setupStatus?.setupCompleted === true;
  const run = async (action: PendingAction, task: () => Promise<unknown>) => {
    if (pending) {
      return;
    }
    setPending(action);
    setActionError(null);
    try {
      await task();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "That didn’t work. Try again."
      );
    }
    setPending(null);
  };

  const leaveSetup = (method: "manual" | "skipped") =>
    run(method, async () => {
      await skipSetup({ method, organizationId });
      router.push(`/dashboard/${orgSlug}`);
    });

  const actions: SetupActions = {
    actionError,
    onManual: () => leaveSetup("manual"),
    onSkip: () => leaveSetup("skipped"),
    onStart: () => run("analyze", () => startProjectSetup({ organizationId })),
    pending,
  };

  if (isCompleted) {
    redirect(`/dashboard/${orgSlug}/project`, RedirectType.replace);
  }

  if (setupStatus === undefined || projectSetup === undefined) {
    return (
      <SetupShell className="flex justify-center">
        <Spinner size="lg" />
      </SetupShell>
    );
  }

  if (projectSetup?.status === "analyzing") {
    return (
      <SetupShell>
        <AnalyzingView
          repositoryFullName={setupStatus?.repositoryFullName ?? ""}
          steps={projectSetup.steps}
        />
      </SetupShell>
    );
  }

  if (projectSetup?.status === "review") {
    return (
      <ReviewView
        organizationId={organizationId}
        orgSlug={orgSlug}
        setup={projectSetup}
      />
    );
  }

  if (projectSetup?.status === "error") {
    return <SetupFailed actions={actions} message={projectSetup.error} />;
  }

  if (setupStatus?.hasGitHub && !projectSetup) {
    return (
      <GitHubConnected
        actions={actions}
        repositoryFullName={setupStatus.repositoryFullName}
      />
    );
  }

  return (
    <ConnectPrompt
      actions={actions}
      connectHref={buildGitHubInstallUrl({
        organizationId,
        orgSlug,
        returnTo: "setup",
        userId,
      })}
    />
  );
}

function SetupFailed({
  actions,
  message,
}: {
  actions: SetupActions;
  message: string | undefined;
}) {
  return (
    <SetupShell className="w-full max-w-lg text-center">
      <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-destructive-subtle text-destructive-text">
        <WarningCircle aria-hidden className="size-7" weight="duotone" />
      </div>
      <H1 className="mb-2">Setup couldn’t finish</H1>
      <Muted className="mb-6 text-pretty">
        {message ??
          "The repository analysis stopped before it finished. Run it again, or set up your project by hand."}
      </Muted>
      <div className="flex justify-center gap-3">
        <Button
          disabled={actions.pending !== null}
          onClick={actions.onStart}
          tone="primary"
          variant="solid"
        >
          {actions.pending === "analyze" && (
            <Spinner data-icon="inline-start" size="xs" />
          )}
          {actions.pending === "analyze" ? "Starting…" : "Run analysis again"}
        </Button>
        <Button
          disabled={actions.pending !== null}
          onClick={actions.onManual}
          variant="surface"
        >
          {actions.pending === "manual" && (
            <Spinner data-icon="inline-start" size="xs" />
          )}
          Set up manually
        </Button>
      </div>
      <ActionError message={actions.actionError} />
    </SetupShell>
  );
}

function GitHubConnected({
  actions,
  repositoryFullName,
}: {
  actions: SetupActions;
  repositoryFullName: string | undefined;
}) {
  const isStarting = actions.pending === "analyze";
  return (
    <SetupShell className="w-full max-w-lg text-center">
      <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-success-subtle text-success-text">
        <Check aria-hidden className="size-7" weight="bold" />
      </div>
      <H1 className="mb-2">GitHub connected</H1>
      <Muted className="mb-6 text-pretty">
        {repositoryFullName ? (
          <>
            Connected to <strong>{repositoryFullName}</strong>.{" "}
          </>
        ) : null}
        Reflet will read the repository and suggest a setup you can review
        before anything is saved.
      </Muted>
      <Button
        disabled={actions.pending !== null}
        onClick={actions.onStart}
        size="md"
        tone="primary"
        variant="solid"
      >
        {isStarting && <Spinner data-icon="inline-start" size="xs" />}
        {isStarting ? "Starting analysis…" : "Analyze repository"}
        {!isStarting && <ArrowRight aria-hidden data-icon="inline-end" />}
      </Button>
      <ActionError message={actions.actionError} />
    </SetupShell>
  );
}

function ConnectPrompt({
  actions,
  connectHref,
}: {
  actions: SetupActions;
  connectHref: string | undefined;
}) {
  const isBusy = actions.pending !== null;
  return (
    <SetupShell>
      <div className="mb-8 text-center">
        <H1 className="mb-2">Set up your project</H1>
        <Muted className="text-pretty">
          Connect GitHub and Reflet suggests a setup from your code. You review
          it before anything is saved.
        </Muted>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-3">
            <GithubLogo aria-hidden className="size-6" weight="fill" />
            <Text className="font-semibold">Connect a GitHub repository</Text>
          </div>
          <Text className="mb-4 text-muted-foreground" variant="bodySmall">
            Reflet will:
          </Text>
          <ul className="mb-6 space-y-2">
            {SETUP_BENEFITS.map((benefit) => (
              <li
                className="flex items-start gap-2 text-muted-foreground text-sm"
                key={benefit}
              >
                <Check
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-success-text"
                  weight="bold"
                />
                {benefit}
              </li>
            ))}
          </ul>
          {connectHref ? (
            <ButtonLink
              className="w-full"
              render={<Link href={connectHref} />}
              size="md"
              tone="primary"
              variant="solid"
            >
              Connect GitHub
              <ArrowRight aria-hidden data-icon="inline-end" />
            </ButtonLink>
          ) : (
            <Button className="w-full" disabled size="md" variant="solid">
              GitHub isn’t available right now
            </Button>
          )}
        </CardContent>
      </Card>

      <FieldSeparator>or</FieldSeparator>

      <div className="mt-4 flex justify-center gap-4">
        <Button disabled={isBusy} onClick={actions.onManual} variant="ghost">
          {actions.pending === "manual" ? (
            <Spinner data-icon="inline-start" size="xs" />
          ) : (
            <Gear aria-hidden data-icon="inline-start" />
          )}
          Set up manually
        </Button>
        <Button disabled={isBusy} onClick={actions.onSkip} variant="ghost">
          {actions.pending === "skipped" && (
            <Spinner data-icon="inline-start" size="xs" />
          )}
          Skip for now
          {actions.pending !== "skipped" && (
            <ArrowRight aria-hidden data-icon="inline-end" />
          )}
        </Button>
      </div>
      <ActionError message={actions.actionError} />
    </SetupShell>
  );
}
