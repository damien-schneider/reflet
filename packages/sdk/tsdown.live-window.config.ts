import { defineConfig } from "tsdown";

export default defineConfig({
  clean: false,
  define: { "process.env.NODE_ENV": '"production"' },
  deps: { alwaysBundle: [/.*/] },
  dts: false,
  entry: { "live-window": "src/live/window/main.tsx" },
  format: ["esm"],
  minify: true,
  outDir: "dist/live-window",
  outExtensions: () => ({ js: ".js" }),
  outputOptions: { codeSplitting: false },
  platform: "browser",
  target: "es2022",
});
