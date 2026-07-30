import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  "https://grateful-butterfly-1.convex.cloud";

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
    __CONVEX_URL__: JSON.stringify(CONVEX_URL),
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
        try {
          cpSync(src, dest, { recursive: true });
          console.log(
            "✓ Changelog widget copied to apps/web/public/widget/reflet-changelog.v1.js"
          );
        } catch {
          console.warn(
            "⚠ Could not copy changelog widget to web public folder"
          );
        }
      },
      name: "copy-to-web-public",
    },
  ],
});
