"use client";

import { ArrowRight, Check, Gear, GithubLogo } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { H1, Muted, Text } from "@/components/ui/typography";
import { AnalyzingView } from "./analyzing-view";
import { ReviewView } from "./review-view";

const SETUP_BENEFITS = [
  "Analyze your tech stack & architecture",
  "Discover services to monitor",
  "Extract keywords for market intelligence",
  "Configure your changelog from releases",
  "Suggest tags from your codebase",
  "Generate AI prompts for your project",
  "Set up MCP for your coding assistant",
] as const;

interface SetupPageProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function SetupPage({ organizationId, orgSlug }: SetupPageProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

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

  // If setup is already completed, redirect to project hub
  if (setupStatus?.setupCompleted) {
    router.replace(`/dashboard/${orgSlug}/project`);
    return null;
  }

  const handleConnectGitHub = () => {
    window.location.href = `/api/github/install?organizationId=${organizationId}&orgSlug=${encodeURIComponent(orgSlug)}&returnTo=setup`;
  };

  const handleStartAnalysis = async () => {
    if (isStarting) {
      return;
    }
    setIsStarting(true);
    try {
      await startProjectSetup({ organizationId });
    } finally {
      setIsStarting(false);
    }
  };

  const handleManualSetup = async () => {
    await skipSetup({ organizationId, method: "manual" });
    router.push(`/dashboard/${orgSlug}`);
  };

  const handleSkip = async () => {
    await skipSetup({ organizationId, method: "skipped" });
    router.push(`/dashboard/${orgSlug}`);
  };

  // Show analyzing view
  if (projectSetup?.status === "analyzing") {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnalyzingView
            repositoryFullName={setupStatus?.repositoryFullName ?? ""}
            steps={projectSetup.steps}
          />
        </div>
      </div>
    );
  }

  // Show review view
  if (projectSetup?.status === "review") {
    return (
      <ReviewView
        organizationId={organizationId}
        orgSlug={orgSlug}
        setup={projectSetup}
      />
    );
  }

  // Show error state
  if (projectSetup?.status === "error") {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <H1 className="mb-2">Setup failed</H1>
          <Text className="mb-6" variant="bodySmall">
            {projectSetup.error ??
              "An unexpected error occurred. Please try again."}
          </Text>
          <div className="flex justify-center gap-3">
            <Button onClick={handleStartAnalysis} variant="default">
              Try again
            </Button>
            <Button onClick={handleManualSetup} variant="outline">
              Set up manually
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // GitHub connected but analysis not started? Start it
  if (setupStatus?.hasGitHub && !projectSetup) {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-800/30">
              <Check
                className="size-7 text-emerald-600 dark:text-emerald-400"
                weight="bold"
              />
            </div>
          </div>
          <H1 className="mb-2">GitHub connected</H1>
          <Muted className="mb-6">
            Connected to {setupStatus.repositoryFullName}. Ready to analyze your
            repository and auto-configure everything.
          </Muted>
          <Button disabled={isStarting} onClick={handleStartAnalysis} size="lg">
            Analyze this repo
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Initial state: show connect GitHub prompt
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <H1 className="mb-2">Set up your project in seconds</H1>
          <Muted>
            Connect GitHub and we&apos;ll auto-configure everything with AI.
          </Muted>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-3">
              <GithubLogo className="size-6" weight="fill" />
              <Text className="font-semibold">Connect GitHub Repository</Text>
            </div>

            <Text className="mb-4 text-muted-foreground" variant="bodySmall">
              We&apos;ll automatically:
            </Text>

            <ul className="mb-6 space-y-2">
              {SETUP_BENEFITS.map((benefit) => (
                <li
                  className="flex items-start gap-2 text-muted-foreground text-sm"
                  key={benefit}
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-emerald-500"
                    weight="bold"
                  />
                  {benefit}
                </li>
              ))}
            </ul>

            <Button className="w-full" onClick={handleConnectGitHub} size="lg">
              Connect GitHub
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <Button onClick={handleManualSetup} variant="ghost">
            <Gear className="mr-2 size-4" />
            Set up manually
          </Button>
          <Button onClick={handleSkip} variant="ghost">
            Skip for now
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
