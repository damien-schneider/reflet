import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TeamToolsSection } from "./team-tools-section";

const { revoke } = vi.hoisted(() => ({ revoke: vi.fn() }));
vi.mock("convex/react", () => ({
  useMutation: () => revoke,
  useQuery: () => [
    {
      _id: "team-token-1",
      createdAt: Date.UTC(2026, 9, 10, 12),
      expiresAt: Date.UTC(2026, 9, 17, 12),
      lastUsedAt: Date.UTC(2026, 9, 11, 12),
      organizationName: "Acme",
      origin: "https://app.acme.com",
    },
  ],
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("shows where and until when team tools are signed in, and revokes that app", () => {
  revoke.mockResolvedValue(null);
  render(<TeamToolsSection />);

  expect(screen.getByText("https://app.acme.com")).toBeTruthy();
  expect(screen.getByText(/Acme · Signed in/)).toBeTruthy();
  expect(screen.getByText("Oct 10, 2026")).toBeTruthy();
  expect(screen.getByText("Oct 17, 2026")).toBeTruthy();

  fireEvent.click(
    screen.getByRole("button", { name: "Revoke https://app.acme.com" })
  );
  expect(revoke).toHaveBeenCalledWith({ tokenId: "team-token-1" });
});
