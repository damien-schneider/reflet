import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonArray } from "../llm_json";

const MONITOR = z.object({ name: z.string(), url: z.string() });

describe("parseJsonArray", () => {
  it("keeps the valid rows and drops the malformed ones", () => {
    const text = `[
      {"name": "API", "url": "https://api.example.com"},
      {"name": "Broken"},
      {"name": 42, "url": "https://example.com"},
      {"name": "Web", "url": "https://example.com"}
    ]`;

    expect(parseJsonArray(text, MONITOR)).toEqual([
      { name: "API", url: "https://api.example.com" },
      { name: "Web", url: "https://example.com" },
    ]);
  });

  it("reads the array out of a markdown-fenced answer", () => {
    const text =
      'Sure!\n```json\n[{"name": "API", "url": "https://api.example.com"}]\n```';

    expect(parseJsonArray(text, MONITOR)).toEqual([
      { name: "API", url: "https://api.example.com" },
    ]);
  });

  it("returns nothing for prose, broken JSON or a bare object", () => {
    expect(
      parseJsonArray("I cannot determine any endpoints.", MONITOR)
    ).toEqual([]);
    expect(parseJsonArray('[{"name": "API",]', MONITOR)).toEqual([]);
    expect(parseJsonArray('{"name": "API", "url": "x"}', MONITOR)).toEqual([]);
  });
});
