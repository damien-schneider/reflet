import createMDX from "@next/mdx";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { env as serverEnv } from "@reflet/env/server";
import { env } from "@reflet/env/web";
import type { NextConfig } from "next";

const convexUrl = new URL(env.NEXT_PUBLIC_CONVEX_URL);

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
  },
  async headers() {
    return [
      {
        headers: [
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
        ],
        source: "/llms.txt",
      },
      {
        headers: [
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
        ],
        source: "/:path*.md",
      },
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
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
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
        hostname: convexUrl.hostname,
        pathname: "/api/storage/**",
        port: convexUrl.port,
        protocol: convexUrl.protocol === "http:" ? "http" : "https",
      },
    ],
  },

  // Enable MDX pages
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  reactCompiler: true,
  reactStrictMode: true,

  redirects() {
    return [
      // GEO: redirect llm.txt to llms.txt for crawlers that expect the shorter path
      { destination: "/llms.txt", permanent: true, source: "/llm.txt" },
      {
        destination: "/subscriptions/unsubscribe?list=changelog",
        permanent: true,
        source: "/changelog/unsubscribe",
      },
    ];
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

const posthogApiKey = serverEnv.POSTHOG_PERSONAL_API_KEY;
const posthogProjectId = serverEnv.POSTHOG_PROJECT_ID;

export default posthogApiKey && posthogProjectId
  ? withPostHogConfig(configWithMDX, {
      host: env.NEXT_PUBLIC_POSTHOG_HOST,
      personalApiKey: posthogApiKey,
      projectId: posthogProjectId,
      sourcemaps: {
        deleteAfterUpload: true,
      },
    })
  : configWithMDX;
