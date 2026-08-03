import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: { neverBundle: ["react", "react-dom", "@zumer/snapdom"] },
  dts: true,
  entry: {
    feedback: "src/feedback/entry.ts",
    index: "src/index.ts",
    react: "src/react.ts",
    server: "src/server.ts",
  },
  format: ["esm"],
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  sourcemap: true,
  target: "es2022",
  treeshake: true,
});
