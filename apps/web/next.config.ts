import type { NextConfig } from "next";

// Import env to validate at build time
import "@reflet-v2/env/web";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@reflet-v2/backend", "@reflet-v2/env"],
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
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;

    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com ${umamiUrl || ""};
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self' data:;
      connect-src 'self' ${convexUrl || ""} ${convexSiteUrl || ""} https://auth.convex.dev ${umamiUrl || ""};
    `
      .replace(/\s{2,}/g, " ")
      .trim();

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
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

export default nextConfig;
