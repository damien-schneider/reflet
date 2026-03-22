import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";

import FeedbackItemClient from "./feedback-item-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}): Promise<Metadata> {
  const { orgSlug, feedbackId } = await params;

  try {
    const meta = await fetchQuery(api.feedback.queries.getPublicMeta, {
      id: feedbackId as Id<"feedback">,
    });

    if (meta) {
      const description = meta.description
        ? meta.description.slice(0, 160)
        : `Feature request for ${meta.orgName}. ${meta.voteCount} votes.`;

      return generatePageMetadata({
        title: `${meta.title} | ${meta.orgName}`,
        description,
        path: `/${orgSlug}/feedback/${feedbackId}`,
        keywords: [meta.orgName, "feedback", "feature request", meta.status],
      });
    }
  } catch {
    // Fall through to default metadata
  }

  return generatePageMetadata({
    title: `Feedback | ${orgSlug}`,
    description: `View feedback and feature requests for ${orgSlug}.`,
    path: `/${orgSlug}/feedback/${feedbackId}`,
    keywords: ["feedback", "feature request", orgSlug],
  });
}

export default function FeedbackItemPage({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  return <FeedbackItemClient params={params} />;
}
