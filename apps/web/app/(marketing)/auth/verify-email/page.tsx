"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Muted } from "@/components/ui/typography";
import {
  AuthPageShell,
  AuthStatus,
} from "@/features/auth/components/auth-page-shell";
import { authClient } from "@/lib/auth-client";

const EXPIRED_LINK_MESSAGE =
  "This verification link is invalid or has expired. Request a new one below.";
const GENERIC_ERROR_MESSAGE =
  "We couldn’t verify your email. Request a new link below.";

function VerifyingState() {
  return (
    <AuthPageShell className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <Muted>Verifying your email…</Muted>
    </AuthPageShell>
  );
}

async function resendVerificationEmail(): Promise<string> {
  const session = await authClient.getSession();
  const email = session?.data?.user?.email;
  if (!email) {
    return "Sign in first, then request a new verification email.";
  }
  await authClient.sendVerificationEmail({
    callbackURL: "/auth/verify-email",
    email,
  });
  return `Email sent to ${email}. Check your inbox.`;
}

function ResendVerificationActions() {
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState("");

  const handleResendEmail = async () => {
    setIsSending(true);
    setStatus("");
    try {
      setStatus(await resendVerificationEmail());
    } catch {
      setStatus(
        "Unable to send the email. Check your connection and try again."
      );
    }
    setIsSending(false);
  };

  return (
    <>
      <Button
        disabled={isSending}
        onClick={handleResendEmail}
        tone="primary"
        variant="solid"
      >
        {isSending && <Spinner data-icon="inline-start" size="xs" />}
        {isSending ? "Sending…" : "Resend verification email"}
      </Button>
      <p
        aria-live="polite"
        className="min-h-[1lh] text-muted-foreground text-sm"
      >
        {status}
      </p>
      <ButtonLink render={<Link href="/" />} variant="surface">
        Back to home
      </ButtonLink>
    </>
  );
}

interface VerificationState {
  errorMessage: string | null;
  status: "loading" | "success" | "error";
}

function useEmailVerification(
  token: string | null,
  error: string | null
): VerificationState {
  const [verification, setVerification] = useState<VerificationState>({
    errorMessage: null,
    status: "loading",
  });

  useEffect(() => {
    if (error || !token) {
      return;
    }

    authClient
      .verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setVerification({
            errorMessage: result.error.message ?? GENERIC_ERROR_MESSAGE,
            status: "error",
          });
        } else {
          setVerification({ errorMessage: null, status: "success" });
        }
      })
      .catch(() => {
        setVerification({
          errorMessage: GENERIC_ERROR_MESSAGE,
          status: "error",
        });
      });
  }, [token, error]);

  const paramErrorMessage =
    error === "invalid_token" ? EXPIRED_LINK_MESSAGE : GENERIC_ERROR_MESSAGE;
  if (error) {
    return { errorMessage: paramErrorMessage, status: "error" };
  }
  if (!token) {
    return { errorMessage: null, status: "success" };
  }
  return verification;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { errorMessage, status } = useEmailVerification(
    searchParams.get("token"),
    searchParams.get("error")
  );

  if (status === "loading") {
    return <VerifyingState />;
  }

  if (status === "error") {
    return (
      <AuthStatus
        actions={<ResendVerificationActions />}
        icon={WarningCircle}
        title="Verification failed"
        tone="destructive"
      >
        {errorMessage ?? EXPIRED_LINK_MESSAGE}
      </AuthStatus>
    );
  }

  return (
    <AuthStatus
      actions={
        <ButtonLink
          render={<Link href="/pending-invitations" />}
          tone="primary"
          variant="solid"
        >
          Continue to dashboard
        </ButtonLink>
      }
      icon={CheckCircle}
      title="Email verified"
      tone="success"
    >
      Your email is verified. You now have full access to your account.
    </AuthStatus>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyingState />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
