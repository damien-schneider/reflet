"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";

function UnsubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get("token");
  const unsubscribeMutation = useMutation(
    api.changelog_subscriptions.unsubscribeByToken
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid unsubscribe link. Please check your email.");
      return;
    }

    unsubscribeMutation({ token })
      .then(() => {
        setStatus("success");
      })
      .catch((error: Error) => {
        setStatus("error");
        setErrorMessage(
          error.message ?? "An error occurred while unsubscribing."
        );
      });
  }, [token, unsubscribeMutation]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <Muted>Processing...</Muted>
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
            Unsubscribe failed
          </H1>
          <Muted className="mb-6">
            {errorMessage ?? "The unsubscribe link is invalid or has expired."}
          </Muted>
          <Button onClick={() => router.push("/")} variant="outline">
            Back to home
          </Button>
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
          Unsubscribed
        </H1>
        <Muted className="mb-6">
          You have been successfully unsubscribed from changelog updates. You
          will no longer receive email notifications.
        </Muted>
        <Button className="w-full" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
