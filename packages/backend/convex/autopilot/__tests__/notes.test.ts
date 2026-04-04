import { describe, expect, it } from "vitest";
import { AGENT_CATEGORY_MAP, validateNoteDomain } from "../notes";

describe("AGENT_CATEGORY_MAP", () => {
  it("maps every expected agent to a category", () => {
    expect(AGENT_CATEGORY_MAP.pm).toBe("product");
    expect(AGENT_CATEGORY_MAP.cto).toBe("engineering");
    expect(AGENT_CATEGORY_MAP.dev).toBe("engineering");
    expect(AGENT_CATEGORY_MAP.growth).toBe("market");
    expect(AGENT_CATEGORY_MAP.sales).toBe("prospect");
    expect(AGENT_CATEGORY_MAP.security).toBe("security");
    expect(AGENT_CATEGORY_MAP.architect).toBe("architecture");
    expect(AGENT_CATEGORY_MAP.support).toBe("support");
    expect(AGENT_CATEGORY_MAP.docs).toBe("documentation");
    expect(AGENT_CATEGORY_MAP.ceo).toBe("coordination");
    expect(AGENT_CATEGORY_MAP.system).toBe("coordination");
  });
});

describe("validateNoteDomain", () => {
  it("allows agents to write to their own domain", () => {
    expect(validateNoteDomain("pm", "product")).toBe(true);
    expect(validateNoteDomain("growth", "market")).toBe(true);
    expect(validateNoteDomain("sales", "prospect")).toBe(true);
    expect(validateNoteDomain("security", "security")).toBe(true);
    expect(validateNoteDomain("ceo", "coordination")).toBe(true);
  });

  it("rejects agents writing to other domains", () => {
    expect(validateNoteDomain("pm", "market")).toBe(false);
    expect(validateNoteDomain("growth", "product")).toBe(false);
    expect(validateNoteDomain("sales", "security")).toBe(false);
    expect(validateNoteDomain("security", "coordination")).toBe(false);
  });

  it("returns false for unknown agents", () => {
    expect(validateNoteDomain("unknown_agent", "product")).toBe(false);
  });
});
