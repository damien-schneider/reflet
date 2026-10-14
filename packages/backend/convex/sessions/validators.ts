import { v } from "convex/values";

const rectValidator = v.object({
  height: v.number(),
  width: v.number(),
  x: v.number(),
  y: v.number(),
});

export const elementRefValidator = v.object({
  component: v.union(v.string(), v.null()),
  label: v.string(),
  rect: rectValidator,
  role: v.union(v.string(), v.null()),
  selector: v.string(),
  source: v.union(v.string(), v.null()),
});

export const frameValidator = v.object({
  devicePixelRatio: v.number(),
  scrollX: v.number(),
  scrollY: v.number(),
  title: v.union(v.string(), v.null()),
  url: v.string(),
  viewportHeight: v.number(),
  viewportWidth: v.number(),
});

export const calloutTargetValidator = v.object({
  element: elementRefValidator,
  evidenceId: v.id("sessionEvidence"),
});

const pointerValidator = v.object({ x: v.number(), y: v.number() });

export const linkableEventKindValidator = v.union(
  v.literal("mark"),
  v.literal("select"),
  v.literal("click"),
  v.literal("dwell"),
  v.literal("navigation")
);

export const contextChoiceValidator = v.union(
  v.object({ kind: v.literal("unknown") }),
  v.object({
    atMs: v.number(),
    eventKind: linkableEventKindValidator,
    kind: v.literal("event"),
  }),
  v.object({
    evidenceId: v.id("sessionEvidence"),
    kind: v.literal("evidence"),
  })
);

export const sessionEventValidator = v.union(
  v.object({
    atMs: v.number(),
    frame: frameValidator,
    kind: v.literal("navigation"),
  }),
  v.object({
    atMs: v.number(),
    element: elementRefValidator,
    frame: frameValidator,
    kind: v.literal("click"),
    pointer: v.union(pointerValidator, v.null()),
  }),
  v.object({
    atMs: v.number(),
    durationMs: v.number(),
    element: elementRefValidator,
    evidenceClientKey: v.optional(v.string()),
    frame: frameValidator,
    kind: v.literal("dwell"),
    pointer: pointerValidator,
  }),
  v.object({
    atMs: v.number(),
    kind: v.literal("scroll"),
    scrollX: v.number(),
    scrollY: v.number(),
  }),
  v.object({
    atMs: v.number(),
    devicePixelRatio: v.number(),
    kind: v.literal("viewport"),
    viewportHeight: v.number(),
    viewportWidth: v.number(),
  }),
  v.object({
    atMs: v.number(),
    element: v.union(elementRefValidator, v.null()),
    evidenceClientKey: v.union(v.string(), v.null()),
    frame: frameValidator,
    kind: v.literal("mark"),
    note: v.union(v.string(), v.null()),
  }),
  v.object({
    atMs: v.number(),
    element: elementRefValidator,
    evidenceClientKey: v.union(v.string(), v.null()),
    frame: frameValidator,
    kind: v.literal("select"),
    note: v.union(v.string(), v.null()),
  })
);

export const gapReasonValidator = v.union(
  v.literal("paused"),
  v.literal("hidden"),
  v.literal("interrupted"),
  v.literal("limit")
);

export const sessionGapValidator = v.object({
  endMs: v.union(v.number(), v.null()),
  reason: gapReasonValidator,
  startMs: v.number(),
});

export const analysisStateValidator = v.union(
  v.literal("idle"),
  v.literal("waiting"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed")
);

export const transcriptionStateValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("done"),
  v.literal("empty"),
  v.literal("failed"),
  v.literal("expired")
);

export const proposalDecisionValidator = v.union(
  v.literal("pending"),
  v.literal("kept"),
  v.literal("later"),
  v.literal("dismissed")
);

export const evidenceTriggerValidator = v.union(
  v.literal("start"),
  v.literal("mark"),
  v.literal("navigation"),
  v.literal("select"),
  v.literal("manual"),
  v.literal("hover")
);

export const evidenceLinkValidator = v.object({
  access: v.string(),
  label: v.string(),
  url: v.string(),
});

export const evidenceKindValidator = v.union(
  v.literal("screenshot"),
  v.literal("link")
);

export const evidenceStatusValidator = v.union(
  v.literal("available"),
  v.literal("missing")
);

export const evidenceViewValidator = v.object({
  atMs: v.number(),
  capturedAtMs: v.union(v.number(), v.null()),
  element: v.union(elementRefValidator, v.null()),
  frame: v.union(frameValidator, v.null()),
  id: v.id("sessionEvidence"),
  image: v.union(
    v.object({
      height: v.number(),
      url: v.union(v.string(), v.null()),
      width: v.number(),
    }),
    v.null()
  ),
  kind: evidenceKindValidator,
  link: v.union(evidenceLinkValidator, v.null()),
  missingReason: v.union(v.string(), v.null()),
  note: v.union(v.string(), v.null()),
  status: evidenceStatusValidator,
  trigger: evidenceTriggerValidator,
});

export const formulationValidator = v.union(
  v.literal("ai"),
  v.literal("human")
);

export const intentionFieldValidator = v.union(
  v.literal("need"),
  v.literal("observed"),
  v.literal("response"),
  v.literal("unknowns"),
  v.literal("setAside")
);

export const intentionFieldValueValidator = v.union(
  v.string(),
  v.array(v.string())
);

export const intentionChangeKindValidator = v.union(
  v.literal("precision"),
  v.literal("contradiction"),
  v.literal("constraint"),
  v.literal("solution"),
  v.literal("outcome")
);

export const intentionChangeOperationValidator = v.union(
  v.literal("replace"),
  v.literal("add"),
  v.literal("remove")
);

export const intentionChangeDecisionValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected")
);

export const intentionChangeValidator = v.object({
  decision: intentionChangeDecisionValidator,
  evidenceIds: v.array(v.id("sessionEvidence")),
  field: intentionFieldValidator,
  hypothesis: v.boolean(),
  id: v.string(),
  kind: intentionChangeKindValidator,
  operation: intentionChangeOperationValidator,
  reason: v.string(),
  segmentIds: v.array(v.id("sessionSegments")),
  value: v.string(),
});

export const verdictStatusValidator = v.union(
  v.literal("resolved"),
  v.literal("needs_work"),
  v.literal("insufficient")
);
