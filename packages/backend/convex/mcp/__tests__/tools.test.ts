import { describe, expect, test } from "vitest";
import { executeTool, getMcpToolDefinitions } from "../tools";

describe("getMcpToolDefinitions", () => {
  const definitions = getMcpToolDefinitions();

  test("returns non-empty array", () => {
    expect(definitions.length).toBeGreaterThan(0);
  });

  test("returns at least 30 tools", () => {
    expect(definitions.length).toBeGreaterThanOrEqual(30);
  });

  test("each definition has required fields", () => {
    for (const def of definitions) {
      expect(def.name).toBeTruthy();
      expect(typeof def.name).toBe("string");
      expect(typeof def.description).toBe("string");
      expect(def.inputSchema).toBeTruthy();
      expect(typeof def.inputSchema).toBe("object");
    }
  });

  test("each definition has inputSchema with type object", () => {
    for (const def of definitions) {
      expect(def.inputSchema).toHaveProperty("type", "object");
    }
  });

  test("no duplicate tool names", () => {
    const names = definitions.map((d) => d.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe("executeTool", () => {
  test("throws for unknown tool name", () => {
    const mockCtx = {} as never;
    const mockOrgId = "test-org" as never;
    expect(() =>
      executeTool("nonExistentTool", mockCtx, mockOrgId, {})
    ).toThrow("Unknown tool: nonExistentTool");
  });
});
