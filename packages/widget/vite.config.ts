import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required to build the widget");
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      fileName: () => "widget.js",
      formats: ["iife"],
      name: "RefletWidget",
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
        const src = resolve(import.meta.dirname, "dist/widget.js");
        const dest = resolve(
          import.meta.dirname,
          "../../apps/web/public/widget/reflet-widget.v1.js"
        );
        cpSync(src, dest, { recursive: true });
        console.log(
          "✓ Widget copied to apps/web/public/widget/reflet-widget.v1.js"
        );
      },
      name: "copy-to-web-public",
    },
  ],
});
