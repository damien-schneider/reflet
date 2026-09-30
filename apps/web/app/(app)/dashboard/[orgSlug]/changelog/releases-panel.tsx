"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";
import { DeleteReleaseDialog } from "@/features/changelog/components/delete-release-dialog";
import { ReleaseTimeline } from "@/features/changelog/components/release-timeline";
import { RetroactiveDraftsBar } from "@/features/changelog/components/retroactive-drafts-bar";
import { RetroactiveInlineFlow } from "@/features/changelog/components/retroactive-inline-flow";
import { useReleaseMutations } from "./use-release-mutations";

type Release = FunctionReturnType<typeof api.changelog.queries.list>[number];

export function ReleasesPanel({
  isAdmin,
  isGithubConnected,
  organizationId,
  orgSlug,
}: {
  isAdmin: boolean;
  isGithubConnected: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const releases = useQuery(api.changelog.queries.list, { organizationId });
  const { deleteRelease, publishRelease, unpublishRelease } =
    useReleaseMutations(organizationId);
  const [deletingRelease, setDeletingRelease] = useState<Release | null>(null);

  const handleDeleteRelease = async () => {
    if (!deletingRelease) {
      return;
    }
    await deleteRelease({ id: deletingRelease._id });
    setDeletingRelease(null);
  };

  return (
    <>
      {isGithubConnected && (
        <RetroactiveInlineFlow organizationId={organizationId} />
      )}
      {releases && releases.length > 0 && (
        <RetroactiveDraftsBar orgSlug={orgSlug} releases={releases} />
      )}
      <ReleaseTimeline
        emptyAction={isAdmin ? <CreateReleaseButton orgSlug={orgSlug} /> : null}
        isAdmin={isAdmin}
        onDelete={setDeletingRelease}
        onPublish={(id) => publishRelease({ id })}
        onUnpublish={(id) => unpublishRelease({ id })}
        orgSlug={orgSlug}
        releases={releases}
      />
      {deletingRelease && (
        <DeleteReleaseDialog
          onClose={() => setDeletingRelease(null)}
          onConfirm={handleDeleteRelease}
          open={Boolean(deletingRelease)}
          releaseTitle={deletingRelease.title}
        />
      )}
    </>
  );
}

function CreateReleaseButton({ orgSlug }: { orgSlug: string }) {
  return (
    <ButtonLink
      render={<Link href={`/dashboard/${orgSlug}/changelog/new`} />}
      tone="primary"
      variant="solid"
    >
      <Plus aria-hidden="true" className="size-4" />
      Create release
    </ButtonLink>
  );
}
