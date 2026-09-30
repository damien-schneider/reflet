"use client";

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
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ShieldStar } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { SuperAdminDashboard } from "@/features/super-admin/components/super-admin-dashboard";

const STAT_SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export default function SuperAdminPage() {
  const isSuperAdmin = useQuery(api.organizations.super_admin.isSuperAdmin);

  if (isSuperAdmin === undefined) {
    return (
      <PageLayout scroll="page" width="wide">
        <PageBody aria-busy="true" contentClassName="space-y-6">
          <p className="sr-only" role="status">
            Loading…
          </p>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-80 max-w-full" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {STAT_SKELETON_KEYS.map((key) => (
              <Skeleton className="h-22 rounded-(--radius-panel)" key={key} />
            ))}
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <main className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <ShieldStar aria-hidden className="size-6" />
            </EmptyMedia>
            <EmptyTitle aria-level={1} role="heading">
              Super admins only
            </EmptyTitle>
            <EmptyDescription>
              Your account doesn’t have access to this area. Ask a Reflet super
              admin if you need it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ButtonLink render={<Link href="/dashboard" />} variant="surface">
              Back to dashboard
            </ButtonLink>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  return <SuperAdminDashboard />;
}
