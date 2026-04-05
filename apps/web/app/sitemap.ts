import { api } from "@reflet/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { MetadataRoute } from "next";

import { getAllBlogPosts } from "@/lib/blog";
import { BASE_URL } from "@/lib/seo-config";

/** Revalidate sitemap periodically for fresh lastModified. */
export const revalidate = 86_400; // 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/features`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/autopilot`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/agents`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/integrations`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/security`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Docs pages
  const docsPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/docs/sdk`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/docs/sdk/installation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/docs/sdk/react-hooks`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/docs/api`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/docs/widget`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/docs/widget/feedback-widget`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/docs/widget/changelog-widget`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/docs/components`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Legal pages (low priority)
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Blog posts (use actual post date for lastModified)
  const posts = await getAllBlogPosts();
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.meta.date),
    changeFrequency: "monthly" as const,
    priority: post.meta.category === "comparison" ? 0.85 : 0.8,
  }));

  // Public organization pages
  let orgPages: MetadataRoute.Sitemap = [];
  let feedbackPages: MetadataRoute.Sitemap = [];

  try {
    const [publicOrgs, publicFeedback] = await Promise.all([
      fetchQuery(api.sitemap_public.getPublicOrgSlugs, {}),
      fetchQuery(api.sitemap_public.getPublicFeedbackForSitemap, {}),
    ]);

    orgPages = publicOrgs.flatMap((org) => [
      {
        url: `${BASE_URL}/${org.slug}`,
        lastModified: new Date(org.updatedAt),
        changeFrequency: "daily" as const,
        priority: 0.7,
      },
      {
        url: `${BASE_URL}/${org.slug}/changelog`,
        lastModified: new Date(org.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      },
    ]);

    feedbackPages = publicFeedback.map((entry) => ({
      url: `${BASE_URL}/${entry.orgSlug}/feedback/${entry.feedbackId}`,
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    // Silently continue if Convex is unreachable during build
  }

  return [
    ...staticPages,
    ...docsPages,
    ...legalPages,
    ...blogPages,
    ...orgPages,
    ...feedbackPages,
  ];
}
