"use client";

import {
  ArrowRight,
  Brain,
  FileText,
  GithubLogo,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H1, Muted, Text } from "@/components/ui/typography";
import { StatusCard } from "./status-card";
import { TagsCard } from "./tags-card";

interface ProjectHubPageProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function ProjectHubPage({
  organizationId,
  orgSlug,
}: ProjectHubPageProps) {
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
  );

  const aggregateStatus = useQuery(api.status.monitors.getAggregateStatus, {
    organizationId,
  });

  const tags = useQuery(api.feedback.tags_queries.list, { organizationId });

  const setupStatus = useQuery(
    api.integrations.github.project_setup_queries.getSetupStatus,
    { organizationId }
  );

  const repoFullName = githubConnection?.repositoryFullName;

  const basePath = `/dashboard/${orgSlug}`;

  return (
    <div className="admin-container">
      <div className="mb-8">
        <H1 className="mb-1">Project</H1>
        <Muted>
          {repoFullName ? (
            <>
              Connected to{" "}
              <span className="font-medium text-foreground">
                {repoFullName}
              </span>
            </>
          ) : (
            "Your project at a glance"
          )}
        </Muted>
      </div>

      {githubConnection === null && (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <GithubLogo className="size-5 text-muted-foreground" />
              <Text variant="bodySmall">
                Connect GitHub to auto-configure monitors, keywords, changelog,
                and more.
              </Text>
            </div>
            <Button render={<Link href={`${basePath}/setup`} />} size="sm">
              Connect
              <ArrowRight className="ml-1 size-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard aggregateStatus={aggregateStatus} basePath={basePath} />

        <Link href={`${basePath}/changelog`}>
          <Card className="h-full transition-colors hover:bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4" />
                Changelog
              </CardTitle>
            </CardHeader>
            <CardContent>
              {githubConnection ? (
                <Text className="font-medium" variant="bodySmall">
                  Synced with GitHub releases
                </Text>
              ) : (
                <Muted className="text-xs">
                  Connect GitHub to sync releases
                </Muted>
              )}
            </CardContent>
          </Card>
        </Link>

        <TagsCard basePath={basePath} tags={tags} />

        <Link href={`${basePath}/ai`}>
          <Card className="h-full transition-colors hover:bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="size-4" />
                AI & MCP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="font-medium" variant="bodySmall">
                AI agent & MCP tools
              </Text>
              <Muted className="mt-1 text-xs">Configure from the AI page</Muted>
            </CardContent>
          </Card>
        </Link>

        <Link href={`${basePath}/settings/github`}>
          <Card className="h-full transition-colors hover:bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <GithubLogo className="size-4" />
                GitHub
              </CardTitle>
            </CardHeader>
            <CardContent>
              {githubConnection ? (
                <>
                  <Text className="font-medium" variant="bodySmall">
                    {repoFullName}
                  </Text>
                  <Muted className="mt-1 text-xs">Connected</Muted>
                </>
              ) : (
                <Muted className="text-xs">Not connected</Muted>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {setupStatus?.setupCompleted && setupStatus.hasGitHub && (
        <div className="mt-6 flex items-center justify-center">
          <Button
            render={<Link href={`${basePath}/setup`} />}
            size="sm"
            variant="ghost"
          >
            <Sparkle className="mr-1.5 size-3.5" />
            Re-run AI setup
          </Button>
        </div>
      )}
    </div>
  );
}
