import { describe, expect, it } from "vitest";

import {
  createBudgetInputValues,
  formatBudgetCapsJson,
  parseBudgetCapsJson,
} from "@/features/autopilot/lib/budget-caps";

describe("autopilot budget caps", () => {
  it("parses only positive numeric caps from stored JSON", () => {
    expect(
      parseBudgetCapsJson(
        JSON.stringify({
          cto: 12.5,
          dev: 0,
          growth: -1,
          pm: "10",
          sales: 8,
        })
      )
    ).toEqual({ cto: 12.5, sales: 8 });
  });

  it("returns an empty cap map when stored JSON is invalid", () => {
    expect(parseBudgetCapsJson("{")).toEqual({});
    expect(parseBudgetCapsJson(undefined)).toEqual({});
  });

  it("formats editable values as a stable JSON cap map", () => {
    expect(
      formatBudgetCapsJson({
        cto: "3",
        dev: "",
        growth: "0",
        pm: "1.25",
        sales: "bad",
        support: "2",
      })
    ).toBe(JSON.stringify({ cto: 3, pm: 1.25, support: 2 }));
  });

  it("creates input values for every budgeted agent", () => {
    expect(createBudgetInputValues(JSON.stringify({ pm: 1 }))).toEqual({
      cto: "",
      dev: "",
      growth: "",
      pm: "1",
      sales: "",
      support: "",
    });
  });
});
