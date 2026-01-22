import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo-config";
import PublicChangelogPageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  return generatePageMetadata({
    title: `${orgSlug} - Changelog & Updates`,
    description: `Stay up to date with the latest updates and improvements from ${orgSlug}. See what's new and what's been shipped.`,
    path: `/${orgSlug}/changelog`,
    keywords: [
      "changelog",
      "updates",
      "release notes",
      "product updates",
      "new features",
      orgSlug,
    ],
  });
}

export default function PublicChangelogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  return <PublicChangelogPageClient params={params} />;
}
