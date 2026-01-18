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
};

export default nextConfig;
