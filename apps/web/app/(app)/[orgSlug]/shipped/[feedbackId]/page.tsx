import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";

import ShippedCardClient from "./shipped-card-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}): Promise<Metadata> {
  const { orgSlug, feedbackId } = await params;

  try {
    const meta = await fetchQuery(api.feedback.queries.getShippedMeta, {
      id: feedbackId as Id<"feedback">,
    });

    if (meta) {
      const description = meta.releaseTitle
        ? `"${meta.title}" has been shipped in ${meta.releaseTitle}. See what ${meta.orgName} built based on your feedback.`
        : `"${meta.title}" has been shipped by ${meta.orgName}. You asked, we shipped.`;

      const ogUrl = new URL(
        "/api/og/shipped",
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://reflet.app"
      );
      ogUrl.searchParams.set("feedback", meta.title);
      if (meta.releaseTitle) {
        ogUrl.searchParams.set("release", meta.releaseTitle);
      }
      if (meta.orgName) {
        ogUrl.searchParams.set("org", meta.orgName);
      }

      return generatePageMetadata({
        title: `Shipped: ${meta.title} | ${meta.orgName}`,
        description,
        path: `/${orgSlug}/shipped/${feedbackId}`,
        keywords: [meta.orgName, "shipped", "feature request", "changelog"],
        ogImage: ogUrl.toString(),
      });
    }
  } catch {
    // Fall through to default metadata
  }

  return generatePageMetadata({
    title: `Shipped | ${orgSlug}`,
    description: "See what was shipped based on your feedback.",
    path: `/${orgSlug}/shipped/${feedbackId}`,
    keywords: ["shipped", "feedback", orgSlug],
  });
}

export default function ShippedPage({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  return <ShippedCardClient params={params} />;
}
