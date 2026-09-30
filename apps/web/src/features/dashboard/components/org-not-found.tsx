import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { PageBody, PageLayout } from "@ctrl-ui/react/ui/page-layout";
import { Buildings } from "@phosphor-icons/react";
import Link from "next/link";

export function OrgNotFound() {
  return (
    <PageLayout scroll="page" width="content">
      <PageBody>
        <Empty className="min-h-[50vh]">
          <EmptyHeader>
            <EmptyMedia>
              <Buildings aria-hidden className="size-6" />
            </EmptyMedia>
            <EmptyTitle aria-level={1} role="heading">
              Organization not found
            </EmptyTitle>
            <EmptyDescription>
              It doesn’t exist, or you haven’t been invited yet. Check the link,
              ask an admin for an invite, or pick another organization.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ButtonLink render={<Link href="/dashboard" />} variant="surface">
              Back to dashboard
            </ButtonLink>
          </EmptyContent>
        </Empty>
      </PageBody>
    </PageLayout>
  );
}
