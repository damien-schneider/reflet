import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LabelPill } from "@/features/autopilot/components/labels/label-pill";

afterEach(() => {
  cleanup();
});

describe("LabelPill", () => {
  it("renders the label name and a colored dot derived from the preset", () => {
    render(<LabelPill color="blue" name="Frontend" />);

    expect(screen.getByText("Frontend")).toBeDefined();

    const dot = screen.getByTestId("label-pill-dot");
    expect(dot.className).toMatch(/bg-blue-500/);
  });

  it("falls back to the default preset for unknown colors", () => {
    render(<LabelPill color="not-a-color" name="Legacy" />);

    const dot = screen.getByTestId("label-pill-dot");
    expect(dot.className).toMatch(/bg-slate-500/);
  });

  it("does not render a remove button when onRemove is omitted", () => {
    render(<LabelPill color="green" name="Backend" />);

    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("renders a remove button when onRemove is provided and calls it on click", () => {
    const onRemove = vi.fn();
    render(<LabelPill color="red" name="Bug" onRemove={onRemove} />);

    const button = screen.getByRole("button", { name: /remove bug label/i });
    fireEvent.click(button);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("stops the click event from bubbling when removing", () => {
    const onRemove = vi.fn();
    const onParentClick = vi.fn();

    render(
      <button onClick={onParentClick} type="button">
        <LabelPill color="purple" name="Critical" onRemove={onRemove} />
      </button>
    );

    fireEvent.click(
      screen.getByRole("button", { name: /remove critical label/i })
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
