"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { SetupPage } from "@/features/project-setup/components/setup-page";

export default function SetupRoute({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (!org) {
    return null;
  }

  return <SetupPage organizationId={org._id} orgSlug={orgSlug} />;
}
