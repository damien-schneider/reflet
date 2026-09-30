import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";

export function PublicOrgShellSkeleton() {
  return (
    <div aria-busy="true" className="min-h-screen">
      <p className="sr-only" role="status">
        Loading…
      </p>
      <div className="flex items-center justify-between px-4 py-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="hidden h-9 w-80 md:block" />
      </div>
      <div className="container mx-auto space-y-4 px-4 pt-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="mt-6 h-40 w-full rounded-(--radius-panel)" />
      </div>
    </div>
  );
}

interface PublicOrgNotFoundProps {
  description: string;
  homeHref: string;
  homeLabel: string;
  title: string;
}

export function PublicOrgNotFound({
  description,
  homeHref,
  homeLabel,
  title,
}: PublicOrgNotFoundProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <MagnifyingGlass aria-hidden className="size-6" />
          </EmptyMedia>
          <EmptyTitle aria-level={1} role="heading">
            {title}
          </EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink render={<Link href={homeHref} />} variant="surface">
            {homeLabel}
          </ButtonLink>
        </EmptyContent>
      </Empty>
    </main>
  );
}
