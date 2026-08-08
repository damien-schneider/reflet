import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";
import { SDK_VERSION } from "./src/feedback/types.ts";

const VERSION_FIELD = /"version":\s*"([^"]+)"/;
const published = VERSION_FIELD.exec(readFileSync("package.json", "utf8"))?.[1];

if (published !== SDK_VERSION) {
  throw new Error(
    `SDK_VERSION is ${SDK_VERSION} but package.json publishes ${published}. Every report would carry the wrong version.`
  );
}

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
