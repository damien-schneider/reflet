import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const PRODUCTION_API_URL = "https://harmless-clam-802.convex.site";

const API_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || PRODUCTION_API_URL;

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      fileName: () => "feedback-widget.js",
      formats: ["iife"],
      name: "RefletFeedbackWidget",
    },
    outDir: "dist",
  },
  define: {
    __API_URL__: JSON.stringify(API_URL),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    {
      closeBundle() {
        const src = resolve(import.meta.dirname, "dist/feedback-widget.js");
        const dest = resolve(
          import.meta.dirname,
          "../../apps/web/public/widget/reflet-feedback.v1.js"
        );
        cpSync(src, dest, { recursive: true });
        console.log(
          "✓ Feedback widget copied to apps/web/public/widget/reflet-feedback.v1.js"
        );
      },
      name: "copy-to-web-public",
    },
  ],
});
