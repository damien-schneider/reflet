import { describe, expect, test } from "vitest";
import {
  type FrameValue,
  type LinkableEvidence,
  resolveSegmentContext,
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

const markOn = (
  label: string,
  atMs: number,
  frame: FrameValue
): SessionEventValue => ({
  atMs,
  element: elementNamed(label),
  evidenceClientKey: `mark-${atMs}`,
  frame,
  kind: "mark",
  note: null,
});

const screenshot = (
  id: string,
  shot: Partial<LinkableEvidence<string>> & { atMs: number }
): LinkableEvidence<string> => ({
  clientKey: `key-${id}`,
  id,
  storedId: `stored-${id}`,
  trigger: "manual",
  ...shot,
});

const passage = { endMs: 8000, startMs: 5500 };

const hoverOn = (
  label: string,
  hover: { atMs: number; durationMs: number; evidenceClientKey?: string },
  frame: FrameValue
): SessionEventValue => ({
  ...hover,
  element: elementNamed(label),
  frame,
  kind: "dwell",
  pointer: { x: 60, y: 310 },
});

describe("automatic context", () => {
  test("a phrase after a scroll links to the element clicked after the scroll, with that click's own frame", () => {
    const top = frameAt(0);
    const scrolled = frameAt(900);
    const linked = resolveSegmentContext({
      events: [
        clickOn("Pricing card", 1000, top),
        { atMs: 3000, kind: "scroll", scrollX: 0, scrollY: 900 },
        clickOn("Save", 5000, scrolled),
      ],
      evidence: [
        screenshot("E-start", { atMs: 0, frame: top }),
        screenshot("E-scrolled", { atMs: 5000, frame: scrolled }),
      ],
      segment: passage,
    });

    expect(linked.context[0]).toMatchObject({
      atMs: 5000,
      element: elementNamed("Save"),
      evidenceId: "E-scrolled",
      frame: scrolled,
      kind: "click",
      label: "Save",
      pointer: { x: 60, y: 310 },
    });
    expect(linked.ambiguous).toBe(false);
    expect(linked.origin).toBe("auto");
  });

  test("an earlier screenshot of another scroll position is never attached to a later click", () => {
    const linked = resolveSegmentContext({
      events: [clickOn("Save", 5000, frameAt(900))],
      evidence: [screenshot("E-start", { atMs: 0, frame: frameAt(0) })],
      segment: passage,
    });

    expect(linked.context[0]?.evidenceId).toBeNull();
    expect(linked.context[0]?.evidenceMatch).toBeNull();
  });

  test("an explicit mark outranks pointer hover inside the passage", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [
        markOn("History form", 4000, frame),
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
    const linked = resolveSegmentContext({
      events: [clickOn("Save", 4900, frame), clickOn("Cancel", 5100, frame)],
      evidence: [],
      segment: passage,
    });

    expect(linked.context).toHaveLength(2);
    expect(linked.ambiguous).toBe(true);
  });

  test("repeated clicks on one element count once and keep at most three elements", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [
        clickOn("Save", 5600, frame),
        clickOn("Save", 5700, frame),
        clickOn("Name", 5800, frame),
        clickOn("Email", 5900, frame),
        clickOn("Phone", 6000, frame),
      ],
      evidence: [],
      segment: passage,
    });

    expect(linked.context).toHaveLength(3);
    expect(linked.context.filter(({ label }) => label === "Save")).toHaveLength(
      1
    );
  });

  test("nothing inside the window links nothing, not even the current screen", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [clickOn("Save", 1000, frame), clickOn("Cancel", 20_000, frame)],
      evidence: [screenshot("E-start", { atMs: 0, frame })],
      segment: { endMs: 12_000, startMs: 10_000 },
    });

    expect(linked).toEqual({ ambiguous: false, context: [], origin: "auto" });
  });

  test("a hover that started before the window and lasts through the phrase links to it with its duration", () => {
    const linked = resolveSegmentContext({
      events: [
        {
          atMs: 0,
          durationMs: 12_000,
          element: elementNamed("Sidebar"),
          frame: frameAt(0),
          kind: "dwell",
          pointer: { x: 10, y: 10 },
        },
      ],
      evidence: [],
      segment: { endMs: 11_000, startMs: 10_000 },
    });

    expect(linked.context).toEqual([
      expect.objectContaining({ durationMs: 12_000, kind: "dwell" }),
    ]);
  });
});

describe("which hovered element a passage is about", () => {
  test("the element the pointer rested on outranks one it only crossed, without flagging the passage unclear", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [
        hoverOn("Nav link", { atMs: 5600, durationMs: 800 }, frame),
        hoverOn("Pricing card", { atMs: 6400, durationMs: 4000 }, frame),
      ],
      evidence: [],
      segment: passage,
    });

    expect(linked.context.map(({ label }) => label)).toEqual([
      "Pricing card",
      "Nav link",
    ]);
    expect(linked.ambiguous).toBe(false);
  });

  test("the screenshot taken while the pointer rested on the element outlines it exactly", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [
        hoverOn(
          "Pricing card",
          { atMs: 5600, durationMs: 3000, evidenceClientKey: "key-E-hover" },
          frame
        ),
      ],
      evidence: [
        screenshot("E-start", { atMs: 5000, capturedAtMs: 5100, frame }),
        screenshot("E-hover", {
          atMs: 6800,
          capturedAtMs: 7300,
          frame,
          trigger: "hover",
        }),
      ],
      segment: passage,
    });

    expect(linked.context[0]).toMatchObject({
      evidenceId: "E-hover",
      evidenceMatch: "exact",
    });
  });
});

describe("how far a screenshot can be trusted for the outline", () => {
  test("the screenshot taken for a mark, rendered on the same screen right away, outlines the element exactly", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [markOn("Save", 6000, frame)],
      evidence: [
        screenshot("E-mark", {
          atMs: 6000,
          capturedAtMs: 6400,
          clientKey: "mark-6000",
          frame,
          trigger: "mark",
        }),
      ],
      segment: passage,
    });

    expect(linked.context[0]).toMatchObject({
      evidenceId: "E-mark",
      evidenceMatch: "exact",
      evidenceOffsetMs: 400,
    });
  });

  test("a mark screenshot rendered after the page scrolled is only approximate", () => {
    const linked = resolveSegmentContext({
      events: [markOn("Save", 6000, frameAt(0))],
      evidence: [
        screenshot("E-mark", {
          atMs: 6000,
          capturedAtMs: 6300,
          clientKey: "mark-6000",
          frame: frameAt(400),
          trigger: "mark",
        }),
      ],
      segment: passage,
    });

    expect(linked.context[0]).toMatchObject({
      evidenceId: "E-mark",
      evidenceMatch: "approximate",
    });
  });

  test("a mark screenshot rendered seconds later is only approximate", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [markOn("Save", 6000, frame)],
      evidence: [
        screenshot("E-mark", {
          atMs: 6000,
          capturedAtMs: 9500,
          clientKey: "mark-6000",
          frame,
          trigger: "mark",
        }),
      ],
      segment: passage,
    });

    expect(linked.context[0]?.evidenceMatch).toBe("approximate");
  });

  test("a screenshot recorded before render times were known is never presented as exact", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [markOn("Save", 6000, frame)],
      evidence: [
        screenshot("E-mark", {
          atMs: 6000,
          clientKey: "mark-6000",
          frame,
          trigger: "mark",
        }),
      ],
      segment: passage,
    });

    expect(linked.context[0]?.evidenceMatch).toBe("approximate");
  });

  test("a click shown by a nearby screenshot of the same screen is associated by time only", () => {
    const frame = frameAt(0);
    const linked = resolveSegmentContext({
      events: [clickOn("Save", 6000, frame)],
      evidence: [
        screenshot("E-later", { atMs: 9000, capturedAtMs: 9200, frame }),
      ],
      segment: passage,
    });

    expect(linked.context[0]).toMatchObject({
      evidenceId: "E-later",
      evidenceMatch: "approximate",
      evidenceOffsetMs: 3200,
    });
  });
});

describe("human correction of the context", () => {
  const frame = frameAt(0);
  const events = [clickOn("Save", 5000, frame), clickOn("Cancel", 5100, frame)];

  test("context marked unknown links nothing and never falls back to automatic linking", () => {
    const linked = resolveSegmentContext({
      events,
      evidence: [],
      segment: { ...passage, contextCorrection: { kind: "unknown" } },
    });

    expect(linked).toEqual({
      ambiguous: false,
      context: [],
      origin: "unknown",
    });
  });

  test("a chosen event becomes the only context, even far from the passage", () => {
    const linked = resolveSegmentContext({
      events: [...events, clickOn("History tab", 30, frame)],
      evidence: [],
      segment: {
        ...passage,
        contextCorrection: { atMs: 30, eventKind: "click", kind: "event" },
      },
    });

    expect(linked.origin).toBe("human");
    expect(linked.ambiguous).toBe(false);
    expect(linked.context.map(({ label }) => label)).toEqual(["History tab"]);
  });

  test("a chosen screenshot without an element is the context, without any outline", () => {
    const linked = resolveSegmentContext({
      events,
      evidence: [screenshot("E-start", { atMs: 0, frame, trigger: "start" })],
      segment: {
        ...passage,
        contextCorrection: { evidenceId: "stored-E-start", kind: "evidence" },
      },
    });

    expect(linked.context).toEqual([
      expect.objectContaining({
        element: null,
        evidenceId: "E-start",
        evidenceMatch: null,
        kind: "screenshot",
      }),
    ]);
  });

  test("a chosen mark screenshot keeps the element pointed at when it was marked", () => {
    const linked = resolveSegmentContext({
      events: [markOn("Plan picker", 2000, frame), ...events],
      evidence: [
        screenshot("E-mark", {
          atMs: 2000,
          capturedAtMs: 2200,
          clientKey: "mark-2000",
          frame,
          trigger: "mark",
        }),
      ],
      segment: {
        ...passage,
        contextCorrection: { evidenceId: "stored-E-mark", kind: "evidence" },
      },
    });

    expect(linked.context).toEqual([
      expect.objectContaining({
        evidenceId: "E-mark",
        evidenceMatch: "exact",
        kind: "mark",
        label: "Plan picker",
      }),
    ]);
  });
});
