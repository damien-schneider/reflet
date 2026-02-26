"use client";

import { ShieldStar } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { SuperAdminDashboard } from "@/features/super-admin/components/super-admin-dashboard";

export default function SuperAdminPage() {
  const isSuperAdmin = useQuery(api.super_admin.isSuperAdmin);

  if (isSuperAdmin === undefined) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-800/30">
              <ShieldStar
                className="size-7 text-red-600 dark:text-red-400"
                weight="duotone"
              />
            </div>
          </div>
          <H2>Access Denied</H2>
          <Muted className="mt-2">
            You do not have super admin privileges.
          </Muted>
          <Link
            className="mt-6 inline-block rounded-lg bg-olive-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-olive-700"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <SuperAdminDashboard />;
}
