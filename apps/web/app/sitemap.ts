import type { MetadataRoute } from "next";

const BASE_URL = "https://reflet.app";

/** Revalidate sitemap periodically for fresh lastModified. */
export const revalidate = 86_400; // 24 hours

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  return staticPages;
}
