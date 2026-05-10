import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkItemIdentifier } from "@/features/autopilot/components/tasks/work-item-identifier";

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: (message: string) => mockToastError(message),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkItemIdentifier", () => {
  it("renders the identifier text", () => {
    render(<WorkItemIdentifier identifier="REF-42" />);

    expect(screen.getByRole("button")).toHaveTextContent("REF-42");
  });

  it("renders a fallback when identifier is missing", () => {
    render(<WorkItemIdentifier identifier={null} />);

    expect(screen.getByLabelText("No identifier")).toHaveTextContent("—");
  });

  it("copies the identifier to clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<WorkItemIdentifier identifier="REF-7" />);
    fireEvent.click(screen.getByRole("button", { name: /Copy identifier/ }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("REF-7");
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Copied REF-7");
  });

  it("toasts an error when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<WorkItemIdentifier identifier="REF-9" />);
    fireEvent.click(screen.getByRole("button", { name: /Copy identifier/ }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to copy identifier");
    });
  });
});
