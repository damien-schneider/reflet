"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  PageActions,
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { env } from "@reflet/env/web";
import { IconRss } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { ChangelogSubscribe } from "./changelog-subscribe";
import { ReleaseTimeline, ReleaseTimelineSkeleton } from "./release-timeline";

interface PublicChangelogOrg {
  _id: Id<"organizations">;
  name?: string;
  slug: string;
}

const RSS_LABEL = "RSS feed";

export function PublicChangelogView({
  org,
}: {
  org: PublicChangelogOrg | null | undefined;
}) {
  const releases = useQuery(
    api.changelog.queries.listPublished,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (!org) {
    return (
      <PageLayout scroll="page" width="content">
        <PageHeader>
          <PageTitle>Changelog</PageTitle>
          <Skeleton className="h-4 w-72 max-w-full" />
        </PageHeader>
        <PageBody>
          <ReleaseTimelineSkeleton />
        </PageBody>
      </PageLayout>
    );
  }

  const rssUrl = `${env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site")}/rss/${org.slug}`;

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Changelog</PageTitle>
        <PageDescription>
          {org.name
            ? `New features, fixes and improvements to ${org.name}.`
            : "New features, fixes and improvements."}
        </PageDescription>
        <PageActions>
          <Tooltip>
            <TooltipTrigger
              render={
                <ButtonLink
                  aria-label={RSS_LABEL}
                  href={rssUrl}
                  iconOnly
                  rel="noopener noreferrer"
                  target="_blank"
                  variant="surface"
                />
              }
            >
              <IconRss aria-hidden="true" className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{RSS_LABEL}</TooltipContent>
          </Tooltip>
          <ChangelogSubscribe organizationId={org._id} />
        </PageActions>
      </PageHeader>
      <PageBody>
        <ReleaseTimeline orgSlug={org.slug} releases={releases} />
      </PageBody>
    </PageLayout>
  );
}
