import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo-config";
import PublicStatusPageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  return generatePageMetadata({
    title: `${orgSlug} - System Status`,
    description: `Check the current status and uptime of ${orgSlug} services. View active incidents and subscribe to updates.`,
    path: `/${orgSlug}/status`,
    keywords: [
      "status",
      "uptime",
      "incidents",
      "system status",
      "service health",
      orgSlug,
    ],
  });
}

export default function PublicStatusPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  return <PublicStatusPageClient params={params} />;
}
