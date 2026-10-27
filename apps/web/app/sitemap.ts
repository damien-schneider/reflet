import { api } from "@reflet/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { MetadataRoute } from "next";

import { DOCS_NAVIGATION } from "@/components/docs/navigation";
import { getAllBlogPosts } from "@/lib/blog";
import { BASE_URL } from "@/lib/seo-config";

export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      changeFrequency: "weekly",
      lastModified: now,
      priority: 1,
      url: BASE_URL,
    },
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.9,
      url: `${BASE_URL}/features`,
    },
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.9,
      url: `${BASE_URL}/pricing`,
    },
    {
      changeFrequency: "daily",
      lastModified: now,
      priority: 0.9,
      url: `${BASE_URL}/blog`,
    },
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.8,
      url: `${BASE_URL}/integrations`,
    },
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.6,
      url: `${BASE_URL}/security`,
    },
  ];

  const docsPaths = DOCS_NAVIGATION.flatMap((section) => [
    ...section.links,
    ...(section.groups?.flatMap((group) => group.links) ?? []),
  ]);
  const docsPages: MetadataRoute.Sitemap = docsPaths.map(({ href }) => ({
    changeFrequency: "weekly",
    lastModified: now,
    priority: 0.7,
    url: `${BASE_URL}${href}`,
  }));

  const legalPages: MetadataRoute.Sitemap = [
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.3,
      url: `${BASE_URL}/terms`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.3,
      url: `${BASE_URL}/privacy`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.3,
      url: `${BASE_URL}/cookies`,
    },
  ];

  const posts = await getAllBlogPosts();
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    changeFrequency: "monthly" as const,
    lastModified: new Date(post.meta.date),
    priority: post.meta.category === "comparison" ? 0.85 : 0.8,
    url: `${BASE_URL}/blog/${post.slug}`,
  }));

  let orgPages: MetadataRoute.Sitemap = [];
  let feedbackPages: MetadataRoute.Sitemap = [];

  try {
    const [publicOrgs, publicFeedback] = await Promise.all([
      fetchQuery(api.sitemap_public.getPublicOrgSlugs, {}),
      fetchQuery(api.sitemap_public.getPublicFeedbackForSitemap, {}),
    ]);

    orgPages = publicOrgs.flatMap((org) => [
      {
        changeFrequency: "daily" as const,
        lastModified: new Date(org.updatedAt),
        priority: 0.7,
        url: `${BASE_URL}/${org.slug}`,
      },
      {
        changeFrequency: "weekly" as const,
        lastModified: new Date(org.updatedAt),
        priority: 0.6,
        url: `${BASE_URL}/${org.slug}/changelog`,
      },
    ]);

    feedbackPages = publicFeedback.map((entry) => ({
      changeFrequency: "weekly" as const,
      lastModified: new Date(entry.updatedAt),
      priority: 0.5,
      url: `${BASE_URL}/${entry.orgSlug}/feedback/${entry.feedbackId}`,
    }));
  } catch {
    // Convex may be unavailable during static builds.
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
