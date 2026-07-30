import type { MetadataRoute } from "next";

import { BASE_URL } from "@/lib/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/dashboard/",
          "/dashboard-demo/",
          "/auth/",
          "/invite/",
          "/pending-invitations/",
          "/settings/",
          "/_next/",
        ],
        userAgent: "*",
      },
      // GEO: Allow AI/LLM crawlers on public content
      {
        allow: ["/", "/blog/", "/docs/", "/features", "/pricing"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "GPTBot",
      },
      {
        allow: ["/", "/blog/", "/docs/", "/features", "/pricing"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "ChatGPT-User",
      },
      {
        allow: ["/", "/blog/", "/docs/", "/features", "/pricing"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "ClaudeBot",
      },
      {
        allow: ["/", "/blog/", "/docs/", "/features", "/pricing"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "anthropic-ai",
      },
      {
        allow: ["/", "/blog/", "/docs/", "/features", "/pricing"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "PerplexityBot",
      },
      {
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "Google-Extended",
      },
      {
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "Applebot-Extended",
      },
      {
        allow: ["/", "/blog/", "/docs/"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "Bytespider",
      },
      {
        allow: ["/", "/blog/", "/docs/"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
        userAgent: "cohere-ai",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
