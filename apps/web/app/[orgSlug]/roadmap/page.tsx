import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo-config";
import PublicRoadmapPageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  return generatePageMetadata({
    title: `${orgSlug} - Product Roadmap`,
    description: `See what ${orgSlug} is working on and what's coming next. Transparent product roadmap with planned features and development progress.`,
    path: `/${orgSlug}/roadmap`,
    keywords: [
      "roadmap",
      "product roadmap",
      "development progress",
      "planned features",
      orgSlug,
    ],
  });
}

export default function PublicRoadmapPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  return <PublicRoadmapPageClient params={params} />;
}
