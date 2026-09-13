import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_API_URL,
  readStoredConfig,
  resolveApiKey,
  resolveApiUrl,
  writeStoredConfig,
} from "../config";

describe("config", () => {
  it("prefers the environment over the stored key", () => {
    expect(resolveApiKey({ REFLET_API_KEY: "env" }, { apiKey: "file" })).toBe(
      "env"
    );
    expect(resolveApiKey({}, { apiKey: "file" })).toBe("file");
  });

  it("hints at reflet login when nothing is configured", () => {
    expect(() => resolveApiKey({}, {})).toThrow("reflet login");
  });

  it("falls back to the production URL", () => {
    expect(resolveApiUrl({}, {})).toBe(DEFAULT_API_URL);
    expect(resolveApiUrl({}, { apiUrl: "https://a" })).toBe("https://a");
    expect(
      resolveApiUrl({ REFLET_API_URL: "https://b" }, { apiUrl: "https://a" })
    ).toBe("https://b");
  });

  it("writes the config owner-only and reads it back", () => {
    const path = join(
      mkdtempSync(join(tmpdir(), "reflet-")),
      "nested",
      "config.json"
    );

    writeStoredConfig({ apiKey: "fb_sec_x" }, path);

    expect((statSync(path).mode % 0o1000).toString(8)).toBe("600");
    expect(readStoredConfig(path)).toEqual({
      apiKey: "fb_sec_x",
      apiUrl: undefined,
    });
    expect(readFileSync(path, "utf8")).toContain("fb_sec_x");
  });

  it("treats a corrupt file as empty", () => {
    expect(readStoredConfig("/nonexistent/config.json")).toEqual({});
  });
});
