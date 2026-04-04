import { describe, expect, it } from "vitest";

import { formatTickerEntry, getActivityAgentLabel } from "./presentation";

describe("autopilot activity presentation", () => {
  it("formats directed agent handoffs for the ticker", () => {
    expect(
      formatTickerEntry({
        agent: "orchestrator",
        message: "Launch PM analysis",
        targetAgent: "pm",
      })
    ).toBe("CEO -> PM: Launch PM analysis");
  });

  it("formats undirected activity updates for the ticker", () => {
    expect(
      formatTickerEntry({
        agent: "security",
        message: "Dependency audit queued",
      })
    ).toBe("Security: Dependency audit queued");
  });

  it("returns the compact display label for an activity agent", () => {
    expect(getActivityAgentLabel("orchestrator")).toBe("CEO");
    expect(getActivityAgentLabel("docs")).toBe("Docs");
  });
});
