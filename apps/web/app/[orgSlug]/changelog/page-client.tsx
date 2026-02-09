"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { env } from "@reflet-v2/env/web";
import { IconRss } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { use } from "react";

import { buttonVariants } from "@/components/ui/button";
import { H1, Lead } from "@/components/ui/typography";
import { ChangelogSubscribe } from "@/features/changelog/components/changelog-subscribe";
import { ReleaseTimeline } from "@/features/changelog/components/release-timeline";
import { cn } from "@/lib/utils";

export default function PublicChangelogPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.changelog.listPublished,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const convexSiteUrl = env.NEXT_PUBLIC_CONVEX_URL.replace(
    ".convex.cloud",
    ".convex.site"
  );
  const rssUrl = convexSiteUrl ? `${convexSiteUrl}/rss/${orgSlug}` : null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <H1 variant="page">Changelog</H1>
          <Lead className="mt-2">
            Stay up to date with the latest updates and improvements.
          </Lead>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rssUrl && (
            <a
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" })
              )}
              href={rssUrl}
              rel="noopener noreferrer"
              target="_blank"
              title="RSS Feed"
            >
              <IconRss className="h-4 w-4" />
              <span className="sr-only">RSS Feed</span>
            </a>
          )}
          <ChangelogSubscribe organizationId={org._id as Id<"organizations">} />
        </div>
      </div>

      <ReleaseTimeline
        emptyAction={
          <ChangelogSubscribe organizationId={org._id as Id<"organizations">} />
        }
        isAdmin={false}
        orgSlug={orgSlug}
        releases={releases ?? []}
      />
    </div>
  );
}
