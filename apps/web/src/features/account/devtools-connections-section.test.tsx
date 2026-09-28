import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DevtoolsConnectionsSection } from "./devtools-connections-section";

const { revoke } = vi.hoisted(() => ({ revoke: vi.fn() }));
vi.mock("convex/react", () => ({
  useMutation: () => revoke,
  useQuery: () => [
    {
      _id: "token-1",
      label: "localhost:3000",
      lastUsedAt: 1_790_000_000_000,
      organizationName: "Acme",
    },
  ],
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("blocks duplicate revokes while pending and lets the member retry a failed revoke", async () => {
  let failRevoke = (_error: Error) => {};
  revoke.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        failRevoke = reject;
      })
  );
  render(<DevtoolsConnectionsSection />);
  const button = screen.getByRole("button", { name: "Revoke localhost:3000" });
  fireEvent.click(button);
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(revoke).toHaveBeenCalledTimes(1);
  await act(async () => failRevoke(new Error("Connection unavailable")));
  expect(screen.getByRole("alert")).toHaveTextContent("Connection unavailable");
  expect(button).toBeEnabled();
});
