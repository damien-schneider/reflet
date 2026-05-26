import { describe, expect, it } from "vitest";

import {
  ACTIVITY_ROLE_BADGE_STYLES,
  getActivityRoleLabel,
} from "./presentation";

describe("autopilot activity presentation", () => {
  it("returns the compact display label for an activity role", () => {
    expect(getActivityRoleLabel("ceo")).toBe("CEO");
    expect(getActivityRoleLabel("support")).toBe("Support");
  });

  it("exposes badge styles for coordination and validation role skills", () => {
    expect(getActivityRoleLabel("ceo")).toBe("CEO");
    expect(getActivityRoleLabel("validator")).toBe("Validator");
    expect(ACTIVITY_ROLE_BADGE_STYLES.ceo).toContain("border");
    expect(ACTIVITY_ROLE_BADGE_STYLES.validator).toContain("border");
  });
});
