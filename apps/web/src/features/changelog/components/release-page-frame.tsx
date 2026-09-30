"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

interface ReleasePageFrameProps {
  children: ReactNode;
  description: string;
  orgSlug: string;
  title: string;
}

export function ReleasePageFrame({
  children,
  description,
  orgSlug,
  title,
}: ReleasePageFrameProps) {
  return (
    <PageLayout scroll="page" width="wide">
      <PageHeader className="flex flex-col items-start">
        <ButtonLink
          className="-ml-2"
          render={<Link href={`/dashboard/${orgSlug}/changelog`} />}
          size="xs"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Changelog
        </ButtonLink>
        <PageTitle>{title}</PageTitle>
        <PageDescription>{description}</PageDescription>
      </PageHeader>
      <PageBody>{children}</PageBody>
    </PageLayout>
  );
}

export function ReleaseEditorSkeleton() {
  return (
    <div aria-busy="true" className="max-w-4xl space-y-4 rounded-xl border p-6">
      <span className="sr-only" role="status">
        Loading release…
      </span>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-9 w-2/3" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

interface ReleasePageMessageProps {
  description: string;
  orgSlug: string;
  title: string;
}

export function ReleasePageMessage({
  description,
  orgSlug,
  title,
}: ReleasePageMessageProps) {
  return (
    <PageLayout scroll="page" width="wide">
      <PageBody>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ButtonLink
              render={<Link href={`/dashboard/${orgSlug}/changelog`} />}
              variant="surface"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to changelog
            </ButtonLink>
          </EmptyContent>
        </Empty>
      </PageBody>
    </PageLayout>
  );
}
