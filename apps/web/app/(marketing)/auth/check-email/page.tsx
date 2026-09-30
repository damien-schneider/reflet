"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { EnvelopeSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthPageShell,
  AuthStatus,
} from "@/features/auth/components/auth-page-shell";
import { authClient } from "@/lib/auth-client";

type ResendState = "idle" | "sending" | "sent" | "failed";

const RESEND_MESSAGES: Record<ResendState, string> = {
  failed: "Unable to send the email. Check your connection and try again.",
  idle: "",
  sending: "",
  sent: "Email sent. Check your inbox for the new link.",
};

function CheckEmailContent() {
  const email = useSearchParams().get("email");
  const [resendState, setResendState] = useState<ResendState>("idle");

  const handleResendEmail = async () => {
    if (!email) {
      return;
    }
    setResendState("sending");
    try {
      await authClient.sendVerificationEmail({
        callbackURL: "/auth/verify-email",
        email,
      });
      setResendState("sent");
    } catch {
      setResendState("failed");
    }
  };

  const isSending = resendState === "sending";

  return (
    <AuthStatus
      actions={
        <>
          {email && (
            <Button
              disabled={isSending}
              onClick={handleResendEmail}
              tone="primary"
              variant="solid"
            >
              {isSending && <Spinner data-icon="inline-start" size="xs" />}
              {isSending ? "Sending…" : "Resend verification email"}
            </Button>
          )}
          <p
            aria-live="polite"
            className="min-h-[1lh] text-muted-foreground text-sm"
          >
            {RESEND_MESSAGES[resendState]}
          </p>
          <ButtonLink render={<Link href="/" />} variant="surface">
            Back to home
          </ButtonLink>
        </>
      }
      icon={EnvelopeSimple}
      title="Check your inbox"
      tone="brand"
    >
      {email ? (
        <>
          We sent a verification link to{" "}
          <span className="break-all font-medium text-foreground">{email}</span>
          . Open it to activate your account. Can’t find it? Check your spam
          folder.
        </>
      ) : (
        "We sent you a verification link. Open it to activate your account. Can’t find it? Check your spam folder."
      )}
    </AuthStatus>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell className="flex justify-center">
          <Spinner size="lg" />
        </AuthPageShell>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
