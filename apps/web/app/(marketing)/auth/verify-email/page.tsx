"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    // If there's an error in the URL, show it
    if (error) {
      setStatus("error");
      setErrorMessage(
        error === "invalid_token"
          ? "The verification link is invalid or has expired."
          : "An error occurred during verification."
      );
      return;
    }

    // If there's a token, verify it
    if (token) {
      authClient
        .verifyEmail({
          query: { token },
        })
        .then((result) => {
          if (result.error) {
            setStatus("error");
            setErrorMessage(
              result.error.message ?? "An error occurred during verification."
            );
          } else {
            setStatus("success");
          }
        })
        .catch(() => {
          setStatus("error");
          setErrorMessage("An error occurred during verification.");
        });
    } else {
      // No token and no error - check if user is already verified
      setStatus("success");
    }
  }, [token, error]);

  const handleContinue = () => {
    router.push("/pending-invitations");
  };

  const handleResendEmail = async () => {
    const session = await authClient.getSession();
    if (session?.data?.user?.email) {
      try {
        await authClient.sendVerificationEmail({
          email: session.data.user.email,
          callbackURL: "/auth/verify-email",
        });
        setErrorMessage("A new verification email has been sent.");
      } catch {
        setErrorMessage("Unable to send email. Please try again.");
      }
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <Muted>Verifying...</Muted>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                aria-label="Error icon"
                className="h-8 w-8 text-red-600"
                fill="none"
                role="img"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
          <H1 className="mb-2" variant="page">
            Verification failed
          </H1>
          <Muted className="mb-6">
            {errorMessage ?? "The verification link is invalid or has expired."}
          </Muted>
          <div className="flex flex-col gap-3">
            <Button onClick={handleResendEmail} variant="default">
              Resend verification email
            </Button>
            <Button onClick={() => router.push("/")} variant="outline">
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              aria-label="Success icon"
              className="h-8 w-8 text-green-600"
              fill="none"
              role="img"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>
        <H1 className="mb-2" variant="page">
          Email verified
        </H1>
        <Muted className="mb-6">
          Your email address has been successfully verified. You can now access
          all features of your account.
        </Muted>
        <Button className="w-full" onClick={handleContinue}>
          Continue to dashboard
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
