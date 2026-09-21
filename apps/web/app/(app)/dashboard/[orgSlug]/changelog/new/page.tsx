"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";
import { H1, Muted } from "@/components/ui/typography";
import { ReleaseEditor } from "@/features/changelog/components/release-editor";

function NewReleaseMessage({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <PageLayout scroll="page" width="wide">
      <PageBody>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <H1>{title}</H1>
            {children}
          </div>
        </div>
      </PageBody>
    </PageLayout>
  );
}

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

  if (!org) {
    return (
      <NewReleaseMessage title="Organization not found">
        <Muted className="mt-2">
          The organization you&apos;re looking for doesn&apos;t exist.
        </Muted>
      </NewReleaseMessage>
    );
  }

  if (currentMember && !isAdmin) {
    return (
      <NewReleaseMessage title="Access Denied">
        <Muted className="mt-2">
          You don&apos;t have permission to create releases.
        </Muted>
        <Button
          className="mt-4"
          render={<Link href={`/dashboard/${orgSlug}/changelog`} />}
          variant="surface"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Changelog
        </Button>
      </NewReleaseMessage>
    );
  }

  return (
    <PageLayout scroll="page" width="wide">
      <PageHeader className="flex flex-col items-start">
        <Link
          className="inline-flex items-center text-muted-foreground text-sm transition-colors hover:text-foreground"
          href={`/dashboard/${orgSlug}/changelog`}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Changelog
        </Link>
        <PageTitle>Create Release</PageTitle>
        <PageDescription>
          Create a new release note. Changes are saved automatically as a draft.
        </PageDescription>
      </PageHeader>
      <PageBody>
        <ReleaseEditor
          className="max-w-4xl"
          organizationId={org._id}
          orgSlug={orgSlug}
        />
      </PageBody>
    </PageLayout>
  );
}
