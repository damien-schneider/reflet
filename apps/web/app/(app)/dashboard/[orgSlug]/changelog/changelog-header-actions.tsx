"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { PageActions } from "@ctrl-ui/react/ui/page-layout";
import { GearSix, GithubLogo, Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import { authClient } from "@/lib/auth-client";

export function ChangelogHeaderActions({
  github,
  onOpenSettings,
  orgSlug,
}: {
  github: {
    hasConfiguredSync: boolean;
    isConnected: boolean;
    organizationId: Id<"organizations">;
  };
  onOpenSettings: () => void;
  orgSlug: string;
}) {
  return (
    <PageActions>
      {github.isConnected ? (
        github.hasConfiguredSync && (
          <Button
            aria-label="Changelog settings"
            onClick={onOpenSettings}
            variant="ghost"
          >
            <GearSix aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        )
      ) : (
        <ConnectGithubButton
          organizationId={github.organizationId}
          orgSlug={orgSlug}
        />
      )}
      <ButtonLink
        render={<Link href={`/dashboard/${orgSlug}/changelog/new`} />}
        tone="primary"
        variant="solid"
      >
        <Plus aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Create release</span>
        <span className="sm:hidden">New</span>
      </ButtonLink>
    </PageActions>
  );
}

function ConnectGithubButton({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const { data: session } = authClient.useSession();
  const href = buildGitHubInstallUrl({
    organizationId,
    orgSlug,
    userId: session?.user?.id,
  });

  if (!href) {
    return null;
  }

  return (
    <ButtonLink render={<Link href={href} />} variant="surface">
      <GithubLogo aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Connect GitHub</span>
      <span className="sm:hidden">GitHub</span>
    </ButtonLink>
  );
}
