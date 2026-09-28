"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import { BASE64URL_SHA256 } from "@reflet/backend/convex/devtools/constants";
import { isAllowedRedirectUri } from "@reflet/backend/convex/devtools/redirect_uri";
import { useAction, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { H1, Muted } from "@/components/ui/typography";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";

interface ConnectDevtoolsContentProps {
  codeChallenge: string | null;
  publicKey: string | null;
  redirectUri: string | null;
  state: string | null;
}

interface ConnectRequest {
  codeChallenge: string;
  publicKey: string;
  redirectUri: string;
  serverOrigin: string;
  state: string;
}

function serverOriginFor(redirectUri: string | null): string | null {
  try {
    return redirectUri ? new URL(redirectUri).origin : null;
  } catch {
    return null;
  }
}

function authReturnPath(request: ConnectRequest) {
  const params = new URLSearchParams({
    code_challenge: request.codeChallenge,
    public_key: request.publicKey,
    redirect_uri: request.redirectUri,
    state: request.state,
  });
  return `/auth/devtools?${params}`;
}

type ConsentPhase = "idle" | "approving" | "redirecting" | "cancelled";

const CONNECT_TITLE = "Connect your dev server";

export function ConnectDevtoolsContent({
  codeChallenge,
  publicKey,
  redirectUri,
  state,
}: ConnectDevtoolsContentProps) {
  const serverOrigin = serverOriginFor(redirectUri);
  const linkIsComplete =
    serverOrigin !== null &&
    codeChallenge !== null &&
    publicKey !== null &&
    state !== null &&
    redirectUri !== null &&
    isAllowedRedirectUri(redirectUri) &&
    BASE64URL_SHA256.test(codeChallenge) &&
    BASE64URL_SHA256.test(state) &&
    publicKey.startsWith("fb_pub_");

  if (!linkIsComplete) {
    return (
      <ConnectNotice message="This connect link is invalid. Start again from the devtools Board tab." />
    );
  }

  return (
    <ConnectTarget
      request={{ codeChallenge, publicKey, redirectUri, serverOrigin, state }}
    />
  );
}

function ConnectTarget({ request }: { request: ConnectRequest }) {
  const target = useQuery(api.devtools.connect.getConnectTarget, {
    publicKey: request.publicKey,
  });

  if (target === undefined) {
    return (
      <ConnectShell>
        <ConnectProgress />
      </ConnectShell>
    );
  }

  if (target.kind === "signedOut") {
    return (
      <ConnectShell>
        <Muted>Sign in to connect your dev server.</Muted>
        <UnifiedAuthForm redirectTo={authReturnPath(request)} />
      </ConnectShell>
    );
  }
  if (target.kind === "unknownKey") {
    return <ConnectNotice message="This widget key isn't active on Reflet." />;
  }
  if (target.kind === "notMember") {
    return (
      <ConnectNotice message="You're not a member of the organization that owns this widget. Ask an admin to invite you." />
    );
  }
  return (
    <ConsentView organizationName={target.organizationName} request={request} />
  );
}

function ConsentView({
  organizationName,
  request,
}: {
  organizationName: string;
  request: ConnectRequest;
}) {
  const approve = useAction(api.devtools.connect.approve);
  const [phase, setPhase] = useState<ConsentPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  if (phase === "cancelled") {
    return (
      <ConnectNotice message="Nothing was connected. You can close this tab." />
    );
  }

  if (phase === "redirecting") {
    return (
      <ConnectShell>
        <ConnectProgress label="Redirecting to your dev server…" />
      </ConnectShell>
    );
  }

  const connectDevServer = async () => {
    setPhase("approving");
    setError(null);
    try {
      const { code } = await approve({
        codeChallenge: request.codeChallenge,
        publicKey: request.publicKey,
        redirectUri: request.redirectUri,
      });
      const callbackUrl = new URL(request.redirectUri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", request.state);
      setPhase("redirecting");
      window.location.assign(callbackUrl);
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Could not connect your dev server. Try again."
      );
      setPhase("idle");
    }
  };

  const isApproving = phase === "approving";

  return (
    <ConnectShell>
      <H1 className="mb-2" variant="page">
        {CONNECT_TITLE}
      </H1>
      <Muted className="mb-6">
        Reflet devtools on <strong>{request.serverOrigin}</strong> will read and
        add internal feedback on <strong>{organizationName}</strong>'s board as
        you. Only continue if you just clicked Connect in your own dev server.
      </Muted>
      {error && (
        <p className="mb-4 text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <Button
          disabled={isApproving}
          onClick={connectDevServer}
          tone="primary"
          variant="solid"
        >
          Connect
        </Button>
        <Button
          disabled={isApproving}
          onClick={() => setPhase("cancelled")}
          variant="surface"
        >
          Cancel
        </Button>
      </div>
    </ConnectShell>
  );
}

function ConnectNotice({ message }: { message: string }) {
  return (
    <ConnectShell>
      <H1 className="mb-2" variant="page">
        {CONNECT_TITLE}
      </H1>
      <Muted>{message}</Muted>
    </ConnectShell>
  );
}

function ConnectProgress({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner className="h-8 w-8" />
      {label && <Muted>{label}</Muted>}
    </div>
  );
}

function ConnectShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6 text-center">{children}</div>
    </div>
  );
}
