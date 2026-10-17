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
import type { TeamToolsAccount, TeamToolsBridge } from "./team-tools-bridge";

const mocks = vi.hoisted(() => ({
  createSessionApi: vi.fn(),
  finishTeamSignIn: vi.fn(),
  forgetTeamAccess: vi.fn(),
  hasTeamSignInReturn: vi.fn(),
  prepareTeamSignIn: vi.fn(),
  purgeAccount: vi.fn(),
  readTeamAccess: vi.fn(),
}));

vi.mock("./team-auth", () => ({
  finishTeamSignIn: mocks.finishTeamSignIn,
  forgetTeamAccess: mocks.forgetTeamAccess,
  hasTeamSignInReturn: mocks.hasTeamSignInReturn,
  prepareTeamSignIn: mocks.prepareTeamSignIn,
  readTeamAccess: mocks.readTeamAccess,
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
  mocks.finishTeamSignIn.mockReturnValue(null);
  mocks.hasTeamSignInReturn.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function signInButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>("button", {
    name: "Sign in with Reflet",
  });
}

function renderLayer() {
  return render(<TeamLayer connection={CONNECTION} position="bottom-right" />);
}

it("asks a signed-out member to sign in with Reflet", async () => {
  mocks.prepareTeamSignIn.mockReturnValue(new Promise(() => undefined));
  renderLayer();

  expect(
    screen.getByText(
      "Only members of the app's Reflet organization can sign in."
    )
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Reflet" }));

  expect(mocks.prepareTeamSignIn).toHaveBeenCalledWith(CONNECTION);
  expect(signInButton().disabled).toBe(true);
});

it("explains why sign-in could not start and lets the member try again", async () => {
  mocks.prepareTeamSignIn.mockRejectedValue(
    new Error("Your browser blocks storage for this site.")
  );
  renderLayer();

  fireEvent.click(screen.getByRole("button", { name: "Sign in with Reflet" }));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Your browser blocks storage for this site."
  );
  expect(signInButton().disabled).toBe(false);
});

it("finishes signing in when the member comes back from Reflet", async () => {
  mocks.hasTeamSignInReturn.mockReturnValue(true);
  mocks.finishTeamSignIn.mockReturnValue(Promise.resolve(ACCESS));
  renderLayer();

  expect(screen.getByText("Finishing sign-in…")).toBeTruthy();
  expect(await screen.findByRole("button", { name: "Sessions" })).toBeTruthy();
  expect(mocks.finishTeamSignIn).toHaveBeenCalledWith({
    apiUrl: CONNECTION.apiUrl,
    publicKey: CONNECTION.publicKey,
  });
});

it("says why a sign-in that came back from Reflet did not finish", async () => {
  mocks.hasTeamSignInReturn.mockReturnValue(true);
  mocks.finishTeamSignIn.mockReturnValue(
    Promise.reject(new Error("Sign-in was cancelled."))
  );
  renderLayer();

  expect(await screen.findByText("Sign-in was cancelled.")).toBeTruthy();
  expect(screen.queryByText("Finishing sign-in…")).toBeNull();
  expect(signInButton().disabled).toBe(false);
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
  expect(
    await screen.findByRole("heading", { level: 2, name: "Sessions" })
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Close Reflet team tools panel" })
  );

  await waitFor(() => expect(document.activeElement).toBe(sessionsButton));
});

it("signs out and removes this device's session data", async () => {
  mocks.readTeamAccess.mockReturnValue(ACCESS);
  renderLayer();

  fireEvent.click(await screen.findByRole("button", { name: "Sessions" }));
  fireEvent.click(await screen.findByRole("button", { name: "Ada, Acme" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

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

function fakeBridge(account: TeamToolsAccount | null) {
  return {
    account: vi.fn<TeamToolsBridge["account"]>().mockResolvedValue(account),
    request: vi.fn<TeamToolsBridge["request"]>(),
    signIn: vi.fn<TeamToolsBridge["signIn"]>(),
    signOut: vi.fn<TeamToolsBridge["signOut"]>().mockResolvedValue(undefined),
  };
}

it("signs a desktop app in through the system browser while the page stays", async () => {
  const bridge = fakeBridge(null);
  let approve: (account: TeamToolsAccount) => void = () => undefined;
  bridge.signIn.mockReturnValue(
    new Promise((resolve) => {
      approve = resolve;
    })
  );
  render(<TeamLayer bridge={bridge} position="bottom-right" />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Sign in with Reflet" })
  );

  expect(
    await screen.findByText("Finish signing in in your browser.")
  ).toBeTruthy();
  expect(signInButton().disabled).toBe(false);
  expect(mocks.prepareTeamSignIn).not.toHaveBeenCalled();
  approve({ organizationName: "Acme" });
  expect(await screen.findByRole("button", { name: "Sessions" })).toBeTruthy();
});

it("opens a signed-in desktop app's team tools at once and signs out through its bridge", async () => {
  const bridge = fakeBridge({ organizationName: "Acme" });
  render(<TeamLayer bridge={bridge} position="bottom-right" />);

  fireEvent.click(await screen.findByRole("button", { name: "Sessions" }));
  fireEvent.click(await screen.findByRole("button", { name: "Ada, Acme" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

  await waitFor(() => expect(bridge.signOut).toHaveBeenCalled());
  expect(mocks.forgetTeamAccess).not.toHaveBeenCalled();
  expect(
    await screen.findByRole("button", { name: "Sign in with Reflet" })
  ).toBeTruthy();
});

it("gives a desktop app the board through its bridge, and a browser only sessions", async () => {
  const bridge = fakeBridge({ organizationName: "Acme" });
  bridge.request.mockResolvedValue({
    body: JSON.stringify({
      hasMore: false,
      items: [
        {
          commentCount: 0,
          createdAt: 0,
          description: "",
          hasVoted: false,
          id: "feedback_1",
          isPinned: false,
          organizationStatus: null,
          status: "open",
          tags: [],
          title: "Export button is hidden",
          updatedAt: 0,
          voteCount: 0,
        },
      ],
      total: 1,
    }),
    status: 200,
  });
  const desktop = render(<TeamLayer bridge={bridge} position="bottom-right" />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Open the Reflet panel" })
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Board" }));

  expect(await screen.findByText("Export button is hidden")).toBeTruthy();
  expect(bridge.request).toHaveBeenCalledWith(
    expect.objectContaining({ method: "GET", path: "/api/v1/feedback/list" })
  );
  desktop.unmount();

  mocks.readTeamAccess.mockReturnValue(ACCESS);
  renderLayer();
  expect(await screen.findByRole("button", { name: "Sessions" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Open the Reflet panel" })
  ).toBeNull();
});

it("signs a desktop app out when Reflet refuses its board access", async () => {
  const bridge = fakeBridge({ organizationName: "Acme" });
  bridge.request.mockResolvedValue({
    body: JSON.stringify({ error: "Invalid API key" }),
    status: 401,
  });
  render(<TeamLayer bridge={bridge} position="bottom-right" />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Open the Reflet panel" })
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Board" }));

  expect(
    await screen.findByText(
      "Reflet no longer accepts this sign-in. Sign in again to record."
    )
  ).toBeTruthy();
  expect(signInButton()).toBeTruthy();
  expect(bridge.signOut).toHaveBeenCalled();
});
