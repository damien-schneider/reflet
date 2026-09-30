"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { GithubLogo, Lightbulb } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

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
    <div className="flex items-center gap-3 rounded-(--radius-panel) border border-dashed px-4 py-3 text-start">
      <Lightbulb aria-hidden className="size-4 shrink-0 text-warning-text" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-label">Find services automatically</p>
        <p className="text-caption text-muted-foreground">{description}</p>
      </div>
      <ButtonLink
        render={<Link href={`/dashboard/${orgSlug}/setup`} />}
        size="xs"
        variant="surface"
      >
        <GithubLogo aria-hidden data-icon="inline-start" />
        Connect GitHub
      </ButtonLink>
    </div>
  );
}
