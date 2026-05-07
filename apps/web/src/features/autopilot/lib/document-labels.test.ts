import { describe, expect, it } from "vitest";

import {
  DOCUMENT_TYPE_OPTIONS,
  TYPE_COLOR_MAP,
  TYPE_LABELS,
} from "./document-labels";

const CHAIN_DOCUMENT_EXPECTATIONS = [
  {
    color: "blue",
    label: "Codebase Understanding",
    type: "codebase_understanding",
  },
  {
    color: "blue",
    label: "App Description",
    type: "app_description",
  },
  {
    color: "blue",
    label: "Target Definition",
    type: "target_definition",
  },
  {
    color: "blue",
    label: "Persona Brief",
    type: "persona_brief",
  },
] as const;

describe("autopilot document labels", () => {
  it("labels every chain document type", () => {
    for (const { color, label, type } of CHAIN_DOCUMENT_EXPECTATIONS) {
      expect(TYPE_LABELS[type]).toBe(label);
      expect(TYPE_COLOR_MAP[type]).toBe(color);
    }
  });

  it("keeps document type options synchronized with labels", () => {
    expect(DOCUMENT_TYPE_OPTIONS).toHaveLength(Object.keys(TYPE_LABELS).length);

    for (const option of DOCUMENT_TYPE_OPTIONS) {
      expect(option.label).toBe(TYPE_LABELS[option.value]);
    }
  });
});
