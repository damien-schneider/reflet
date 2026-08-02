"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { SupportCenter } from "@/features/support/components/support-center";

export default function PublicSupportPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  return <SupportCenter backHref={`/${orgSlug}`} org={org} />;
}
