import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
if (!CONVEX_SITE_URL) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_SITE_URL is required to build the changelog widget"
  );
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      fileName: () => "changelog-widget.js",
      formats: ["iife"],
      name: "RefletChangelogWidget",
    },
    outDir: "dist",
  },
  define: {
    __CONVEX_SITE_URL__: JSON.stringify(CONVEX_SITE_URL),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    {
      closeBundle() {
        const src = resolve(import.meta.dirname, "dist/changelog-widget.js");
        const dest = resolve(
          import.meta.dirname,
          "../../apps/web/public/widget/reflet-changelog.v1.js"
        );
        cpSync(src, dest, { recursive: true });
        console.log(
          "✓ Changelog widget copied to apps/web/public/widget/reflet-changelog.v1.js"
        );
      },
      name: "copy-to-web-public",
    },
  ],
});
