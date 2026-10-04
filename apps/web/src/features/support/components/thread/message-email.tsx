"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { useState } from "react";
import type { SupportMessageData } from "@/features/support/components/thread/support-message";

type MessageEmail = NonNullable<SupportMessageData["email"]>;
type InboundEmail = Extract<MessageEmail, { direction: "inbound" }>;
type OutboundEmail = Extract<MessageEmail, { direction: "outbound" }>;
type NotEmailedReason = Extract<
  MessageEmail,
  { direction: "skipped" }
>["reason"];
type DeliveryStatus = NonNullable<OutboundEmail["deliveryStatus"]>;

export const NOT_EMAILED_REASONS: Record<NotEmailedReason, string> = {
  no_email: "no email address",
  paused: "sending is paused",
  rate_limited: "too many emails sent",
  suppressed: "address bounced or unsubscribed",
  unverified_contact: "email address not confirmed",
};

const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  bounced: "bounced",
  clicked: "delivered",
  complained: "marked as spam",
  delivered: "delivered",
  delivery_delayed: "delayed",
  failed: "failed",
  opened: "delivered",
  sent: "sent",
};

export function MessageEmailMeta({
  email,
  isOwn,
  messageId,
}: {
  email: MessageEmail;
  isOwn: boolean;
  messageId: Id<"supportMessages">;
}) {
  return (
    <div
      className={cn(
        "mt-1 flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground",
        isOwn && "justify-end"
      )}
    >
      {email.direction === "inbound" ? (
        <InboundMeta email={email} messageId={messageId} />
      ) : (
        <span className="flex items-center gap-1">
          <EnvelopeSimple aria-hidden className="size-3.5" />
          {outboundLabel(email)}
        </span>
      )}
    </div>
  );
}

const outboundLabel = (email: Exclude<MessageEmail, InboundEmail>): string => {
  if (email.direction === "skipped") {
    return `Not emailed: ${NOT_EMAILED_REASONS[email.reason]}`;
  }
  if (email.mode === "notice") {
    return "Notification sent";
  }
  return email.deliveryStatus
    ? `Emailed · ${DELIVERY_LABELS[email.deliveryStatus]}`
    : "Emailed";
};

function InboundMeta({
  email,
  messageId,
}: {
  email: InboundEmail;
  messageId: Id<"supportMessages">;
}) {
  return (
    <>
      <span className="flex items-center gap-1">
        <EnvelopeSimple aria-hidden className="size-3.5" />
        Email
      </span>
      {email.senderMismatch && (
        <Badge color="orange" size="sm">
          Sent from {email.from}
        </Badge>
      )}
      {!email.senderAuthenticated && (
        <Badge color="yellow" size="sm">
          Unverified sender
        </Badge>
      )}
      <ViewOriginalButton messageId={messageId} />
    </>
  );
}

function ViewOriginalButton({
  messageId,
}: {
  messageId: Id<"supportMessages">;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} size="xs" variant="ghost">
        View original
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-w-2xl">
          {open && <OriginalEmail messageId={messageId} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function OriginalEmail({ messageId }: { messageId: Id<"supportMessages"> }) {
  const original = useQuery(api.support.email.inbound.queries.getOriginal, {
    messageId,
  });

  if (original === undefined) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <span className="sr-only">Loading the original email…</span>
        <Skeleton aria-hidden className="h-6 w-1/2" />
        <Skeleton aria-hidden className="h-40 w-full" />
      </div>
    );
  }

  if (original === null) {
    return (
      <DialogHeader>
        <DialogTitle>Original email unavailable</DialogTitle>
        <DialogDescription>
          The full text of this email wasn’t kept.
        </DialogDescription>
      </DialogHeader>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="break-words">
          {original.subject || "(no subject)"}
        </DialogTitle>
        <DialogDescription>
          From {original.from} · {format(original.receivedAt, "PPpp")}
        </DialogDescription>
      </DialogHeader>
      <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-caption">
        {original.fullText}
      </pre>
    </>
  );
}
