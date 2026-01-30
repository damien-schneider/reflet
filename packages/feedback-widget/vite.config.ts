import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  "https://grateful-butterfly-1.convex.cloud";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "RefletFeedbackWidget",
      fileName: () => "feedback-widget.js",
      formats: ["iife"],
    },
    outDir: "dist",
    minify: "terser",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __CONVEX_URL__: JSON.stringify(CONVEX_URL),
  },
  plugins: [
    {
      name: "copy-to-web-public",
      closeBundle() {
        const src = resolve(__dirname, "dist/feedback-widget.js");
        const dest = resolve(
          __dirname,
          "../../apps/web/public/widget/reflet-feedback.v1.js"
        );
        try {
          cpSync(src, dest, { recursive: true });
          console.log(
            "✓ Feedback widget copied to apps/web/public/widget/reflet-feedback.v1.js"
          );
        } catch {
          console.warn("⚠ Could not copy feedback widget to web public folder");
        }
      },
    },
  ],
});
