import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  loadSession,
  loadSessionChild,
  sessionActorValidator,
  sessionConflict,
} from "../access";
import {
  elementRefValidator,
  evidenceLinkValidator,
  evidenceTriggerValidator,
  evidenceViewValidator,
  frameValidator,
} from "../validators";
import { shapeEvidence } from "../views/detail";
import {
  claimFreshUpload,
  discardOrphanUpload,
  requireUploadCapacity,
} from "./uploads";

const evidenceImageValidator = v.object({
  height: v.number(),
  storageId: v.string(),
  width: v.number(),
});

type EvidenceImageInput = Infer<typeof evidenceImageValidator>;

async function findReplayedEvidence(
  ctx: MutationCtx,
  input: {
    clientKey: string;
    image: EvidenceImageInput | undefined;
    sessionId: Id<"sessions">;
  }
): Promise<Doc<"sessionEvidence"> | null> {
  const replayed = await ctx.db
    .query("sessionEvidence")
    .withIndex("by_session_client_key", (q) =>
      q.eq("sessionId", input.sessionId).eq("clientKey", input.clientKey)
    )
    .unique();
  if (replayed && input.image) {
    await discardOrphanUpload(ctx, {
      keptStorageId: replayed.image?.storageId,
      storageId: input.image.storageId,
    });
  }
  return replayed;
}

async function claimEvidenceImage(
  ctx: MutationCtx,
  image: EvidenceImageInput | undefined
) {
  if (!image) {
    return;
  }
  const upload = await claimFreshUpload(ctx, {
    kind: "image",
    storageId: image.storageId,
  });
  return {
    bytes: upload.bytes,
    height: image.height,
    storageId: upload.storageId,
    width: image.width,
  };
}

export const register = internalMutation({
  args: {
    actor: sessionActorValidator,
    atMs: v.number(),
    capturedAtMs: v.optional(v.number()),
    clientKey: v.string(),
    element: v.optional(elementRefValidator),
    frame: v.optional(frameValidator),
    image: v.optional(evidenceImageValidator),
    link: v.optional(evidenceLinkValidator),
    missingReason: v.optional(v.string()),
    note: v.optional(v.string()),
    sessionId: v.string(),
    trigger: evidenceTriggerValidator,
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const replayed = await findReplayedEvidence(ctx, {
      clientKey: args.clientKey,
      image: args.image,
      sessionId: session._id,
    });
    if (replayed) {
      return { evidence: await shapeEvidence(ctx, replayed) };
    }
    requireUploadCapacity(session, "image");
    const image = await claimEvidenceImage(ctx, args.image);
    const isAvailable = image !== undefined || args.link !== undefined;
    const now = Date.now();
    const evidenceId = await ctx.db.insert("sessionEvidence", {
      atMs: args.atMs,
      capturedAtMs: args.capturedAtMs,
      clientKey: args.clientKey,
      createdAt: now,
      element: args.element,
      frame: args.frame,
      image,
      kind: args.link ? "link" : "screenshot",
      link: args.link,
      missingReason: isAvailable
        ? undefined
        : (args.missingReason ?? "Capture unavailable"),
      note: args.note,
      organizationId: session.organizationId,
      sessionId: session._id,
      status: isAvailable ? "available" : "missing",
      trigger: args.trigger,
    });
    await ctx.db.patch(session._id, {
      updatedAt: now,
      usage: {
        ...session.usage,
        evidenceCount: session.usage.evidenceCount + 1,
      },
    });
    const evidence = await ctx.db.get(evidenceId);
    if (!evidence) {
      throw new Error("Evidence insert failed");
    }
    return { evidence: await shapeEvidence(ctx, evidence) };
  },
  returns: v.object({ evidence: evidenceViewValidator }),
});

const REMOVED_REASON = "Removed from the session.";
const ONLY_SCREENSHOTS = "Only screenshots can be removed.";

export const remove = internalMutation({
  args: { actor: sessionActorValidator, evidenceId: v.string() },
  handler: async (ctx, args) => {
    const { child: evidence, session } = await loadSessionChild(ctx, {
      access: "write",
      actor: args.actor,
      id: args.evidenceId,
      table: "sessionEvidence",
    });
    if (evidence.kind !== "screenshot") {
      throw sessionConflict(ONLY_SCREENSHOTS);
    }
    if (evidence.image) {
      await ctx.storage.delete(evidence.image.storageId);
    }
    const removal = {
      image: undefined,
      missingReason: REMOVED_REASON,
      status: "missing" as const,
    };
    await ctx.db.patch(evidence._id, removal);
    await ctx.db.patch(session._id, { updatedAt: Date.now() });
    return { evidence: await shapeEvidence(ctx, { ...evidence, ...removal }) };
  },
  returns: v.object({ evidence: evidenceViewValidator }),
});
