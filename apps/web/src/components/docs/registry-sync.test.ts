import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../../..");
const REGISTRY_SRC = resolve(ROOT, "packages/ui/registry");
const REGISTRY_JSON = resolve(ROOT, "apps/web/public/r");

const COMPONENTS = [
  "feedback-sweep-corner",
  "feedback-minimal-notch",
  "feedback-editorial-feed",
] as const;

describe("registry sync — JSON matches registry source", () => {
  for (const name of COMPONENTS) {
    it(`${name} JSON content matches registry source`, () => {
      const registrySource = readFileSync(
        resolve(REGISTRY_SRC, `${name}.tsx`),
        "utf-8"
      );
      const registryJson = JSON.parse(
        readFileSync(resolve(REGISTRY_JSON, `${name}.json`), "utf-8")
      );
      const jsonContent: string = registryJson.files[0].content;

      expect(jsonContent).toBe(registrySource);
    });
  }
});
