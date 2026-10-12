import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { loadSession, sessionActorValidator } from "../access";
import {
  elementRefValidator,
  evidenceLinkValidator,
  evidenceTriggerValidator,
  frameValidator,
} from "../tableFields";
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
});
