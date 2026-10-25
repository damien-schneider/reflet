import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";

const WEB_APP_DIR = resolve(import.meta.dirname, "../../apps/web");

export default defineConfig(({ mode }) => {
  const { NEXT_PUBLIC_CONVEX_SITE_URL } = loadEnv(
    mode,
    WEB_APP_DIR,
    "NEXT_PUBLIC_"
  );
  if (!NEXT_PUBLIC_CONVEX_SITE_URL) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_SITE_URL is required to build the feedback widget: set it in the environment or apps/web/.env"
    );
  }

  return {
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
      __API_URL__: JSON.stringify(NEXT_PUBLIC_CONVEX_SITE_URL),
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    plugins: [
      {
        closeBundle() {
          const src = resolve(import.meta.dirname, "dist/feedback-widget.js");
          const dest = resolve(
            WEB_APP_DIR,
            "public/widget/reflet-feedback.v1.js"
          );
          cpSync(src, dest, { recursive: true });
          console.log(
            "✓ Feedback widget copied to apps/web/public/widget/reflet-feedback.v1.js"
          );
        },
        name: "copy-to-web-public",
      },
    ],
  };
});
