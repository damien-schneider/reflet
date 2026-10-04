import { cn } from "@ctrl-ui/react/lib/cn";
import { FilePdf, Paperclip } from "@phosphor-icons/react";
import Image from "next/image";
import type { SupportMessageData } from "@/features/support/components/thread/support-message";

type Attachment = SupportMessageData["attachments"][number];
type SkipReason = NonNullable<Attachment["skipped"]>;

const THUMBNAIL_TYPES: Record<string, true> = {
  "image/gif": true,
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};

const SKIPPED_LABELS: Record<SkipReason, string> = {
  download_failed: "Attachment unavailable",
  too_large: "Attachment too large",
  unsupported_type: "Unsupported attachment",
};

export function MessageAttachments({
  attachments,
  isOwn,
}: {
  attachments: Attachment[];
  isOwn: boolean;
}) {
  if (attachments.length === 0) {
    return null;
  }
  return (
    <ul
      aria-label="Attachments"
      className={cn("mt-1 flex flex-wrap gap-2", isOwn && "justify-end")}
    >
      {attachments.map((attachment) => (
        <li
          key={attachment.url ?? `${attachment.filename}:${attachment.skipped}`}
        >
          <AttachmentItem attachment={attachment} />
        </li>
      ))}
    </ul>
  );
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const { filename, url } = attachment;
  if (url === null) {
    const label = attachment.skipped
      ? SKIPPED_LABELS[attachment.skipped]
      : "Attachment unavailable";
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1 text-caption text-muted-foreground">
        <Paperclip aria-hidden className="size-3.5" />
        {label}: {filename}
      </span>
    );
  }
  if (THUMBNAIL_TYPES[attachment.contentType]) {
    return (
      <a
        className="relative block size-24 overflow-hidden rounded-md"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        title={filename}
      >
        <Image
          alt={filename}
          className="object-cover outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
          fill
          sizes="96px"
          src={url}
        />
      </a>
    );
  }
  return (
    <a
      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-caption hover:bg-muted"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <FilePdf aria-hidden className="size-3.5" />
      {filename}
    </a>
  );
}
