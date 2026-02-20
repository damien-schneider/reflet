import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../../..");
const REGISTRY_SRC = resolve(ROOT, "packages/ui/registry");
const REGISTRY_JSON = resolve(ROOT, "apps/web/public/r");
const APP_UI = resolve(ROOT, "apps/web/src/components/ui");

const COMPONENTS = [
  "feedback-sweep-corner",
  "feedback-minimal-notch",
  "feedback-editorial-feed",
] as const;

describe("registry sync — installed component matches doc preview", () => {
  for (const name of COMPONENTS) {
    describe(name, () => {
      const registrySource = readFileSync(
        resolve(REGISTRY_SRC, `${name}.tsx`),
        "utf-8"
      );
      const appUiSource = readFileSync(resolve(APP_UI, `${name}.tsx`), "utf-8");
      const registryJson = JSON.parse(
        readFileSync(resolve(REGISTRY_JSON, `${name}.json`), "utf-8")
      );
      const jsonContent: string = registryJson.files[0].content;

      it("registry source matches app/web UI copy", () => {
        expect(appUiSource).toBe(registrySource);
      });

      it("registry JSON content matches registry source", () => {
        expect(jsonContent).toBe(registrySource);
      });
    });
  }
});
