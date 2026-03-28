"use client";

import { GithubLogo, Lightbulb } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Muted, Text } from "@/components/ui/typography";

interface GitHubConnectHintProps {
  description: string;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function GitHubConnectHint({
  description,
  organizationId,
  orgSlug,
}: GitHubConnectHintProps) {
  const connection = useQuery(api.integrations.github.queries.getConnection, {
    organizationId,
  });

  if (connection !== null) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3">
      <Lightbulb className="size-4 shrink-0 text-amber-500" />
      <div className="flex-1">
        <Text className="font-medium" variant="bodySmall">
          Connect GitHub to auto-discover
        </Text>
        <Muted className="text-xs">{description}</Muted>
      </div>
      <Button
        render={<Link href={`/dashboard/${orgSlug}/setup`} />}
        size="sm"
        variant="outline"
      >
        <GithubLogo className="mr-1.5 size-3.5" />
        Connect
      </Button>
    </div>
  );
}
