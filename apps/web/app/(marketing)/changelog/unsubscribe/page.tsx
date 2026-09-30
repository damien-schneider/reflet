"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type UnsubscribeStatus = "loading" | "success" | "error";

const MISSING_TOKEN_MESSAGE =
  "This link is missing its token. Use the unsubscribe link from your latest changelog email.";

function UnsubscribePending() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3" role="status">
        <Spinner size="lg" />
        <p className="text-muted-foreground text-sm">Unsubscribing…</p>
      </div>
    </main>
  );
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<UnsubscribeStatus>(
    token ? "loading" : "error"
  );
  const [errorMessage, setErrorMessage] = useState<string>(
    MISSING_TOKEN_MESSAGE
  );
  const unsubscribeByToken = useMutation(
    api.changelog.subscriptions.unsubscribeByToken
  );
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;

    unsubscribeByToken({ token })
      .then(() => setStatus("success"))
      .catch((error: unknown) => {
        setStatus("error");
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "This link may have expired. Use the link from your latest changelog email."
        );
      });
  }, [token, unsubscribeByToken]);

  if (status === "loading") {
    return <UnsubscribePending />;
  }

  const isSuccess = status === "success";

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia>
            {isSuccess ? (
              <CheckCircle
                aria-hidden="true"
                className="size-10 text-success-text"
                weight="duotone"
              />
            ) : (
              <WarningCircle
                aria-hidden="true"
                className="size-10 text-destructive-text"
                weight="duotone"
              />
            )}
          </EmptyMedia>
          <EmptyTitle>
            <h1>
              {isSuccess ? "You’re unsubscribed" : "Couldn’t unsubscribe"}
            </h1>
          </EmptyTitle>
          <EmptyDescription className="text-pretty">
            {isSuccess
              ? "You won’t get changelog emails from this product anymore."
              : errorMessage}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink render={<Link href="/" />} variant="surface">
            Go to homepage
          </ButtonLink>
        </EmptyContent>
      </Empty>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribePending />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
