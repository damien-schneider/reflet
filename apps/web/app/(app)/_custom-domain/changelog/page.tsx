"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/web";
import { IconRss } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { H1, Lead } from "@/components/ui/typography";
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const convexSiteUrl = env.NEXT_PUBLIC_CONVEX_URL.replace(
    ".convex.cloud",
    ".convex.site"
  );
  const rssUrl = convexSiteUrl ? `${convexSiteUrl}/rss/${org.slug}` : null;

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
        </div>
      </div>

      <ReleaseTimeline
        emptyAction={<ChangelogSubscribe organizationId={org._id} />}
        isAdmin={false}
        orgSlug={org.slug}
        releases={releases ?? []}
      />
    </div>
  );
}
