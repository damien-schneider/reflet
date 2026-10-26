import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type FakeRecorder,
  fakeApi,
  fakeRecorder,
  RECORDING_SNAPSHOT,
} from "../../../sessions/ui/testing/session-fixtures";
import type { LiveApp, LiveHubEntry } from "../../protocol";
import {
  type FakeHub,
  fakePictureInPicture,
  openWindow,
  setUserActivation,
  stubMatchMedia,
} from "../testing/live-window-harness";

const mocks = vi.hoisted(() => {
  const hoisted: { recorder: FakeRecorder | null } = { recorder: null };
  return hoisted;
});

vi.mock("../../../sessions/recorder/session-recorder", () => ({
  createSessionRecorder: () => mocks.recorder,
}));

vi.mock("../../../sessions/api/session-api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createSessionApi: () => fakeApi(),
}));

vi.mock("../../../sessions/local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  }),
}));

const ECHO: LiveApp = {
  id: "echo",
  label: "echo",
  origin: "http://localhost:1425",
  repoRoot: "/code/echo",
  root: "/code/echo",
};

const PASSAGE: LiveHubEntry = {
  atMs: 4000,
  endMs: 6000,
  id: "p1",
  lines: ["[00:04] Make the export button bigger"],
  place: { app: ECHO, kind: "app", page: { path: "/export", title: null } },
  screenshotIds: [],
};

async function recordIntoFloatingBar(hub: FakeHub) {
  const pip = fakePictureInPicture();
  setUserActivation(true);
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  mocks.recorder?.emit(RECORDING_SNAPSHOT);
  const bar = within(pip.document.body);
  await bar.findByRole("button", { name: "Pause" });
  return { bar, hub, pip };
}

beforeEach(() => {
  mocks.recorder = fakeRecorder();
  setUserActivation(false);
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Reflet Live floating bar", () => {
  it("takes over the recording controls when Record is clicked", async () => {
    const { bar, pip } = await recordIntoFloatingBar(await openWindow());

    expect(mocks.recorder?.start).toHaveBeenCalled();
    expect(pip.requestWindow).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(
      screen.getByText("The recording controls are in the floating bar.")
    ).toBeTruthy();

    fireEvent.click(bar.getByRole("button", { name: "Pause" }));
    expect(mocks.recorder?.pause).toHaveBeenCalled();
  });

  it("gives the controls back to the window once it closes", async () => {
    const { pip } = await recordIntoFloatingBar(await openWindow());

    pip.floating.close();

    expect(await screen.findByRole("button", { name: "Pause" })).toBeTruthy();
    expect(
      screen.queryByText("The recording controls are in the floating bar.")
    ).toBeNull();
  });

  it("shows the page the user is on, or that they left their apps", async () => {
    const { bar, hub } = await recordIntoFloatingBar(await openWindow());

    hub.send({
      apps: [ECHO],
      focus: { appId: "echo", page: { path: "/settings", title: "Settings" } },
      kind: "apps",
    });
    expect(await bar.findByText("echo · Settings (/settings)")).toBeTruthy();

    hub.send({ apps: [ECHO], focus: null, kind: "apps" });
    expect(await bar.findByText("outside your apps")).toBeTruthy();
  });

  it("shows what the user just pointed at, then lets it fade", async () => {
    const { bar, hub } = await recordIntoFloatingBar(await openWindow());

    hub.send({
      capture: {
        appId: "echo",
        at: Date.now() - 5700,
        element: { label: "Export", role: "button" },
        kind: "pick",
      },
      kind: "capture",
    });

    const chip = await bar.findByText("Pointed at button “Export”");
    await waitForElementToBeRemoved(chip);
  });

  it("shows a passage is being transcribed until its words arrive", async () => {
    const { bar, hub } = await recordIntoFloatingBar(await openWindow());

    hub.send({ entries: [], kind: "feed", transcribing: 1 });
    expect(await bar.findByText("Transcribing")).toBeTruthy();

    hub.send({ entries: [PASSAGE], kind: "feed", transcribing: 0 });
    expect(
      await bar.findByText("[00:04] Make the export button bigger")
    ).toBeTruthy();
    await waitFor(() => expect(bar.queryByText("Transcribing")).toBeNull());
  });
});
