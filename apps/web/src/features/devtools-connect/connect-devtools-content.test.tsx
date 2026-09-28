import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConnectDevtoolsContent } from "./connect-devtools-content";

const { useQuery } = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ kind: "notMember" })),
}));
vi.mock("convex/react", () => ({ useAction: vi.fn(), useQuery }));
vi.mock("@/features/auth/components/unified-auth/unified-auth-form", () => ({
  default: () => null,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("rejects a remote redirect before asking the member to sign in or approve", () => {
  render(
    <ConnectDevtoolsContent
      codeChallenge={"c".repeat(43)}
      publicKey="fb_pub_test"
      redirectUri="https://evil.example/api/reflet-devtools/connect/callback"
      state={"s".repeat(43)}
    />
  );
  expect(
    screen.getByText(/Start again from the devtools Board tab/)
  ).toBeTruthy();
  expect(useQuery).not.toHaveBeenCalled();
});
