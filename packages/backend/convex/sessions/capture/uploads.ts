import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { inspectFreshUpload } from "../../shared/fresh_upload";
import { rateLimiter } from "../../shared/rate_limits";
import {
  loadSession,
  sessionActorValidator,
  sessionFailure,
  sessionLimitReached,
} from "../access";
import {
  AUDIO_CONTENT_TYPES,
  IMAGE_CONTENT_TYPES,
  SESSION_LIMITS,
} from "../constants";

type UploadKind = "audio" | "image";

const BAD_REQUEST_STATUS = 400;
const TOO_MANY_REQUESTS_STATUS = 429;
const UPLOAD_NOT_FOUND = "Upload not found";
const TOO_MANY_UPLOADS =
  "Too many uploads in a short time. Try again in a minute.";
const UPLOAD_POLICIES = {
  audio: {
    contentTypes: AUDIO_CONTENT_TYPES,
    maxBytes: SESSION_LIMITS.maxSegmentBytes,
    typeError: "Audio must be uploaded as audio/wav.",
  },
  image: {
    contentTypes: IMAGE_CONTENT_TYPES,
    maxBytes: SESSION_LIMITS.maxImageBytes,
    typeError: "Screenshots must be PNG, JPEG or WebP images.",
  },
} as const;

export function requireUploadCapacity(
  session: Doc<"sessions">,
  kind: UploadKind
): void {
  if (
    kind === "audio" &&
    session.usage.segmentCount >= SESSION_LIMITS.maxSegments
  ) {
    throw sessionLimitReached("segments");
  }
  if (
    kind === "image" &&
    session.usage.evidenceCount >= SESSION_LIMITS.maxEvidence
  ) {
    throw sessionLimitReached("evidence");
  }
}

export async function claimFreshUpload(
  ctx: MutationCtx,
  upload: { kind: UploadKind; storageId: string }
): Promise<{ bytes: number; storageId: Id<"_storage"> }> {
  const policy = UPLOAD_POLICIES[upload.kind];
  const storageId = ctx.db.system.normalizeId("_storage", upload.storageId);
  if (!storageId) {
    throw sessionFailure(BAD_REQUEST_STATUS, UPLOAD_NOT_FOUND);
  }
  const inspection = await inspectFreshUpload(ctx, storageId, policy);
  if (inspection.ok) {
    return { bytes: inspection.size, storageId };
  }
  if (inspection.reason === "too_large") {
    throw sessionLimitReached("bytes");
  }
  throw sessionFailure(
    BAD_REQUEST_STATUS,
    inspection.reason === "content_type" ? policy.typeError : UPLOAD_NOT_FOUND
  );
}

// A replayed registration may carry a second upload of the same capture.
export async function discardOrphanUpload(
  ctx: MutationCtx,
  options: { keptStorageId: Id<"_storage"> | undefined; storageId: string }
): Promise<void> {
  const storageId = ctx.db.system.normalizeId("_storage", options.storageId);
  if (!storageId || storageId === options.keptStorageId) {
    return;
  }
  const inspection = await inspectFreshUpload(ctx, storageId, {
    contentTypes: { ...AUDIO_CONTENT_TYPES, ...IMAGE_CONTENT_TYPES },
    maxBytes: Number.POSITIVE_INFINITY,
  });
  if (inspection.ok) {
    await ctx.storage.delete(storageId);
  }
}

export const uploadUrl = internalMutation({
  args: {
    actor: sessionActorValidator,
    kind: v.union(v.literal("audio"), v.literal("image")),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    requireUploadCapacity(session, args.kind);
    const { ok } = await rateLimiter.limit(ctx, "sessionUploadPerMember", {
      key: `${args.actor.organizationId}:${args.actor.userId}`,
    });
    if (!ok) {
      throw sessionFailure(TOO_MANY_REQUESTS_STATUS, TOO_MANY_UPLOADS);
    }
    return { uploadUrl: await ctx.storage.generateUploadUrl() };
  },
});
