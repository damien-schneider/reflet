import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export const FRESH_UPLOAD_WINDOW_MS = 30 * 60 * 1000;

export interface UploadPolicy {
  contentTypes: Record<string, true>;
  maxBytes: number;
}

export type FreshUploadInspection =
  | { ok: true; contentType: string; size: number }
  | { ok: false; reason: "missing" | "content_type" | "too_large" };

export async function isStorageAttached(
  ctx: QueryCtx,
  storageId: Id<"_storage">
): Promise<boolean> {
  const references = await Promise.all([
    ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .first(),
    ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_annotated_storage", (q) =>
        q.eq("annotatedStorageId", storageId)
      )
      .first(),
    ctx.db
      .query("sessionSegments")
      .withIndex("by_audio_storage", (q) => q.eq("audio.storageId", storageId))
      .first(),
    ctx.db
      .query("sessionEvidence")
      .withIndex("by_image_storage", (q) => q.eq("image.storageId", storageId))
      .first(),
  ]);
  return references.some((reference) => reference !== null);
}

// Storage is shared across tenants: only accept a just-uploaded, unattached file.
export async function inspectFreshUpload(
  ctx: QueryCtx,
  storageId: Id<"_storage">,
  policy: UploadPolicy
): Promise<FreshUploadInspection> {
  const file = await ctx.db.system.get(storageId);
  if (
    !file ||
    Date.now() - file._creationTime > FRESH_UPLOAD_WINDOW_MS ||
    (await isStorageAttached(ctx, storageId))
  ) {
    return { ok: false, reason: "missing" };
  }
  const contentType = file.contentType ?? "";
  if (!policy.contentTypes[contentType]) {
    return { ok: false, reason: "content_type" };
  }
  if (file.size > policy.maxBytes) {
    return { ok: false, reason: "too_large" };
  }
  return { contentType, ok: true, size: file.size };
}
