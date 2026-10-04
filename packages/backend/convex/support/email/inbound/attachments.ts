import { type Infer, v } from "convex/values";
import { attachmentFile } from "../tableFields";

export const MAX_ATTACHMENTS_PER_EMAIL = 10;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MIN_INLINE_ATTACHMENT_BYTES = 20 * 1024;
const MAX_FILENAME_CHARS = 200;

export const inboundAttachment = v.object({
  contentType: v.string(),
  file: attachmentFile,
  filename: v.string(),
  size: v.number(),
});

export type InboundAttachment = Infer<typeof inboundAttachment>;

const MAGIC_BYTES_BY_TYPE: Record<
  string,
  { bytes: number[]; offset: number }[]
> = {
  "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], offset: 0 }],
  "image/gif": [{ bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }],
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff], offset: 0 }],
  "image/png": [
    { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  ],
  "image/webp": [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  ],
};

const ALLOWED_ATTACHMENT_TYPES = new Set(Object.keys(MAGIC_BYTES_BY_TYPE));

export const isAllowedAttachmentType = (contentType: string): boolean =>
  ALLOWED_ATTACHMENT_TYPES.has(contentType.toLowerCase());

export const sniffAttachmentType = (bytes: Uint8Array): string | null => {
  for (const [contentType, signature] of Object.entries(MAGIC_BYTES_BY_TYPE)) {
    const matches = signature.every(({ bytes: expected, offset }) =>
      expected.every((byte, index) => bytes[offset + index] === byte)
    );
    if (matches) {
      return contentType;
    }
  }
  return null;
};

export const attachmentFilename = (filename: string | null | undefined) =>
  filename?.trim().slice(0, MAX_FILENAME_CHARS) || "attachment";
