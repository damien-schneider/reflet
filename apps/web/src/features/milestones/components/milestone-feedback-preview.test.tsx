import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <span data-testid="icon-caret-up" />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { MilestoneFeedbackPreview } from "./milestone-feedback-preview";

afterEach(cleanup);

const makeFeedbackItem = (
  overrides: Partial<{
    _id: string;
    title: string;
    voteCount: number;
    status: string;
  }> = {}
) => ({
  _id: overrides._id ?? "fb1",
  title: overrides.title ?? "Test feedback",
  voteCount: overrides.voteCount ?? 5,
  status: overrides.status ?? "open",
});

describe("MilestoneFeedbackPreview", () => {
  it("shows no linked feedback when items are empty", () => {
    render(<MilestoneFeedbackPreview items={[]} totalCount={0} />);
    expect(screen.getByText("No linked feedback")).toBeInTheDocument();
  });

  it("shows no linked feedback when all items are null", () => {
    render(<MilestoneFeedbackPreview items={[null, null]} totalCount={0} />);
    expect(screen.getByText("No linked feedback")).toBeInTheDocument();
  });

  it("renders feedback item title", () => {
    render(
      <MilestoneFeedbackPreview
        items={[makeFeedbackItem({ title: "My Feature" })]}
        totalCount={1}
      />
    );
    expect(screen.getByText("My Feature")).toBeInTheDocument();
  });

  it("renders vote count", () => {
    render(
      <MilestoneFeedbackPreview
        items={[makeFeedbackItem({ voteCount: 42 })]}
        totalCount={1}
      />
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("applies line-through for completed status", () => {
    render(
      <MilestoneFeedbackPreview
        items={[makeFeedbackItem({ status: "completed" })]}
        totalCount={1}
      />
    );
    const button = screen.getByRole("button");
    expect(button.className).toContain("line-through");
  });

  it("does not apply line-through for non-completed status", () => {
    render(
      <MilestoneFeedbackPreview
        items={[makeFeedbackItem({ status: "open" })]}
        totalCount={1}
      />
    );
    const button = screen.getByRole("button");
    expect(button.className).not.toContain("line-through");
  });

  it("shows overflow count when totalCount exceeds items", () => {
    render(
      <MilestoneFeedbackPreview items={[makeFeedbackItem()]} totalCount={5} />
    );
    expect(screen.getByText("+4 more")).toBeInTheDocument();
  });

  it("does not show overflow when totalCount equals items length", () => {
    render(
      <MilestoneFeedbackPreview items={[makeFeedbackItem()]} totalCount={1} />
    );
    expect(screen.queryByText(/more/)).toBeNull();
  });

  it("calls onFeedbackClick with id on click", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MilestoneFeedbackPreview
        items={[makeFeedbackItem({ _id: "fb99" })]}
        onFeedbackClick={onClick}
        totalCount={1}
      />
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith("fb99");
  });

  it("filters out null items", () => {
    render(
      <MilestoneFeedbackPreview
        items={[null, makeFeedbackItem({ title: "Valid" }), null]}
        totalCount={3}
      />
    );
    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MilestoneFeedbackPreview
        className="custom-class"
        items={[makeFeedbackItem()]}
        totalCount={1}
      />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
