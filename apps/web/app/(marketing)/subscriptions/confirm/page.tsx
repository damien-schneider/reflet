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

type ConfirmStatus = "loading" | "success" | "error";

const INVALID_LINK_MESSAGE =
  "This link is incomplete. Use the confirmation link from your email.";

const SUCCESS_MESSAGES = {
  changelog: "You’ll get an email when a release ships.",
  status: "You’re subscribed to status updates.",
} as const;

function ConfirmPending() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3" role="status">
        <Spinner size="lg" />
        <p className="text-muted-foreground text-sm">Confirming…</p>
      </div>
    </main>
  );
}

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const listParam = searchParams.get("list");
  const list =
    listParam === "changelog" || listParam === "status" ? listParam : null;
  const [status, setStatus] = useState<ConfirmStatus>(
    token && list ? "loading" : "error"
  );
  const [errorMessage, setErrorMessage] =
    useState<string>(INVALID_LINK_MESSAGE);
  const confirmChangelog = useMutation(
    api.changelog.subscriptions.confirmByToken
  );
  const confirmStatus = useMutation(api.status.subscriptions.confirm);
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!(token && list) || requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;

    const confirm = list === "changelog" ? confirmChangelog : confirmStatus;
    confirm({ token })
      .then(() => setStatus("success"))
      .catch((error: unknown) => {
        setStatus("error");
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "This link may have expired. Subscribe again to get a new one."
        );
      });
  }, [token, list, confirmChangelog, confirmStatus]);

  if (status === "loading") {
    return <ConfirmPending />;
  }

  if (status === "success" && list) {
    return <ConfirmResult isSuccess message={SUCCESS_MESSAGES[list]} />;
  }
  return <ConfirmResult isSuccess={false} message={errorMessage} />;
}

function ConfirmResult({
  isSuccess,
  message,
}: {
  isSuccess: boolean;
  message: string;
}) {
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
            <h1>{isSuccess ? "Subscription confirmed" : "Couldn’t confirm"}</h1>
          </EmptyTitle>
          <EmptyDescription className="text-pretty">{message}</EmptyDescription>
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

export default function ConfirmSubscriptionPage() {
  return (
    <Suspense fallback={<ConfirmPending />}>
      <ConfirmContent />
    </Suspense>
  );
}
