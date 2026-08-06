"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";
import { H1 } from "@/components/ui/typography";
import { PublicOrgShell } from "@/features/public-org/components/public-org-shell";

export default function PublicOrgLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <H1 variant="page">Organization not found</H1>
        <Link
          className="mt-4 text-olive-600 underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
          href="/"
        >
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <PublicOrgShell basePath={`/${orgSlug}`} org={org} orgSlug={orgSlug}>
      {children}
    </PublicOrgShell>
  );
}
