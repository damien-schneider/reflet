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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/web";
import { IconRss } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { ChangelogSubscribe } from "@/features/changelog/components/changelog-subscribe";
import { ReleaseTimeline } from "@/features/changelog/components/release-timeline";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";

export default function CustomDomainChangelogPage() {
  const org = useCustomDomainOrg();
  const releases = useQuery(
    api.changelog.queries.listPublished,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (!org) {
    return (
      <PageLayout scroll="page" width="content">
        <PageBody>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div>Loading...</div>
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  const convexSiteUrl = env.NEXT_PUBLIC_CONVEX_URL.replace(
    ".convex.cloud",
    ".convex.site"
  );
  const rssUrl = convexSiteUrl ? `${convexSiteUrl}/rss/${org.slug}` : null;

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Changelog</PageTitle>
        <PageDescription>
          Stay up to date with the latest updates and improvements.
        </PageDescription>
        <PageActions>
          {rssUrl && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <ButtonLink
                    className="size-10"
                    href={rssUrl}
                    iconOnly
                    rel="noopener noreferrer"
                    target="_blank"
                    variant="surface"
                  />
                }
              >
                <IconRss className="h-4 w-4" />
                <span className="sr-only">RSS Feed</span>
              </TooltipTrigger>
              <TooltipContent>RSS Feed</TooltipContent>
            </Tooltip>
          )}
          <ChangelogSubscribe organizationId={org._id} />
        </PageActions>
      </PageHeader>
      <PageBody>
        <ReleaseTimeline
          emptyAction={<ChangelogSubscribe organizationId={org._id} />}
          isAdmin={false}
          orgSlug={org.slug}
          releases={releases ?? []}
        />
      </PageBody>
    </PageLayout>
  );
}
