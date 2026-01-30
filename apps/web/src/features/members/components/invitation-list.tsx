import { ArrowClockwise, Check } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds - must match backend

interface InvitationInfo {
  _id: Id<"invitations">;
  _creationTime: number;
  email: string;
  role: "owner" | "admin" | "member";
  lastSentAt?: number;
}

interface InvitationListProps {
  invitations: InvitationInfo[] | undefined;
}

interface InvitationItemProps {
  invitation: InvitationInfo;
  onCancel: (id: Id<"invitations">) => void;
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
        <Check className="mr-1 h-4 w-4" />
        Sent
      </>
    );
  }

  if (isResending) {
    return (
      <>
        <ArrowClockwise className="mr-1 h-4 w-4 animate-spin" />
        Sending...
      </>
    );
  }

  if (remainingSeconds > 0) {
    return `Resend in ${remainingSeconds}s`;
  }

  return (
    <>
      <ArrowClockwise className="mr-1 h-4 w-4" />
      Resend
    </>
  );
}

function InvitationItem({
  invitation,
  onCancel,
  onResend,
}: InvitationItemProps) {
  const [isResending, setIsResending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const calculateRemaining = useCallback(() => {
    const lastSent = invitation.lastSentAt ?? invitation._creationTime;
    const elapsed = Date.now() - lastSent;
    const remaining = Math.max(
      0,
      Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
    );
    return remaining;
  }, [invitation.lastSentAt, invitation._creationTime]);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [calculateRemaining]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend(invitation._id);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2000);
    } finally {
      setIsResending(false);
    }
  };

  const canResend = remainingSeconds === 0 && !isResending && !justSent;

  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="font-medium">{invitation.email}</p>
        <p className="text-muted-foreground text-sm">
          Invited as {invitation.role} •{" "}
          {new Date(invitation._creationTime).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          disabled={!canResend}
          onClick={handleResend}
          size="sm"
          variant="outline"
        >
          <ResendButtonContent
            isResending={isResending}
            justSent={justSent}
            remainingSeconds={remainingSeconds}
          />
        </Button>
        <Button
          onClick={() => onCancel(invitation._id)}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function InvitationList({ invitations }: InvitationListProps) {
  const cancelInvitation = useMutation(api.invitations.cancel);
  const resendInvitation = useMutation(api.invitations.resend);

  const handleCancelInvitation = (invitationId: Id<"invitations">) => {
    cancelInvitation({ invitationId });
  };

  const handleResendInvitation = async (invitationId: Id<"invitations">) => {
    await resendInvitation({ invitationId });
  };

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="divide-y">
      {invitations.map((invitation) => (
        <InvitationItem
          invitation={invitation}
          key={invitation._id}
          onCancel={handleCancelInvitation}
          onResend={handleResendInvitation}
        />
      ))}
    </div>
  );
}
