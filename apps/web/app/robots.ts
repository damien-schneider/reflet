import type { MetadataRoute } from "next";

import { BASE_URL } from "@/lib/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
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
      },
      // GEO: Allow AI/LLM crawlers on public content
      {
        userAgent: "GPTBot",
        allow: [
          "/",
          "/blog/",
          "/docs/",
          "/features",
          "/pricing",
          "/autopilot",
          "/agents",
        ],
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: [
          "/",
          "/blog/",
          "/docs/",
          "/features",
          "/pricing",
          "/autopilot",
          "/agents",
        ],
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: [
          "/",
          "/blog/",
          "/docs/",
          "/features",
          "/pricing",
          "/autopilot",
          "/agents",
        ],
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: [
          "/",
          "/blog/",
          "/docs/",
          "/features",
          "/pricing",
          "/autopilot",
          "/agents",
        ],
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: [
          "/",
          "/blog/",
          "/docs/",
          "/features",
          "/pricing",
          "/autopilot",
          "/agents",
        ],
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "Bytespider",
        allow: ["/", "/blog/", "/docs/", "/autopilot", "/agents"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
      {
        userAgent: "cohere-ai",
        allow: ["/", "/blog/", "/docs/", "/autopilot", "/agents"],
        disallow: ["/api/", "/dashboard/", "/auth/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
