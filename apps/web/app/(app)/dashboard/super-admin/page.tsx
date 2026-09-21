"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { PageBody, PageLayout } from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ShieldStar } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { H2, Muted } from "@/components/ui/typography";
import { SuperAdminDashboard } from "@/features/super-admin/components/super-admin-dashboard";

function AccessDenied() {
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldStar
              className="size-7 text-destructive-text"
              weight="duotone"
            />
          </div>
        </div>
        <H2>Access Denied</H2>
        <Muted className="mt-2">You do not have super admin privileges.</Muted>
        <Button
          className="mt-6"
          render={<Link href="/dashboard" />}
          tone="primary"
          variant="solid"
        >
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const isSuperAdmin = useQuery(api.organizations.super_admin.isSuperAdmin);

  if (isSuperAdmin === undefined) {
    return (
      <PageLayout scroll="page" width="wide">
        <PageBody contentClassName="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied />;
  }

  return <SuperAdminDashboard />;
}
