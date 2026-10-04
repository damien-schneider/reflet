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

const INVALID_LINK_MESSAGE =
  "This link is incomplete. Use the unsubscribe link from your latest email.";

const EXPIRED_LINK_MESSAGE =
  "This link may have expired. Use the unsubscribe link from your latest email.";

const SUCCESS_MESSAGES = {
  changelog: "You won’t get changelog emails from this product anymore.",
  status: "You won’t get status updates from this product anymore.",
} as const;

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
  const listParam = searchParams.get("list");
  const list =
    listParam === "changelog" || listParam === "status" ? listParam : null;
  const [status, setStatus] = useState<UnsubscribeStatus>(
    token && list ? "loading" : "error"
  );
  const [errorMessage, setErrorMessage] =
    useState<string>(INVALID_LINK_MESSAGE);
  const unsubscribeChangelog = useMutation(
    api.changelog.subscriptions.unsubscribeByToken
  );
  const unsubscribeStatus = useMutation(api.status.subscriptions.unsubscribe);
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!(token && list) || requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;

    const unsubscribe = async () => {
      if (list === "changelog") {
        await unsubscribeChangelog({ token });
        return;
      }
      const { success } = await unsubscribeStatus({ token });
      if (!success) {
        throw new Error(EXPIRED_LINK_MESSAGE);
      }
    };
    unsubscribe()
      .then(() => setStatus("success"))
      .catch((error: unknown) => {
        setStatus("error");
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : EXPIRED_LINK_MESSAGE
        );
      });
  }, [token, list, unsubscribeChangelog, unsubscribeStatus]);

  if (status === "loading") {
    return <UnsubscribePending />;
  }

  if (status === "success" && list) {
    return <UnsubscribeResult isSuccess message={SUCCESS_MESSAGES[list]} />;
  }
  return <UnsubscribeResult isSuccess={false} message={errorMessage} />;
}

function UnsubscribeResult({
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
            <h1>
              {isSuccess ? "You’re unsubscribed" : "Couldn’t unsubscribe"}
            </h1>
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

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribePending />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
