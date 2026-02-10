"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { H1, Muted, Text } from "@/components/ui/typography";
import { ReleaseEditor } from "@/features/changelog/components/release-editor";

export default function EditReleasePage({
  params,
}: {
  params: Promise<{ orgSlug: string; releaseId: Id<"releases"> }>;
}) {
  const { orgSlug, releaseId } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const release = useQuery(api.releases.get, { id: releaseId });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H1>Organization not found</H1>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  if (currentMember && !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H1>Access Denied</H1>
          <Muted className="mt-2">
            You don&apos;t have permission to edit releases.
          </Muted>
          <Link href={`/dashboard/${orgSlug}/changelog`}>
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Changelog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H1>Release not found</H1>
          <Muted className="mt-2">
            The release you&apos;re looking for doesn&apos;t exist.
          </Muted>
          <Link href={`/dashboard/${orgSlug}/changelog`}>
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Changelog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="mb-8">
        <Link
          className="mb-4 inline-flex items-center text-muted-foreground text-sm transition-colors hover:text-foreground"
          href={`/dashboard/${orgSlug}/changelog`}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Changelog
        </Link>
        <H1>Edit Release</H1>
        <Text variant="bodySmall">
          Update your release note. Changes are saved automatically as a draft.
        </Text>
      </div>

      <ReleaseEditor
        className="max-w-4xl"
        organizationId={org._id as Id<"organizations">}
        orgSlug={orgSlug}
        release={release}
      />
    </div>
  );
}
