import { describe, expect, test } from "vitest";
import { parseGitHubCheckRuns } from "../adapters/adapter_helpers";

const terminalFailureConclusions = [
  "action_required",
  "cancelled",
  "failure",
  "startup_failure",
  "stale",
  "timed_out",
] as const;

describe("autopilot adapter CI parsing", () => {
  test("treats repositories without check runs as passing CI", () => {
    expect(parseGitHubCheckRuns([])).toEqual({ ciStatus: "passed" });
  });

  for (const conclusion of terminalFailureConclusions) {
    test(`treats ${conclusion} check conclusions as failed CI`, () => {
      expect(
        parseGitHubCheckRuns([
          {
            conclusion,
            output: { summary: `${conclusion} summary` },
            status: "completed",
          },
        ])
      ).toEqual({
        ciFailureLog: `${conclusion} summary`,
        ciStatus: "failed",
      });
    });
  }
});
