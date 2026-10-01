import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";
import { AiAnalysisDisplay } from "./ai-analysis-display";

const update = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => update,
  useQuery: () => [],
}));
const feedbackId = toId("feedback", "feedback-id");
beforeEach(() => {
  update.mockReset();
  update.mockResolvedValue(null);
});

test("properties remain editable before any AI proposal exists", async () => {
  render(<AiAnalysisDisplay feedbackId={feedbackId} isAdmin />);
  fireEvent.click(
    screen.getByRole("button", { name: "Priority: Not set. No value" })
  );
  fireEvent.click(
    await screen.findByRole("button", { exact: true, name: "High" })
  );
  await waitFor(() =>
    expect(update).toHaveBeenCalledWith({ feedbackId, priority: "high" })
  );
});

test("a human-only value is labelled human and does not show an AI icon", () => {
  render(<AiAnalysisDisplay feedbackId={feedbackId} isAdmin priority="high" />);
  const trigger = screen.getByRole("button", {
    name: "Priority: High. Human decision",
  });
  expect(trigger.querySelector("svg")).toBeNull();
});

test("a human confirmation of the same AI proposal remains human-owned", () => {
  render(
    <AiAnalysisDisplay
      aiPriority="high"
      feedbackId={feedbackId}
      isAdmin
      priority="high"
    />
  );
  expect(
    screen
      .getByRole("button", { name: "Priority: High. Human decision" })
      .querySelector("svg")
  ).toBeNull();
});

test("clearing retains a human decision, while using the proposal explicitly resets it", async () => {
  render(
    <AiAnalysisDisplay
      aiPriority="critical"
      feedbackId={feedbackId}
      isAdmin
      priority={null}
    />
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Priority: Not set. Human decision" })
  );
  expect(await screen.findByText("AI proposal: Critical")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Use AI proposal" }));
  await waitFor(() =>
    expect(update).toHaveBeenCalledWith({ feedbackId, resetPriority: true })
  );
});

test("members can inspect effective values without edit actions", async () => {
  render(
    <AiAnalysisDisplay
      feedbackId={feedbackId}
      isAdmin={false}
      priority="medium"
    />
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Priority: Medium. Human decision" })
  );
  expect(await screen.findByText("Human decision: Medium")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Clear value" })
  ).not.toBeInTheDocument();
});

test("an unset clarification is explicitly unassessed", async () => {
  render(<AiAnalysisDisplay feedbackId={feedbackId} isAdmin />);
  fireEvent.click(screen.getByRole("button", { name: "Not assessed" }));
  expect(
    await screen.findByText("No assessment: Not assessed")
  ).toBeInTheDocument();
});
