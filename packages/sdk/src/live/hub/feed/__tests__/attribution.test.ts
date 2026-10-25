// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { LiveApp, LiveFrame } from "../../../protocol";
import { type FocusTransition, placeOf } from "../attribution";
import { PresenceTimeline } from "../presence-timeline";

const app = (label: string): LiveApp => ({
  id: `http://localhost|/code/${label}`,
  label,
  origin: "http://localhost",
  repoRoot: `/code/${label}`,
  root: `/code/${label}`,
});
const web = app("web");
const desktop = app("desktop");
const page = (path: string): LiveFrame => ({ path, title: path.slice(1) });
const focus = (
  atMs: number,
  focused: LiveApp | null,
  path = "/"
): FocusTransition => ({
  app: focused,
  atMs,
  frame: focused ? page(path) : null,
});

describe("placing a passage in the app it is about", () => {
  it("picks the app focused for most of the passage", () => {
    const timeline = [focus(0, web), focus(3000, desktop)];
    expect(placeOf({ atMs: 2000, endMs: 8000 }, timeline)).toMatchObject({
      app: desktop,
      kind: "app",
    });
  });

  it("breaks an even split in favour of the app focused when the passage ends", () => {
    const timeline = [focus(0, web), focus(2000, desktop)];
    expect(placeOf({ atMs: 0, endMs: 4000 }, timeline)).toMatchObject({
      app: desktop,
    });
  });

  it("says the passage happened outside the apps, naming the last one used", () => {
    const timeline = [focus(0, web), focus(1000, null)];
    expect(placeOf({ atMs: 2000, endMs: 5000 }, timeline)).toEqual({
      kind: "outside",
      lastApp: web,
    });
  });

  it("gives each passage the page that app showed by its end", () => {
    const timeline = [focus(0, web, "/a"), focus(3000, web, "/b")];
    expect(placeOf({ atMs: 0, endMs: 2000 }, timeline)).toMatchObject({
      page: page("/a"),
    });
    expect(placeOf({ atMs: 4000, endMs: 5000 }, timeline)).toMatchObject({
      page: page("/b"),
    });
  });

  it("places a typed note, which has no duration, in the app focused at that instant", () => {
    const timeline = [focus(0, web), focus(3000, desktop)];
    expect(placeOf({ atMs: 3000, endMs: 3000 }, timeline)).toMatchObject({
      app: desktop,
    });
  });
});

describe("following focus from presence reports", () => {
  const startedAt = 1_000_000;
  const report = (
    timeline: PresenceTimeline,
    from: LiveApp,
    at: number,
    focused: boolean
  ) =>
    timeline.report(from, {
      at,
      clientId: from.label,
      focused,
      frame: page("/"),
    });

  it("treats a focused app silent for 15 s as left at its last report", () => {
    const timeline = new PresenceTimeline();
    report(timeline, web, startedAt, true);
    report(timeline, web, startedAt + 8000, true);
    const transitions = timeline.since(startedAt, startedAt + 30_000);
    expect(placeOf({ atMs: 2000, endMs: 6000 }, transitions)).toMatchObject({
      app: web,
    });
    expect(placeOf({ atMs: 20_000, endMs: 25_000 }, transitions)).toEqual({
      kind: "outside",
      lastApp: web,
    });
  });

  it("keeps the focus when an app that never held it reports a blur", () => {
    const timeline = new PresenceTimeline();
    report(timeline, web, startedAt, true);
    report(timeline, desktop, startedAt + 1000, false);
    report(timeline, web, startedAt + 5000, true);
    const transitions = timeline.since(startedAt, startedAt + 6000);
    expect(placeOf({ atMs: 2000, endMs: 6000 }, transitions)).toMatchObject({
      app: web,
    });
  });

  it("starts a session in the app already focused before Record", () => {
    const timeline = new PresenceTimeline();
    report(timeline, desktop, startedAt - 5000, true);
    report(timeline, desktop, startedAt + 4000, true);
    const transitions = timeline.since(startedAt, startedAt + 5000);
    expect(placeOf({ atMs: 0, endMs: 3000 }, transitions)).toMatchObject({
      app: desktop,
    });
  });
});
