import { describe, expect, it } from "vitest";

import {
  ACTIVITY_AGENT_BADGE_STYLES,
  getActivityAgentLabel,
} from "./presentation";

describe("autopilot activity presentation", () => {
  it("returns the compact display label for an activity agent", () => {
    expect(getActivityAgentLabel("orchestrator")).toBe("CEO");
    expect(getActivityAgentLabel("support")).toBe("Support");
  });

  it("exposes badge styles for coordination and validation agents", () => {
    expect(getActivityAgentLabel("ceo")).toBe("CEO");
    expect(getActivityAgentLabel("validator")).toBe("Validator");
    expect(ACTIVITY_AGENT_BADGE_STYLES.ceo).toContain("border");
    expect(ACTIVITY_AGENT_BADGE_STYLES.validator).toContain("border");
  });
});
