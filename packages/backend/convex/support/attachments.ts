import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { skippedAttachmentReason } from "./email/tableFields";

export const supportAttachmentView = v.object({
  contentType: v.string(),
  filename: v.string(),
  skipped: v.optional(skippedAttachmentReason),
  url: v.union(v.string(), v.null()),
});

export type SupportAttachmentView = Infer<typeof supportAttachmentView>;

export const attachmentViewsByMessage = async (
  ctx: QueryCtx,
  conversationId: Id<"supportConversations">
): Promise<Map<Id<"supportMessages">, SupportAttachmentView[]>> => {
  const attachments = await ctx.db
    .query("supportAttachments")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();

  const views = new Map<Id<"supportMessages">, SupportAttachmentView[]>();
  for (const attachment of attachments) {
    const view: SupportAttachmentView =
      attachment.file.kind === "stored"
        ? {
            contentType: attachment.contentType,
            filename: attachment.filename,
            url: await ctx.storage.getUrl(attachment.file.storageId),
          }
        : {
            contentType: attachment.contentType,
            filename: attachment.filename,
            skipped: attachment.file.reason,
            url: null,
          };
    views.set(attachment.messageId, [
      ...(views.get(attachment.messageId) ?? []),
      view,
    ]);
  }
  return views;
};
