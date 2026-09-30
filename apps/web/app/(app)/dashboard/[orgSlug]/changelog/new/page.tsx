"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { ReleaseEditor } from "@/features/changelog/components/release-editor";
import {
  ReleaseEditorSkeleton,
  ReleasePageFrame,
  ReleasePageMessage,
} from "@/features/changelog/components/release-page-frame";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";

export default function NewReleasePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
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
        description="Ask an admin to create releases for this organization."
        orgSlug={orgSlug}
        title="You can’t create releases"
      />
    );
  }

  return (
    <ReleasePageFrame
      description="Drafts save as you type. Publish when it’s ready."
      orgSlug={orgSlug}
      title="Create release"
    >
      {org ? (
        <ReleaseEditor
          className="max-w-4xl"
          organizationId={org._id}
          orgSlug={orgSlug}
        />
      ) : (
        <ReleaseEditorSkeleton />
      )}
    </ReleasePageFrame>
  );
}
