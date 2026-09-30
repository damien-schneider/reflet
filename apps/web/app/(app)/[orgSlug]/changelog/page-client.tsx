"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { PublicChangelogView } from "@/features/changelog/components/public-changelog-view";

export default function PublicChangelogPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  return <PublicChangelogView org={org} />;
}
