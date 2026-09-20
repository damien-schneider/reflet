import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { FeedbackDialog } from "../react-feedback-dialog";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("renders a native dialog and locks page scroll while open", () => {
  render(<FeedbackDialog onOpenChange={vi.fn()} open={true} publicKey="pk" />);

  expect(screen.getByRole("dialog", { hidden: true }).tagName).toBe("DIALOG");
  expect(document.documentElement.style.overflow).toBe("hidden");
});

test("dismissing waits for the exit animation before closing", () => {
  vi.useFakeTimers();
  const onOpenChange = vi.fn();
  render(
    <FeedbackDialog onOpenChange={onOpenChange} open={true} publicKey="pk" />
  );

  fireEvent.click(screen.getByLabelText("Close"));
  expect(onOpenChange).not.toHaveBeenCalled();

  act(() => {
    vi.advanceTimersByTime(250);
  });
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
