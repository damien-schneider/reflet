import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BoardViewToggle } from "./board-view-toggle";

function getButtonByText(text: string): HTMLButtonElement {
  const button = screen.getByText(text).closest("button");
  if (!button) {
    throw new Error(`Button containing "${text}" not found`);
  }
  return button;
}

describe("BoardViewToggle", () => {
  it("should mark roadmap tab as selected when view is roadmap", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const roadmapButton = getButtonByText("Board");
    expect(roadmapButton).toHaveAttribute("aria-selected", "true");

    const feedButton = getButtonByText("List");
    expect(feedButton).toHaveAttribute("aria-selected", "false");

    const milestonesButton = getButtonByText("Milestones");
    expect(milestonesButton).toHaveAttribute("aria-selected", "false");
  });

  it("should call onChange with roadmap when roadmap button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="feed" />);

    const roadmapButton = getButtonByText("Board");
    fireEvent.click(roadmapButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("roadmap");
  });

  it("should call onChange with feed when feed button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const feedButton = getButtonByText("List");
    fireEvent.click(feedButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("feed");
  });

  it("should call onChange with milestones when timeline button is clicked", () => {
    const onChange = vi.fn();
    render(<BoardViewToggle onChange={onChange} view="roadmap" />);

    const timelineButton = getButtonByText("Milestones");
    fireEvent.click(timelineButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("milestones");
  });
});
