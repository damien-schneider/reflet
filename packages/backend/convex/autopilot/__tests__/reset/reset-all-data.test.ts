/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api } from "../../../_generated/api";
import { createTestContext } from "../test-fixtures.helpers";

describe("autopilot reset all data", () => {
  test("publishes the reset scope used by the confirmation dialog", async () => {
    const t = createTestContext();

    const scope = await t.query(
      api.autopilot.reset.mutations.getResetScope,
      {}
    );

    expect(scope.map((group) => group.title)).toEqual([
      "Work and review history",
      "Generated artifacts",
      "Market and customer intelligence",
      "Automation settings",
      "Project context",
    ]);
    expect(scope.flatMap((group) => group.items)).toEqual(
      expect.arrayContaining([
        "Work items",
        "Activity logs",
        "Execution records",
        "Knowledge versions",
        "Autopilot configuration",
      ])
    );
  });
});
