import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GitHubPermissionErrorAlert } from "./github-permission-error-alert";

const defaultProps = {
  onResync: vi.fn(),
};

describe("GitHubPermissionErrorAlert", () => {
  it("shows dismiss button when onDismiss provided", () => {
    render(
      <GitHubPermissionErrorAlert {...defaultProps} onDismiss={vi.fn()} />
    );
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("does not show dismiss button when onDismiss not provided", () => {
    render(<GitHubPermissionErrorAlert {...defaultProps} />);
    expect(screen.queryByText("Dismiss")).toBeNull();
  });
});
