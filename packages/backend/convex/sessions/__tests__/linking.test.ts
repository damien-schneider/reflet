import { describe, expect, test } from "vitest";
import {
  type FrameValue,
  linkSegmentContext,
  type SessionEventValue,
} from "../linking";

const frameAt = (scrollY: number, url = "https://app.test/settings") => ({
  devicePixelRatio: 2,
  scrollX: 0,
  scrollY,
  title: "Settings",
  url,
  viewportHeight: 800,
  viewportWidth: 1280,
});

const elementNamed = (label: string) => ({
  component: null,
  label,
  rect: { height: 32, width: 120, x: 40, y: 300 },
  role: "button",
  selector: `[data-test="${label}"]`,
  source: null,
});

const clickOn = (
  label: string,
  atMs: number,
  frame: FrameValue
): SessionEventValue => ({
  atMs,
  element: elementNamed(label),
  frame,
  kind: "click",
  pointer: { x: 60, y: 310 },
});

describe("linkSegmentContext", () => {
  test("a phrase after a scroll links to the element clicked after the scroll, with that click's own frame", () => {
    const top = frameAt(0);
    const scrolled = frameAt(900);
    const events: SessionEventValue[] = [
      clickOn("Pricing card", 1000, top),
      { atMs: 3000, kind: "scroll", scrollX: 0, scrollY: 900 },
      clickOn("Save", 5000, scrolled),
    ];
    const evidence = [
      { atMs: 0, frame: top, id: "E-start" },
      { atMs: 5000, frame: scrolled, id: "E-scrolled" },
    ];

    const linked = linkSegmentContext({
      events,
      evidence,
      segment: { endMs: 8000, startMs: 5500 },
    });

    expect(linked.context[0]).toEqual({
      atMs: 5000,
      evidenceId: "E-scrolled",
      kind: "click",
      label: "Save",
      url: "https://app.test/settings",
    });
    expect(linked.ambiguous).toBe(false);
  });

  test("an earlier screenshot of another scroll position is never attached to a later click", () => {
    const linked = linkSegmentContext({
      events: [clickOn("Save", 5000, frameAt(900))],
      evidence: [{ atMs: 0, frame: frameAt(0), id: "E-start" }],
      segment: { endMs: 8000, startMs: 5500 },
    });

    expect(linked.context[0]?.evidenceId).toBeNull();
  });

  test("an explicit mark outranks pointer hover inside the passage", () => {
    const frame = frameAt(0);
    const linked = linkSegmentContext({
      events: [
        {
          atMs: 4000,
          element: elementNamed("History form"),
          evidenceClientKey: "mark-1",
          frame,
          kind: "mark",
          note: null,
        },
        {
          atMs: 6000,
          durationMs: 900,
          element: elementNamed("Sidebar"),
          frame,
          kind: "dwell",
          pointer: { x: 10, y: 10 },
        },
      ],
      evidence: [],
      segment: { endMs: 8000, startMs: 5000 },
    });

    expect(linked.context.map(({ label }) => label)).toEqual([
      "History form",
      "Sidebar",
    ]);
    expect(linked.ambiguous).toBe(false);
  });

  test("two different elements clicked close together are flagged ambiguous", () => {
    const frame = frameAt(0);
    const linked = linkSegmentContext({
      events: [clickOn("Save", 4900, frame), clickOn("Cancel", 5100, frame)],
      evidence: [],
      segment: { endMs: 8000, startMs: 5500 },
    });

    expect(linked.context).toHaveLength(2);
    expect(linked.ambiguous).toBe(true);
  });

  test("repeated clicks on one element count once and keep at most three elements", () => {
    const frame = frameAt(0);
    const linked = linkSegmentContext({
      events: [
        clickOn("Save", 5600, frame),
        clickOn("Save", 5700, frame),
        clickOn("Name", 5800, frame),
        clickOn("Email", 5900, frame),
        clickOn("Phone", 6000, frame),
      ],
      evidence: [],
      segment: { endMs: 8000, startMs: 5500 },
    });

    expect(linked.context.map(({ label }) => label)).toHaveLength(3);
    expect(linked.context.filter(({ label }) => label === "Save")).toHaveLength(
      1
    );
  });

  test("nothing inside the window links nothing, not even the current screen", () => {
    const frame = frameAt(0);
    const linked = linkSegmentContext({
      events: [clickOn("Save", 1000, frame), clickOn("Cancel", 20_000, frame)],
      evidence: [{ atMs: 0, frame, id: "E-start" }],
      segment: { endMs: 12_000, startMs: 10_000 },
    });

    expect(linked).toEqual({ ambiguous: false, context: [] });
  });
});
