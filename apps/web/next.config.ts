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
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://umami.damien-schneider.pro; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://umami.damien-schneider.pro; frame-src 'self'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
