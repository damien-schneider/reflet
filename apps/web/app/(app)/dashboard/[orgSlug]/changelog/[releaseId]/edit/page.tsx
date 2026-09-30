"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";
import { ReleaseEditor } from "@/features/changelog/components/release-editor";
import {
  ReleaseEditorSkeleton,
  ReleasePageFrame,
  ReleasePageMessage,
} from "@/features/changelog/components/release-page-frame";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";

export default function EditReleasePage({
  params,
}: {
  params: Promise<{ orgSlug: string; releaseId: Id<"releases"> }>;
}) {
  const { orgSlug, releaseId } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const release = useQuery(api.changelog.queries.get, { id: releaseId });
  const currentMember = useQuery(
    api.organizations.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  if (org === null) {
    return <OrgNotFound />;
  }

  if (currentMember && !isAdmin) {
    return (
      <ReleasePageMessage
        description="Ask an admin to edit releases for this organization."
        orgSlug={orgSlug}
        title="You can’t edit releases"
      />
    );
  }

  if (release === null) {
    return (
      <ReleasePageMessage
        description="It may have been deleted. Check the changelog for the latest releases."
        orgSlug={orgSlug}
        title="Release not found"
      />
    );
  }

  return (
    <ReleasePageFrame
      description="Changes save as you type."
      orgSlug={orgSlug}
      title="Edit release"
    >
      {org && release ? (
        <ReleaseEditor
          className="max-w-4xl"
          organizationId={org._id}
          orgSlug={orgSlug}
          release={release}
        />
      ) : (
        <ReleaseEditorSkeleton />
      )}
    </ReleasePageFrame>
  );
}
