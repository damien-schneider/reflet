import { describe, expect, it } from "vitest";

import {
  AUTOPILOT_PRO_REQUIRED_MESSAGE,
  getAutopilotErrorMessage,
} from "@/features/autopilot/lib/error-messages";

describe("getAutopilotErrorMessage", () => {
  it("maps raw Convex Pro access errors to upgrade copy", () => {
    const error = new Error(
      "[CONVEX M(autopilot/mutations/config:initConfig)] [Request ID: d6df389d1cac990d] Server Error Uncaught Error: Autopilot requires a Pro subscription. at requireAutopilotAccess"
    );

    expect(
      getAutopilotErrorMessage(error, {
        fallback: "Failed to initialize autopilot",
      })
    ).toBe(AUTOPILOT_PRO_REQUIRED_MESSAGE);
  });

  it("supports surface-specific Pro access copy", () => {
    const error = new Error(
      "[CONVEX M(autopilot/ceo_chat:sendMessage)] Server Error Uncaught Error: Autopilot requires a Pro subscription."
    );

    expect(
      getAutopilotErrorMessage(error, {
        fallback: "Failed to send message. Try again.",
        proAccessMessage:
          "CEO chat requires an active Autopilot Pro workspace.",
      })
    ).toBe("CEO chat requires an active Autopilot Pro workspace.");
  });

  it("keeps parsed Convex validation errors without server noise", () => {
    const error = new Error(
      "[CONVEX M(autopilot/mutations/config:updateConfig)] Server Error Uncaught Error: maxTasksPerDay must be at least 1\n    at handler"
    );

    expect(
      getAutopilotErrorMessage(error, {
        fallback: "Failed to update setting",
      })
    ).toBe("maxTasksPerDay must be at least 1");
  });

  it("uses fallback copy for unparseable Convex server errors", () => {
    const error = new Error(
      "[CONVEX M(autopilot/mutations/work:updateWorkItem)] Server Error"
    );

    expect(
      getAutopilotErrorMessage(error, {
        fallback: "Failed to update item",
      })
    ).toBe("Failed to update item");
  });

  it("uses normal Error messages when they are already user-safe", () => {
    expect(
      getAutopilotErrorMessage(new Error("Credentials required"), {
        fallback: "Failed to save credentials",
      })
    ).toBe("Credentials required");
  });
});
