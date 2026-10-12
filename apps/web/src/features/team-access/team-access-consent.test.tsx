import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TeamAccessConsent } from "./team-access-consent";

const APP_ORIGIN = "https://app.acme.com";
const STATE = "s".repeat(43);
const READY_TARGET = {
  isMember: true,
  organizationName: "Acme",
  origin: APP_ORIGIN,
  originProblem: null,
};

const { approve, useQuery } = vi.hoisted(() => ({
  approve: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useAction: () => approve,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery,
}));
vi.mock("@/features/auth/components/unified-auth/unified-auth-form", () => ({
  default: () => null,
}));

const opener = { closed: false, postMessage: vi.fn() };

beforeEach(() => {
  useQuery.mockReturnValue(READY_TARGET);
  Object.defineProperty(window, "opener", {
    configurable: true,
    value: opener,
  });
  vi.spyOn(window, "close").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function renderConsent(overrides: { code_challenge?: string } = {}) {
  render(
    <TeamAccessConsent
      searchParams={{
        code_challenge: "c".repeat(43),
        origin: APP_ORIGIN,
        public_key: "fb_pub_test",
        state: STATE,
        ...overrides,
      }}
    />
  );
}

it("rejects a malformed link before looking anything up", () => {
  renderConsent({ code_challenge: "short" });
  expect(screen.getByText(/Start again from your app/)).toBeTruthy();
  expect(useQuery).not.toHaveBeenCalled();
});

it("explains how to enable team tools when the key has no allowed domains", () => {
  useQuery.mockReturnValue({
    ...READY_TARGET,
    originProblem: "no_allowed_domains",
  });
  renderConsent();
  expect(
    screen.getByText(
      "Add this app's domain in Reflet → API keys to enable team tools."
    )
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
});

it("sends the code only to the origin the server validated, then closes", async () => {
  approve.mockResolvedValue({ code: "one-time-code" });
  renderConsent();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
  });

  expect(approve).toHaveBeenCalledWith({
    codeChallenge: "c".repeat(43),
    origin: APP_ORIGIN,
    publicKey: "fb_pub_test",
  });
  expect(opener.postMessage).toHaveBeenCalledWith(
    { code: "one-time-code", state: STATE, type: "reflet:team-access" },
    APP_ORIGIN
  );
  expect(screen.getByText(/signed in on app\.acme\.com/)).toBeTruthy();
  expect(window.close).toHaveBeenCalled();
});

it("tells the app the member cancelled", () => {
  renderConsent();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(opener.postMessage).toHaveBeenCalledWith(
    { error: "cancelled", state: STATE, type: "reflet:team-access" },
    APP_ORIGIN
  );
  expect(approve).not.toHaveBeenCalled();
});

it("explains that the page must be opened from the app when there is no opener", () => {
  Object.defineProperty(window, "opener", { configurable: true, value: null });
  renderConsent();
  expect(screen.getByText(/Sign in with Reflet/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
});

it("keeps the member on the consent with the reason when approval fails", async () => {
  approve.mockRejectedValue(new Error("You're not a member"));
  renderConsent();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
  });

  expect(screen.getByRole("alert")).toHaveTextContent("You're not a member");
  expect(screen.getByRole("button", { name: "Allow" })).toBeEnabled();
  expect(opener.postMessage).not.toHaveBeenCalled();
});
