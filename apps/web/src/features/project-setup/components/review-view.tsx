"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Robot, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Muted, Text } from "@/components/ui/typography";
import { KeywordsSection } from "./keywords-section";
import { LaunchBar } from "./launch-bar";
import { MonitorsSection } from "./monitors-section";
import { ChangelogCard, PromptsCard, TagsCard } from "./review-sections";
import type {
  SetupData,
  SuggestedKeyword,
  SuggestedMonitor,
  SuggestedTag,
} from "./setup-types";

interface ReviewViewProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  setup: SetupData;
}

interface Acceptable {
  accepted: boolean;
}

function toggleAt<T extends Acceptable>(items: T[], index: number): T[] {
  return items.map((item, i) =>
    i === index ? { ...item, accepted: !item.accepted } : item
  );
}

function setAllAccepted<T extends Acceptable>(items: T[], accepted: boolean) {
  return items.map((item) => ({ ...item, accepted }));
}

export function ReviewView({
  organizationId,
  orgSlug,
  setup,
}: ReviewViewProps) {
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [monitors, setMonitors] = useState<SuggestedMonitor[]>(
    setup.suggestedMonitors ?? []
  );
  const [keywords, setKeywords] = useState<SuggestedKeyword[]>(
    setup.suggestedKeywords ?? []
  );
  const [tags, setTags] = useState<SuggestedTag[]>(setup.suggestedTags ?? []);

  const applySetupResults = useMutation(
    api.integrations.github.project_setup.applySetupResults
  );

  const handleLaunch = async () => {
    if (isApplying) {
      return;
    }
    setIsApplying(true);
    setLaunchError(null);
    try {
      await applySetupResults({
        acceptedKeywords: keywords
          .filter((k) => k.accepted)
          .map(({ keyword }) => ({ keyword, source: "both" as const })),
        acceptedMonitors: monitors
          .filter((m) => m.accepted)
          .map(({ url, name }) => ({ name, url })),
        acceptedTags: tags
          .filter((t) => t.accepted)
          .map(({ name, color }) => ({ color, name })),
        changelogSettings: setup.changelogConfig
          ? {
              autoVersioning: setup.changelogConfig.workflow !== "manual",
              targetBranch: setup.changelogConfig.targetBranch,
              versionPrefix: setup.changelogConfig.versionPrefix,
            }
          : undefined,
        organizationId,
        setupId: setup._id,
      });
      router.push(`/dashboard/${orgSlug}/project`);
    } catch (error: unknown) {
      setLaunchError(
        error instanceof Error
          ? error.message
          : "Couldn’t launch the project. Your selections are kept; try again."
      );
    }
    setIsApplying(false);
  };

  return (
    <PageLayout scroll="page" width="wide">
      <PageHeader>
        <PageTitle>Review your project setup</PageTitle>
        <PageDescription>
          Reflet suggested these from your repository. Keep what fits, then
          launch.
        </PageDescription>
      </PageHeader>
      <PageBody contentClassName="max-w-4xl space-y-6">
        {setup.projectOverview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkle aria-hidden className="size-4" />
                Project overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-pretty" variant="bodySmall">
                {setup.projectOverview}
              </Text>
            </CardContent>
          </Card>
        )}

        <MonitorsSection
          monitors={monitors}
          onToggle={(index) => setMonitors((prev) => toggleAt(prev, index))}
          onToggleAll={(accepted) =>
            setMonitors((prev) => setAllAccepted(prev, accepted))
          }
        />

        <KeywordsSection
          keywords={keywords}
          onToggle={(index) => setKeywords((prev) => toggleAt(prev, index))}
          onToggleAll={(accepted) =>
            setKeywords((prev) => setAllAccepted(prev, accepted))
          }
        />

        {setup.changelogConfig && (
          <ChangelogCard config={setup.changelogConfig} />
        )}

        <TagsCard
          onToggle={(index) => setTags((prev) => toggleAt(prev, index))}
          onToggleAll={(accepted) =>
            setTags((prev) => setAllAccepted(prev, accepted))
          }
          tags={tags}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Robot aria-hidden className="size-4" />
              Agents &amp; CLI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="mb-2 text-pretty" variant="bodySmall">
              A coding agent can claim feedback, fix it and open the pull
              request through the Reflet CLI. After launch, generate a secret
              key in Project → Agents &amp; CLI.
            </Text>
            <Muted className="text-caption">
              Works with any agent that can run a shell: Claude Code, Cursor,
              Codex, CI jobs.
            </Muted>
          </CardContent>
        </Card>

        <PromptsCard prompts={setup.suggestedPrompts ?? []} />

        <LaunchBar
          changelogConfig={setup.changelogConfig}
          error={launchError}
          isApplying={isApplying}
          keywords={keywords}
          monitors={monitors}
          onLaunch={handleLaunch}
          tags={tags}
        />
      </PageBody>
    </PageLayout>
  );
}
