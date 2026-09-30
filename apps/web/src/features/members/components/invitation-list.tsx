import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowClockwise, Check } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

const RESEND_COOLDOWN_MS = 60 * 1000; // must match the backend cooldown
const JUST_SENT_MS = 2000;
const MS_PER_SECOND = 1000;

interface InvitationInfo {
  _creationTime: number;
  _id: Id<"invitations">;
  email: string;
  lastSentAt?: number;
  role: "owner" | "admin" | "member";
}

interface InvitationListProps {
  invitations: InvitationInfo[] | undefined;
}

interface InvitationItemProps {
  invitation: InvitationInfo;
  onCancel: (id: Id<"invitations">) => Promise<void>;
  onResend: (id: Id<"invitations">) => Promise<void>;
}

function ResendButtonContent({
  justSent,
  isResending,
  remainingSeconds,
}: {
  justSent: boolean;
  isResending: boolean;
  remainingSeconds: number;
}) {
  if (justSent) {
    return (
      <>
        <Check aria-hidden />
        Sent
      </>
    );
  }
  if (isResending) {
    return (
      <>
        <ArrowClockwise aria-hidden className="motion-safe:animate-spin" />
        Sending…
      </>
    );
  }
  if (remainingSeconds > 0) {
    return <span className="tabular-nums">Resend in {remainingSeconds}s</span>;
  }
  return (
    <>
      <ArrowClockwise aria-hidden />
      Resend
    </>
  );
}

function useResendCooldown(invitation: InvitationInfo) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const lastSent = invitation.lastSentAt ?? invitation._creationTime;
      const elapsed = Date.now() - lastSent;
      setRemainingSeconds(
        Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - elapsed) / MS_PER_SECOND))
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, MS_PER_SECOND);
    return () => clearInterval(interval);
  }, [invitation.lastSentAt, invitation._creationTime]);

  return remainingSeconds;
}

function InvitationItem({
  invitation,
  onCancel,
  onResend,
}: InvitationItemProps) {
  const [isResending, setIsResending] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const justSentTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const remainingSeconds = useResendCooldown(invitation);

  useEffect(() => () => clearTimeout(justSentTimerRef.current), []);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend(invitation._id);
      setJustSent(true);
      justSentTimerRef.current = setTimeout(
        () => setJustSent(false),
        JUST_SENT_MS
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t resend the invite"
      );
    }
    setIsResending(false);
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      await onCancel(invitation._id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t cancel the invite"
      );
      setIsCanceling(false);
    }
  };

  const canResend =
    remainingSeconds === 0 && !isResending && !justSent && !isCanceling;

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 flex-col">
        <p className="truncate font-medium text-label">{invitation.email}</p>
        <p className="text-caption text-muted-foreground">
          Invited as {invitation.role} ·{" "}
          <time
            className="tabular-nums"
            dateTime={new Date(invitation._creationTime).toISOString()}
          >
            {format(invitation._creationTime, "PP")}
          </time>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          disabled={!canResend}
          onClick={handleResend}
          size="sm"
          variant="surface"
        >
          <ResendButtonContent
            isResending={isResending}
            justSent={justSent}
            remainingSeconds={remainingSeconds}
          />
        </Button>
        <Button
          aria-label={`Cancel invitation for ${invitation.email}`}
          disabled={isCanceling}
          onClick={handleCancel}
          size="sm"
          variant="ghost"
        >
          {isCanceling ? "Canceling…" : "Cancel"}
        </Button>
      </div>
    </li>
  );
}

export function InvitationList({ invitations }: InvitationListProps) {
  const cancelInvitation = useMutation(
    api.organizations.invitation_actions.cancel
  );
  const resendInvitation = useMutation(
    api.organizations.invitation_actions.resend
  );

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y">
      {invitations.map((invitation) => (
        <InvitationItem
          invitation={invitation}
          key={invitation._id}
          onCancel={async (invitationId) => {
            await cancelInvitation({ invitationId });
          }}
          onResend={async (invitationId) => {
            await resendInvitation({ invitationId });
          }}
        />
      ))}
    </ul>
  );
}
