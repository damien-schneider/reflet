import createMDX from "@next/mdx";
import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

import "@reflet/env/web";

const nextConfig: NextConfig = {
  // Rust MDX stays serializable under Turbopack
  experimental: {
    mdxRs: {
      mdxType: "gfm",
    },
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@tabler/icons-react",
      "recharts",
      "motion",
      "motion/react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "embla-carousel-react",
      "@daypicker/react",
      "cmdk",
    ],
    useTypeScriptCli: true,
  },
  // biome-ignore lint/suspicious/useAwait: Next.js headers function is async
  async headers() {
    return [
      {
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
        source: "/:path*",
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
        protocol: "https",
      },
      {
        hostname: "images.unsplash.com",
        protocol: "https",
      },
      {
        hostname: "*.convex.cloud",
        protocol: "https",
      },
    ],
  },

  // Enable MDX pages
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  reactCompiler: true,
  reactStrictMode: true,

  // GEO: redirect llm.txt to llms.txt for crawlers that expect the shorter path
  redirects() {
    return [{ destination: "/llms.txt", permanent: true, source: "/llm.txt" }];
  },

  transpilePackages: ["@reflet/backend", "@reflet/env", "@reflet/ui"],
  turbopack: {
    resolveAlias: {
      // Browser fallbacks for Node.js modules
      fs: { browser: "./empty.ts" },
      net: { browser: "./empty.ts" },
      tls: { browser: "./empty.ts" },
    },
  },
};

const withMDX = createMDX({});

const configWithMDX = withMDX(nextConfig);

const posthogApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const posthogProjectId = process.env.POSTHOG_PROJECT_ID;

export default posthogApiKey && posthogProjectId
  ? withPostHogConfig(configWithMDX, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      personalApiKey: posthogApiKey,
      projectId: posthogProjectId,
      sourcemaps: {
        deleteAfterUpload: true,
      },
    })
  : configWithMDX;
