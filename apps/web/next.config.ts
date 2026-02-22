import createMDX from "@next/mdx";
import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

// Import env to validate at build time
import "@reflet/env/web";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,

  // Enable MDX pages
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  // GEO: redirect llm.txt to llms.txt for crawlers that expect the shorter path
  redirects() {
    return [{ source: "/llm.txt", destination: "/llms.txt", permanent: true }];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
    ],
  },

  transpilePackages: ["@reflet/backend", "@reflet/env", "@reflet/ui"],
  serverExternalPackages: ["isomorphic-dompurify"],
  turbopack: {
    resolveAlias: {
      // Browser fallbacks for Node.js modules
      fs: { browser: "./empty.ts" },
      net: { browser: "./empty.ts" },
      tls: { browser: "./empty.ts" },
    },
  },
  // biome-ignore lint/suspicious/useAwait: Next.js headers function is async
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const configWithMDX = withMDX(nextConfig);

export default withPostHogConfig(configWithMDX, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
  projectId: process.env.POSTHOG_PROJECT_ID
    ? Number(process.env.POSTHOG_PROJECT_ID)
    : undefined,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    deleteAfterUpload: true,
  },
});
