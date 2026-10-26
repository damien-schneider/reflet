// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { liveHubHarness, TEST_APP_ID, windowState } from "./hub-harness";

const storageHome = await mkdtemp(join(tmpdir(), "reflet-live-home-"));
vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  homedir: () => storageHome,
}));
afterAll(() => rm(storageHome, { force: true, recursive: true }));

const {
  appHeaders,
  call,
  openWindowStream,
  postWindowStates,
  reportPresence,
  selectOnlyConnection,
  startFakeBackend,
} = liveHubHarness(storageHome);

const frame = {
  devicePixelRatio: 2,
  scrollX: 0,
  scrollY: 0,
  title: "Export",
  url: "http://localhost:3000/export",
  viewportHeight: 800,
  viewportWidth: 1200,
};

const element = (label: string, role: string | null) => ({
  component: null,
  label,
  rect: { height: 20, width: 80, x: 10, y: 10 },
  role,
  selector: "button",
  source: null,
});

const click = (label: string) => ({
  atMs: 1000,
  element: element(label, "button"),
  frame,
  kind: "click",
  pointer: { x: 12, y: 12 },
});

const pick = (label: string) => ({
  atMs: 2000,
  element: element(label, "heading"),
  evidenceClientKey: null,
  frame,
  kind: "select",
  note: "this one",
});

const sendEvents = (events: unknown[], sessionId = "s1") =>
  call("/live/api/v1/sessions/events", {
    body: { events, sessionId },
    headers: appHeaders(),
    method: "POST",
  });

describe("Reflet Live window activity", () => {
  it("shows the element an app picked as the last capture of its batch", async () => {
    const backend = await startFakeBackend(() => ({}));
    const window = await openWindowStream();
    await postWindowStates([windowState("recording")]);
    await selectOnlyConnection();
    await sendEvents([click("Export"), pick("Last folder")]);
    expect(await window.next("capture")).toMatchObject({
      capture: {
        appId: TEST_APP_ID,
        element: { label: "Last folder", role: "heading" },
        kind: "pick",
      },
      kind: "capture",
    });
    window.close();
    await backend.close();
  });

  it("shows no capture for a batch the hub refuses or Reflet rejects", async () => {
    let isAccepting = false;
    const backend = await startFakeBackend(
      () => ({}),
      () => (isAccepting ? 200 : 422)
    );
    const window = await openWindowStream();
    await postWindowStates([windowState("recording")]);
    await selectOnlyConnection();
    expect((await sendEvents([pick("Refused")], "other")).status).toBe(409);
    expect((await sendEvents([pick("Rejected")])).status).toBe(422);
    isAccepting = true;
    await sendEvents([click("Accepted")]);
    expect(await window.next("capture")).toMatchObject({
      capture: { element: { label: "Accepted" }, kind: "click" },
    });
    window.close();
    await backend.close();
  });

  it("shows the page of the focused app, and no focus once it blurs", async () => {
    const window = await openWindowStream();
    await window.next("apps");
    await reportPresence({ path: "/export" });
    expect(await window.next("apps")).toMatchObject({
      focus: { appId: TEST_APP_ID, page: { path: "/export", title: "Home" } },
    });
    await reportPresence({ focused: false, path: "/export" });
    expect(await window.next("apps")).toMatchObject({ focus: null });
    window.close();
  });

  it("tells the window once the last passage has been transcribed", async () => {
    const startedAt = Date.now();
    const backend = await startFakeBackend((feedCalls) => ({
      entries: [
        {
          atMs: 0,
          endMs: 500,
          id: "p0",
          lines: ["export should remember the folder"],
          screenshotIds: [],
        },
      ],
      screenshots: [],
      session: { collection: "recording", id: "s1", startedAt },
      transcription:
        feedCalls === 1
          ? { oldestRunningMs: 1000, running: 1 }
          : { oldestRunningMs: null, running: 0 },
    }));
    const window = await openWindowStream();
    await window.next("feed");
    await selectOnlyConnection();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const transcribingAfter = async (ms: number) => {
      const update = window.next("feed");
      await vi.advanceTimersByTimeAsync(ms);
      const message = await update;
      return message.kind === "feed" ? message.transcribing : null;
    };
    try {
      await postWindowStates([windowState("recording")]);
      expect(await transcribingAfter(0)).toBe(1);
      expect(await transcribingAfter(2000)).toBe(0);
    } finally {
      vi.useRealTimers();
      window.close();
      await backend.close();
    }
  });
});
