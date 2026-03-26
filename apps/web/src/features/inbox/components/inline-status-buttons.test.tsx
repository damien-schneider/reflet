import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="status-group" {...props}>
      {children}
    </div>
  ),
  ToggleGroupItem: ({
    children,
    value,
    pressed,
    onPressedChange,
  }: {
    children: React.ReactNode;
    value: string;
    pressed?: boolean;
    onPressedChange?: (p: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      aria-pressed={pressed}
      data-testid={`status-${value}`}
      onClick={() => onPressedChange?.(!pressed)}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  Circle: () => <svg />,
  Clock: () => <svg />,
  CheckCircle: () => <svg />,
  XCircle: () => <svg />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { InlineStatusButtons } from "./inline-status-buttons";

afterEach(cleanup);

describe("InlineStatusButtons", () => {
  it("renders all four status buttons", () => {
    render(
      <InlineStatusButtons currentStatus="open" onStatusChange={vi.fn()} />
    );
    expect(screen.getByTestId("status-open")).toBeInTheDocument();
    expect(screen.getByTestId("status-awaiting_reply")).toBeInTheDocument();
    expect(screen.getByTestId("status-resolved")).toBeInTheDocument();
    expect(screen.getByTestId("status-closed")).toBeInTheDocument();
  });

  it("marks current status as pressed", () => {
    render(
      <InlineStatusButtons currentStatus="resolved" onStatusChange={vi.fn()} />
    );
    expect(
      screen.getByTestId("status-resolved").getAttribute("aria-pressed")
    ).toBe("true");
    expect(screen.getByTestId("status-open").getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("calls onStatusChange when a different status is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InlineStatusButtons currentStatus="open" onStatusChange={onChange} />
    );
    await user.click(screen.getByTestId("status-resolved"));
    expect(onChange).toHaveBeenCalledWith("resolved");
  });
});
