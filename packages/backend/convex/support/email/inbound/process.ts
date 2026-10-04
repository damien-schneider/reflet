"use node";

import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { type ActionCtx, internalAction } from "../../../_generated/server";
import {
  getReceivedEmail,
  listReceivedAttachments,
  type ReceivedAttachmentDownload,
} from "../resend_api";
import {
  attachmentFilename,
  type InboundAttachment,
  isAllowedAttachmentType,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_EMAIL,
  MIN_INLINE_ATTACHMENT_BYTES,
  sniffAttachmentType,
} from "./attachments";
import { headerValues, isAutoSubmittedEmail, messageIdsIn } from "./headers";
import { emailFullText, visibleReplyText } from "./reply_text";
import { extractEmailAddress } from "./route";

const isSignatureImage = (
  attachment: ReceivedAttachmentDownload,
  size: number
): boolean =>
  attachment.content_disposition?.toLowerCase() === "inline" &&
  size < MIN_INLINE_ATTACHMENT_BYTES;

const downloadFile = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
};

const storeAttachment = async (
  ctx: ActionCtx,
  attachment: ReceivedAttachmentDownload
): Promise<InboundAttachment | null> => {
  const base = {
    contentType: attachment.content_type,
    filename: attachmentFilename(attachment.filename),
    size: attachment.size ?? 0,
  };
  if (base.size > MAX_ATTACHMENT_BYTES) {
    return { ...base, file: { kind: "skipped", reason: "too_large" } };
  }
  if (!isAllowedAttachmentType(attachment.content_type)) {
    return { ...base, file: { kind: "skipped", reason: "unsupported_type" } };
  }
  const content = await downloadFile(attachment.download_url);
  if (!content) {
    return { ...base, file: { kind: "skipped", reason: "download_failed" } };
  }
  const size = content.byteLength;
  if (isSignatureImage(attachment, size)) {
    return null;
  }
  if (size > MAX_ATTACHMENT_BYTES) {
    return { ...base, file: { kind: "skipped", reason: "too_large" }, size };
  }
  const contentType = sniffAttachmentType(new Uint8Array(content));
  if (!contentType) {
    return {
      ...base,
      file: { kind: "skipped", reason: "unsupported_type" },
      size,
    };
  }
  const storageId = await ctx.storage.store(
    new Blob([content], { type: contentType })
  );
  return { ...base, contentType, file: { kind: "stored", storageId }, size };
};

const storeAttachments = async (
  ctx: ActionCtx,
  resendEmailId: string
): Promise<InboundAttachment[]> => {
  const listed = await listReceivedAttachments(resendEmailId);
  if ("error" in listed) {
    return [];
  }
  const candidates = listed.data.data
    .filter(
      (attachment) =>
        !isSignatureImage(
          attachment,
          attachment.size ?? MIN_INLINE_ATTACHMENT_BYTES
        )
    )
    .slice(0, MAX_ATTACHMENTS_PER_EMAIL);
  const stored = await Promise.all(
    candidates.map((attachment) => storeAttachment(ctx, attachment))
  );
  return stored.filter((attachment) => attachment !== null);
};

export const processInbound = internalAction({
  args: {
    inboundEmailId: v.id("supportInboundEmails"),
    resendEmailId: v.string(),
  },
  handler: async (ctx, args) => {
    const received = await getReceivedEmail(args.resendEmailId);
    if ("error" in received) {
      await ctx.runMutation(
        internal.support.email.inbound.record.rejectInbound,
        {
          inboundEmailId: args.inboundEmailId,
          reason: `fetch_failed: ${received.error}`,
        }
      );
      return;
    }
    const email = received.data;
    const fullText = emailFullText(email);
    const attachments = email.attachments?.length
      ? await storeAttachments(ctx, args.resendEmailId)
      : [];
    const from = extractEmailAddress(email.from) ?? email.from.toLowerCase();

    await ctx.runMutation(internal.support.email.inbound.record.recordInbound, {
      attachments,
      from,
      fullText,
      inboundEmailId: args.inboundEmailId,
      inReplyTo: messageIdsIn(headerValues(email.headers, "in-reply-to"))[0],
      isAutoSubmitted: isAutoSubmittedEmail({ from, headers: email.headers }),
      recipients: [
        ...email.to,
        ...(email.cc ?? []),
        ...(email.received_for ?? []),
      ],
      references: messageIdsIn(headerValues(email.headers, "references")),
      senderAuthenticated: email.authentication?.dmarc === "pass",
      subject: email.subject ?? "",
      visibleText: visibleReplyText(fullText),
    });
  },
});
