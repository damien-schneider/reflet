import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/features/homepage/components/experience/features/feedback-preview",
  () => ({ FeedbackPreview: () => <p>Feedback preview</p> })
);

vi.mock(
  "@/features/homepage/components/experience/features/product-previews",
  () => ({
    PlanPreview: () => <p>Plan preview</p>,
    ReleasePreview: () => <p>Release preview</p>,
  })
);

import { FeatureExplorer } from "./feature-explorer";

describe("FeatureExplorer", () => {
  it("keeps every preview laid out and only the selected one interactive", async () => {
    const user = userEvent.setup();
    render(<FeatureExplorer>Intro</FeatureExplorer>);

    await user.click(screen.getByRole("tab", { name: "Plan with context" }));

    expect(
      screen.getByRole("tab", { name: "Plan with context" })
    ).toHaveAttribute("aria-selected", "true");
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(3);
    for (const panel of panels) {
      expect(panel).not.toHaveAttribute("hidden");
    }
    expect(
      screen.getByText("Plan preview").closest("[role=tabpanel]")
    ).not.toHaveAttribute("inert");
    expect(
      screen.getByText("Feedback preview").closest("[role=tabpanel]")
    ).toHaveAttribute("inert");
  });
});
