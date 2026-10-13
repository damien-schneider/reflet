import { defineTable } from "convex/server";
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

const pointerValidator = v.object({ x: v.number(), y: v.number() });

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
  v.literal("manual")
);

export const evidenceLinkValidator = v.object({
  access: v.string(),
  label: v.string(),
  url: v.string(),
});

const evidenceKindValidator = v.union(
  v.literal("screenshot"),
  v.literal("link")
);

const evidenceStatusValidator = v.union(
  v.literal("available"),
  v.literal("missing")
);

export const evidenceViewValidator = v.object({
  atMs: v.number(),
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

export const sessionsTables = {
  sessionEventBatches: defineTable({
    clientKey: v.string(),
    createdAt: v.number(),
    endMs: v.number(),
    events: v.array(sessionEventValidator),
    organizationId: v.id("organizations"),
    sessionId: v.id("sessions"),
    startMs: v.number(),
  })
    .index("by_session_start", ["sessionId", "startMs"])
    .index("by_session_client_key", ["sessionId", "clientKey"]),

  sessionEvidence: defineTable({
    atMs: v.number(),
    clientKey: v.string(),
    createdAt: v.number(),
    element: v.optional(elementRefValidator),
    frame: v.optional(frameValidator),
    image: v.optional(
      v.object({
        bytes: v.number(),
        height: v.number(),
        storageId: v.id("_storage"),
        width: v.number(),
      })
    ),
    kind: evidenceKindValidator,
    link: v.optional(evidenceLinkValidator),
    missingReason: v.optional(v.string()),
    note: v.optional(v.string()),
    organizationId: v.id("organizations"),
    sessionId: v.id("sessions"),
    status: evidenceStatusValidator,
    trigger: evidenceTriggerValidator,
  })
    .index("by_session_at", ["sessionId", "atMs"])
    .index("by_session_client_key", ["sessionId", "clientKey"])
    .index("by_image_storage", ["image.storageId"]),

  sessionHandoffs: defineTable({
    authorId: v.string(),
    brief: v.string(),
    clientKey: v.string(),
    createdAt: v.number(),
    deliveries: v.array(
      v.object({
        at: v.number(),
        kind: v.union(v.literal("copied"), v.literal("exported")),
      })
    ),
    evidenceIds: v.array(v.id("sessionEvidence")),
    files: v.array(
      v.object({ evidenceId: v.id("sessionEvidence"), name: v.string() })
    ),
    organizationId: v.id("organizations"),
    proposals: v.array(
      v.object({
        need: v.string(),
        proposalId: v.id("sessionProposals"),
        revision: v.number(),
      })
    ),
    sessionId: v.id("sessions"),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_client_key", ["sessionId", "clientKey"]),

  sessionProposals: defineTable({
    analysisRunId: v.optional(v.string()),
    basedOnTranscriptRevision: v.number(),
    certainty: v.union(v.literal("clear"), v.literal("uncertain")),
    clarifications: v.array(v.object({ at: v.number(), text: v.string() })),
    clientKey: v.optional(v.string()),
    createdAt: v.number(),
    decision: proposalDecisionValidator,
    evidenceIds: v.array(v.id("sessionEvidence")),
    feedbackId: v.optional(v.id("feedback")),
    humanTouchedAt: v.optional(v.number()),
    mergedIntoId: v.optional(v.id("sessionProposals")),
    mergeSuggestion: v.optional(
      v.object({
        reason: v.string(),
        withIds: v.array(v.id("sessionProposals")),
      })
    ),
    need: v.string(),
    needsReview: v.boolean(),
    observed: v.string(),
    organizationId: v.id("organizations"),
    origin: v.union(v.literal("ai"), v.literal("human")),
    question: v.optional(v.string()),
    refinement: v.optional(
      v.object({
        baseRevision: v.number(),
        error: v.optional(v.string()),
        runId: v.string(),
        state: v.union(
          v.literal("running"),
          v.literal("failed"),
          v.literal("outdated")
        ),
        text: v.string(),
      })
    ),
    response: v.optional(v.string()),
    revision: v.number(),
    segmentIds: v.array(v.id("sessionSegments")),
    sessionId: v.id("sessions"),
    setAside: v.array(v.string()),
    unknowns: v.array(v.string()),
    updatedAt: v.number(),
    verification: v.optional(
      v.object({
        at: v.number(),
        note: v.optional(v.string()),
        status: v.union(v.literal("works"), v.literal("needs_work")),
      })
    ),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_client_key", ["sessionId", "clientKey"]),

  sessionSegments: defineTable({
    audio: v.optional(
      v.object({
        bytes: v.number(),
        expiresAt: v.number(),
        storageId: v.id("_storage"),
      })
    ),
    clientKey: v.string(),
    createdAt: v.number(),
    endMs: v.number(),
    language: v.optional(v.string()),
    organizationId: v.id("organizations"),
    revision: v.number(),
    sessionId: v.id("sessions"),
    source: v.union(v.literal("voice"), v.literal("typed")),
    startMs: v.number(),
    text: v.string(),
    textOrigin: v.union(v.literal("transcription"), v.literal("human")),
    transcription: v.object({
      attempts: v.number(),
      error: v.optional(v.string()),
      state: transcriptionStateValidator,
      updatedAt: v.number(),
    }),
    updatedAt: v.number(),
  })
    .index("by_session_start", ["sessionId", "startMs"])
    .index("by_session_client_key", ["sessionId", "clientKey"])
    .index("by_audio_expiry", ["audio.expiresAt"])
    .index("by_audio_storage", ["audio.storageId"]),

  sessions: defineTable({
    analysis: v.object({
      analyzedRevision: v.optional(v.number()),
      error: v.optional(v.string()),
      proposalCount: v.optional(v.number()),
      runId: v.optional(v.string()),
      state: analysisStateValidator,
      updatedAt: v.optional(v.number()),
    }),
    authorId: v.string(),
    clientKey: v.string(),
    collection: v.union(
      v.literal("recording"),
      v.literal("paused"),
      v.literal("ended")
    ),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    gaps: v.array(sessionGapValidator),
    organizationId: v.id("organizations"),
    startedAt: v.number(),
    startUrl: v.optional(v.string()),
    surface: v.union(v.literal("devtools"), v.literal("app")),
    title: v.string(),
    transcriptRevision: v.number(),
    updatedAt: v.number(),
    usage: v.object({
      audioBytes: v.number(),
      eventCount: v.number(),
      evidenceCount: v.number(),
      segmentCount: v.number(),
    }),
    visibility: v.union(v.literal("private"), v.literal("team")),
  })
    .index("by_org_author", ["organizationId", "authorId"])
    .index("by_org_author_client_key", [
      "organizationId",
      "authorId",
      "clientKey",
    ])
    .index("by_org_visibility", ["organizationId", "visibility"])
    .index("by_collection_updated", ["collection", "updatedAt"])
    .index("by_deleted_at", ["deletedAt"]),
};
