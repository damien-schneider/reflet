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
  deps: { neverBundle: ["react", "react-dom", "@zumer/snapdom", "vite"] },
  dts: {
    resolve: ["@reflet/survey-core"],
    // tsgo emits only under the tsconfig's folder (passed as --rootDir), and the bundled survey-core sits beside the SDK, so this tsconfig lives in packages/.
    tsconfig: "../tsconfig.sdk-dts.json",
  },
  entry: {
    "devtools-next": "src/devtools/server/next.ts",
    "devtools-vite": "src/devtools/server/vite.ts",
    feedback: "src/feedback/entry.ts",
    index: "src/index.ts",
    react: "src/react.ts",
    server: "src/server.ts",
    surveys: "src/surveys/entry.ts",
  },
  format: ["esm"],
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  sourcemap: true,
  target: "es2022",
  treeshake: true,
});
