import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionApiError } from "../api/session-api";
import { fakeApi, fakeRecorder } from "../ui/testing/session-fixtures";
import { TeamLayer } from "./team-layer";

const mocks = vi.hoisted(() => ({
  createSessionApi: vi.fn(),
  forgetTeamAccess: vi.fn(),
  purgeAccount: vi.fn(),
  readTeamAccess: vi.fn(),
  signInTeam: vi.fn(),
}));

vi.mock("./team-auth", () => ({
  forgetTeamAccess: mocks.forgetTeamAccess,
  readTeamAccess: mocks.readTeamAccess,
  signInTeam: mocks.signInTeam,
}));

vi.mock("../api/session-api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createSessionApi: mocks.createSessionApi,
}));

vi.mock("../recorder/session-recorder", () => ({
  createSessionRecorder: () => fakeRecorder(),
}));

vi.mock("../local/local-sessions", () => ({
  discardLocalDraft: vi.fn(),
  purgeAccount: mocks.purgeAccount,
  useLocalDrafts: () => [],
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  }),
}));

const ACCESS = {
  expiresAt: Date.now() + 86_400_000,
  organizationName: "Acme",
  token: "fb_team_secret",
};

const CONNECTION = {
  apiUrl: "https://api.reflet.test",
  appUrl: "https://app.reflet.test",
  publicKey: "fb_pub_1",
};

beforeEach(() => {
  mocks.createSessionApi.mockReturnValue(fakeApi());
  mocks.forgetTeamAccess.mockResolvedValue(undefined);
  mocks.purgeAccount.mockResolvedValue(undefined);
  mocks.readTeamAccess.mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderLayer() {
  return render(<TeamLayer connection={CONNECTION} position="bottom-right" />);
}

it("asks a signed-out member to sign in with Reflet", async () => {
  mocks.signInTeam.mockResolvedValue(ACCESS);
  renderLayer();

  expect(
    screen.getByText(
      "Only members of the app's Reflet organization can sign in."
    )
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Reflet" }));

  expect(mocks.signInTeam).toHaveBeenCalledWith(CONNECTION);
  expect(await screen.findByRole("button", { name: "Sessions" })).toBeTruthy();
});

it("shows why signing in failed", async () => {
  mocks.signInTeam.mockRejectedValue(new Error("Sign-in was cancelled."));
  renderLayer();

  fireEvent.click(screen.getByRole("button", { name: "Sign in with Reflet" }));

  expect(await screen.findByText("Sign-in was cancelled.")).toBeTruthy();
});

it("hides the card for this visit", () => {
  renderLayer();

  fireEvent.click(screen.getByRole("button", { name: "Hide" }));

  expect(
    screen.queryByRole("button", { name: "Sign in with Reflet" })
  ).toBeNull();
});

it("returns focus to the Sessions button when the panel closes", async () => {
  mocks.readTeamAccess.mockReturnValue(ACCESS);
  renderLayer();

  const sessionsButton = await screen.findByRole("button", {
    name: "Sessions",
  });
  sessionsButton.focus();
  fireEvent.click(sessionsButton);
  expect(await screen.findByText("Recording as Ada · Acme")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Close Reflet team tools panel" })
  );

  expect(document.activeElement).toBe(sessionsButton);
});

it("signs out and removes this device's session data", async () => {
  mocks.readTeamAccess.mockReturnValue(ACCESS);
  renderLayer();

  fireEvent.click(
    await screen.findByRole("button", { name: "Signed in as Ada · Acme" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await waitFor(() =>
    expect(mocks.forgetTeamAccess).toHaveBeenCalledWith({
      apiUrl: CONNECTION.apiUrl,
      publicKey: CONNECTION.publicKey,
    })
  );
  expect(mocks.purgeAccount).toHaveBeenCalledWith("org_1:user_1");
  expect(
    await screen.findByRole("button", { name: "Sign in with Reflet" })
  ).toBeTruthy();
});

it("signs out when Reflet refuses the stored sign-in", async () => {
  mocks.readTeamAccess.mockReturnValue(ACCESS);
  mocks.createSessionApi.mockReturnValue(
    fakeApi({
      identity: vi
        .fn()
        .mockRejectedValue(
          new SessionApiError("Unauthorized", { limit: null, status: 401 })
        ),
    })
  );
  renderLayer();

  expect(
    await screen.findByText(
      "Reflet no longer accepts this sign-in. Sign in again to record."
    )
  ).toBeTruthy();
  expect(mocks.forgetTeamAccess).toHaveBeenCalled();
});
