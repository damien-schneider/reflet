import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LabelsList,
  type LabelWithUsage,
} from "@/features/autopilot/components/labels/labels-list";

const labelId = (id: string) => id as Id<"workItemLabels">;
const orgId = (id: string) => id as Id<"organizations">;

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        labels: {
          updateLabel: "autopilot.mutations.labels.updateLabel",
          deleteLabel: "autopilot.mutations.labels.deleteLabel",
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

const buildLabel = (overrides: {
  _id: string;
  name: string;
  usageCount?: number;
  parentLabelId?: string;
}): LabelWithUsage => ({
  _id: labelId(overrides._id),
  _creationTime: 1,
  organizationId: orgId("org_1"),
  name: overrides.name,
  color: "slate",
  createdAt: 1,
  updatedAt: 1,
  parentLabelId: overrides.parentLabelId
    ? labelId(overrides.parentLabelId)
    : undefined,
  usageCount: overrides.usageCount ?? 0,
});

describe("LabelsList", () => {
  it("renders an empty state when no labels exist", () => {
    render(<LabelsList labels={[]} />);
    expect(screen.getByText(/no labels yet/i)).toBeDefined();
  });

  it("renders each label with its usage count and edit/delete controls", () => {
    const labels: LabelWithUsage[] = [
      buildLabel({ _id: "lbl_a", name: "Frontend", usageCount: 5 }),
      buildLabel({ _id: "lbl_b", name: "Backend", usageCount: 1 }),
      buildLabel({ _id: "lbl_c", name: "Infra", usageCount: 0 }),
    ];

    render(<LabelsList labels={labels} />);

    const rows = screen.getAllByTestId("label-row");
    expect(rows).toHaveLength(3);

    expect(screen.getByText("Frontend")).toBeDefined();
    expect(screen.getByText("5 tasks")).toBeDefined();
    expect(screen.getByText("1 task")).toBeDefined();
    expect(screen.getByText("0 tasks")).toBeDefined();

    expect(
      screen.getByRole("button", { name: /edit frontend/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /delete frontend/i })
    ).toBeDefined();
  });

  it("groups child labels under their parent in alphabetical order", () => {
    const labels: LabelWithUsage[] = [
      buildLabel({ _id: "lbl_parent", name: "Area", usageCount: 0 }),
      buildLabel({
        _id: "lbl_child_b",
        name: "Mobile",
        parentLabelId: "lbl_parent",
        usageCount: 2,
      }),
      buildLabel({
        _id: "lbl_child_a",
        name: "Desktop",
        parentLabelId: "lbl_parent",
        usageCount: 4,
      }),
      buildLabel({ _id: "lbl_solo", name: "Zeta", usageCount: 0 }),
    ];

    render(<LabelsList labels={labels} />);

    const rows = screen.getAllByTestId("label-row");
    // Expect order: Area (parent), Desktop (child), Mobile (child), Zeta (top-level)
    expect(within(rows[0]).getByText("Area")).toBeDefined();
    expect(within(rows[1]).getByText("Desktop")).toBeDefined();
    expect(within(rows[2]).getByText("Mobile")).toBeDefined();
    expect(within(rows[3]).getByText("Zeta")).toBeDefined();
  });
});
