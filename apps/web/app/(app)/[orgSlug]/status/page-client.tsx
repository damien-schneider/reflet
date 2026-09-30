"use client";

import { use } from "react";
import { PublicStatusView } from "@/features/status/components/public-status-view";

export default function PublicStatusPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  return <PublicStatusView orgSlug={orgSlug} />;
}
