import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../../../..");
const REGISTRY_SRC = resolve(ROOT, "packages/ui/registry");
const REGISTRY_JSON = resolve(ROOT, "apps/web/public/r");

const COMPONENTS = readdirSync(REGISTRY_SRC)
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => file.replace(/\.tsx$/, ""))
  .sort();

function readRegistryItem(name: string) {
  return JSON.parse(
    readFileSync(resolve(REGISTRY_JSON, `${name}.json`), "utf-8")
  );
}

describe("registry sync", () => {
  it("publishes every registry source file", () => {
    const published = readdirSync(REGISTRY_JSON)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
      .sort();

    expect(published).toEqual(COMPONENTS);
  });

  for (const name of COMPONENTS) {
    it(`${name} JSON content matches registry source`, () => {
      const registrySource = readFileSync(
        resolve(REGISTRY_SRC, `${name}.tsx`),
        "utf-8"
      );
      const jsonContent: string = readRegistryItem(name).files[0].content;

      expect(jsonContent).toBe(registrySource);
    });

    it(`${name} ships tag tokens plus the @theme mappings that generate their utilities`, () => {
      const { cssVars } = readRegistryItem(name);
      const tokenNames = Object.keys(cssVars.light).sort();

      expect(tokenNames.length).toBeGreaterThan(0);
      expect(Object.keys(cssVars.dark).sort()).toEqual(tokenNames);
      expect(Object.keys(cssVars.theme).sort()).toEqual(
        tokenNames.map((token) => `color-${token}`).sort()
      );

      for (const token of tokenNames) {
        expect(cssVars.theme[`color-${token}`]).toBe(`var(--${token})`);
      }
    });
  }
});
