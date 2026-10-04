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
import { useEffect, useRef, useState } from "react";
import { convexErrorMessage } from "@/lib/convex-error-message";

type ConfirmState =
  | { status: "loading" }
  | { orgName: string; orgSlug: string; status: "success" }
  | { message: string; status: "error" };

const INCOMPLETE_LINK_MESSAGE =
  "This link is incomplete. Use the confirmation link from your email.";
const EXPIRED_LINK_MESSAGE =
  "This link may have expired. Send a new message to get a new one.";

export function ContactConfirmationPending() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3" role="status">
        <Spinner size="lg" />
        <p className="text-muted-foreground text-sm">Confirming…</p>
      </div>
    </main>
  );
}

export function ContactConfirmation() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<ConfirmState>(
    token
      ? { status: "loading" }
      : { message: INCOMPLETE_LINK_MESSAGE, status: "error" }
  );
  const confirmContact = useMutation(api.support.email.contacts.confirmContact);
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;
    confirmContact({ token })
      .then(({ orgName, orgSlug }) =>
        setState({ orgName, orgSlug, status: "success" })
      )
      .catch((error: unknown) =>
        setState({
          message: convexErrorMessage(error, EXPIRED_LINK_MESSAGE),
          status: "error",
        })
      );
  }, [token, confirmContact]);

  if (state.status === "loading") {
    return <ContactConfirmationPending />;
  }

  const isSuccess = state.status === "success";
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
            <h1>{isSuccess ? "Email confirmed" : "Couldn’t confirm"}</h1>
          </EmptyTitle>
          <EmptyDescription className="text-pretty">
            {isSuccess
              ? `We’ll email you when ${state.orgName} replies.`
              : state.message}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink
            render={
              <Link href={isSuccess ? `/${state.orgSlug}/support` : "/"} />
            }
            variant="surface"
          >
            {isSuccess ? "Go to support" : "Go to homepage"}
          </ButtonLink>
        </EmptyContent>
      </Empty>
    </main>
  );
}
