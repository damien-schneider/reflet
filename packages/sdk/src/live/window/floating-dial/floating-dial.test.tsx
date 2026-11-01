import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type FakeRecorder,
  fakeApi,
  fakeRecorder,
  RECORDING_SNAPSHOT,
} from "../../../sessions/ui/testing/session-fixtures";
import {
  LIVE_HUB_ENDPOINTS,
  type LiveApp,
  type LiveHubEntry,
} from "../../protocol";
import {
  ACME,
  type FakeHub,
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

const GLOBEX = {
  apiUrl: "https://api.reflet.test",
  id: "globex",
  organizationName: "Globex",
};

const PASSAGE: LiveHubEntry = {
  atMs: 4000,
  endMs: 6000,
  id: "p1",
  lines: ["[00:04] Make the export button bigger"],
  place: { app: ECHO, kind: "app", page: { path: "/export", title: null } },
  screenshotIds: [],
};

const LINEAR: LiveApp = {
  ...ECHO,
  id: "linear",
  label: "linear",
  origin: "http://localhost:3000",
};

const CLICK_DETAIL = 'clicked button "Assign" at 00:09 on /issues';

const SWITCH: LiveHubEntry = {
  atMs: 8000,
  endMs: 11_000,
  id: "p2",
  lines: ["[00:08] Assign it to me", `  - ${CLICK_DETAIL}`],
  place: {
    app: LINEAR,
    kind: "app",
    page: { path: "/issues", title: "Issues" },
  },
  screenshotIds: [],
};

const findTranscript = () =>
  screen.findByRole("region", { name: "Transcript" });

const revealedWords = (transcript: HTMLElement) =>
  Array.from(
    transcript.querySelectorAll("[data-reveal]"),
    (word) => word.textContent
  );

function withLayout(
  element: HTMLElement,
  layout: { clientHeight: number; scrollHeight: number }
) {
  let scrollTop = 0;
  Object.defineProperties(element, {
    clientHeight: { value: layout.clientHeight },
    scrollHeight: { value: layout.scrollHeight },
    scrollTop: {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    },
  });
  return element;
}

async function startRecording(hub: FakeHub) {
  setUserActivation(true);
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  mocks.recorder?.emit(RECORDING_SNAPSHOT);
  await screen.findByRole("button", { name: "Pause" });
  return hub;
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

describe("Reflet Live dial", () => {
  it("swaps Record for Stop and Pause while a session runs", async () => {
    await startRecording(await openWindow());

    expect(mocks.recorder?.start).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Record" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(mocks.recorder?.pause).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(mocks.recorder?.finish).toHaveBeenCalled());
  });

  it("records into the organization picked on the dial", async () => {
    const hub = await openWindow([ACME, GLOBEX]);

    fireEvent.click(screen.getByRole("button", { name: "Organization: Acme" }));
    fireEvent.click(await screen.findByRole("button", { name: "Globex" }));

    await waitFor(() =>
      expect(hub.postsTo(LIVE_HUB_ENDPOINTS.connection).at(-1)?.body).toEqual({
        id: "globex",
      })
    );
    expect(
      await screen.findByRole("button", { name: "Organization: Globex" })
    ).toBeTruthy();
  });

  it("covers the dial with a failed command until the user dismisses it", async () => {
    const recorder = fakeRecorder();
    vi.mocked(recorder.start).mockRejectedValueOnce(
      new Error("Microphone blocked.")
    );
    mocks.recorder = recorder;
    await openWindow();
    setUserActivation(true);

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "The recording did not start: Microphone blocked."
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Record" })).toBeTruthy();
  });

  it("shows the page the user is on, or that they left their apps", async () => {
    const hub = await startRecording(await openWindow());

    hub.send({
      apps: [ECHO],
      focus: { appId: "echo", page: { path: "/settings", title: "Settings" } },
      kind: "apps",
    });
    expect(await screen.findByText("echo · Settings (/settings)")).toBeTruthy();

    hub.send({ apps: [ECHO], focus: null, kind: "apps" });
    expect(await screen.findByText("outside your apps")).toBeTruthy();
  });

  it("shows what the user just pointed at, then lets it fade", async () => {
    const hub = await startRecording(await openWindow());

    hub.send({
      capture: {
        appId: "echo",
        at: Date.now() - 5700,
        element: { label: "Export", role: "button" },
        kind: "pick",
      },
      kind: "capture",
    });

    const chip = await screen.findByText("Pointed at button “Export”");
    await waitForElementToBeRemoved(chip);
  });

  it("shows a passage is being transcribed until its words arrive", async () => {
    const hub = await startRecording(await openWindow());

    hub.send({ entries: [], kind: "feed", transcribing: 1 });
    expect(await screen.findByText("Transcribing")).toBeTruthy();

    hub.send({ entries: [PASSAGE], kind: "feed", transcribing: 0 });
    expect((await findTranscript()).textContent).toBe(
      "[00:04] Make the export button bigger"
    );
    await waitFor(() => expect(screen.queryByText("Transcribing")).toBeNull());
  });

  it("reveals the words of a new passage, then only the words a refinement changed", async () => {
    const hub = await startRecording(await openWindow());

    hub.send({ entries: [PASSAGE], kind: "feed", transcribing: 0 });
    const transcript = await findTranscript();
    expect(revealedWords(transcript)).toEqual([
      "[00:04]",
      "Make",
      "the",
      "export",
      "button",
      "bigger",
    ]);

    hub.send({
      entries: [
        {
          ...PASSAGE,
          lines: ["[00:04] Make the export button bigger, please"],
        },
      ],
      kind: "feed",
      transcribing: 0,
    });
    await waitFor(() =>
      expect(revealedWords(transcript)).toEqual(["bigger,", "please"])
    );
  });

  it("keeps the transcript at its newest passage unless the user scrolled up", async () => {
    const hub = await startRecording(await openWindow());
    hub.send({ entries: [PASSAGE], kind: "feed", transcribing: 0 });
    const viewport = withLayout(await findTranscript(), {
      clientHeight: 60,
      scrollHeight: 200,
    });

    hub.send({ entries: [PASSAGE, SWITCH], kind: "feed", transcribing: 0 });
    await waitFor(() => expect(viewport.scrollTop).toBe(200));

    viewport.scrollTop = 40;
    fireEvent.scroll(viewport);
    hub.send({
      entries: [PASSAGE, SWITCH, { ...SWITCH, id: "p3" }],
      kind: "feed",
      transcribing: 1,
    });
    await screen.findByText("Transcribing");
    expect(viewport.scrollTop).toBe(40);
  });

  it("expands the transcript into where each passage was said and what was done there", async () => {
    const hub = await startRecording(await openWindow());
    hub.send({ entries: [PASSAGE, SWITCH], kind: "feed", transcribing: 0 });
    const toggle = await screen.findByRole("button", {
      name: "Full transcript",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(CLICK_DETAIL)).toBeNull();

    fireEvent.click(await findTranscript());

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("echo · /export")).toBeTruthy();
    expect(screen.getByText(CLICK_DETAIL)).toBeTruthy();
    expect(screen.getByText("linear · Issues (/issues)")).toBeTruthy();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(CLICK_DETAIL)).toBeNull();
  });
});
