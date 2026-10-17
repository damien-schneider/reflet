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
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";
import {
  CONNECT_COPY,
  type ConnectClient,
  DESKTOP_APP_CLIENT_PARAM,
} from "./connect-devtools-copy";

interface ConnectDevtoolsContentProps {
  client: string | null;
  codeChallenge: string | null;
  publicKey: string | null;
  redirectUri: string | null;
  state: string | null;
}

interface ConnectRequest {
  client: ConnectClient;
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
  if (request.client === "desktopApp") {
    params.set("client", DESKTOP_APP_CLIENT_PARAM);
  }
  return `/auth/devtools?${params}`;
}

type ConsentPhase = "idle" | "approving" | "redirecting" | "cancelled";

export function ConnectDevtoolsContent({
  client: clientParam,
  codeChallenge,
  publicKey,
  redirectUri,
  state,
}: ConnectDevtoolsContentProps) {
  const client: ConnectClient =
    clientParam === DESKTOP_APP_CLIENT_PARAM ? "desktopApp" : "devServer";
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
      <ConnectNotice
        client={client}
        message={CONNECT_COPY[client].invalidLink}
      />
    );
  }

  return (
    <ConnectTarget
      request={{
        client,
        codeChallenge,
        publicKey,
        redirectUri,
        serverOrigin,
        state,
      }}
    />
  );
}

function ConnectTarget({ request }: { request: ConnectRequest }) {
  const target = useQuery(api.devtools.connect.getConnectTarget, {
    publicKey: request.publicKey,
  });
  const copy = CONNECT_COPY[request.client];

  if (target === undefined) {
    return (
      <ConnectShell>
        <ConnectProgress />
      </ConnectShell>
    );
  }

  if (target.kind === "signedOut") {
    return (
      <AuthPageShell>
        <Muted className="text-center">{copy.signIn}</Muted>
        <UnifiedAuthForm redirectTo={authReturnPath(request)} />
      </AuthPageShell>
    );
  }
  if (target.kind === "unknownKey") {
    return <ConnectNotice client={request.client} message={copy.unknownKey} />;
  }
  if (target.kind === "notMember") {
    return (
      <ConnectNotice
        client={request.client}
        message="You're not a member of the organization that owns this widget. Ask an admin to invite you."
      />
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
  const copy = CONNECT_COPY[request.client];

  if (phase === "cancelled") {
    return (
      <ConnectNotice
        client={request.client}
        message="Nothing was connected. You can close this tab."
      />
    );
  }

  if (phase === "redirecting") {
    return (
      <ConnectShell>
        <ConnectProgress label={copy.redirecting} />
      </ConnectShell>
    );
  }

  const approveConnect = async () => {
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
          : copy.approveFailed
      );
      setPhase("idle");
    }
  };

  const isApproving = phase === "approving";

  return (
    <ConnectShell>
      <H1 className="mb-2" variant="page">
        {copy.title}
      </H1>
      <Muted className="mb-6 text-pretty">
        {copy.consent({ organizationName, serverOrigin: request.serverOrigin })}
      </Muted>
      <p
        className="mb-4 min-h-[1lh] text-destructive-text text-sm"
        role="alert"
      >
        {error}
      </p>
      <div className="flex flex-col gap-3">
        <Button
          disabled={isApproving}
          onClick={approveConnect}
          tone="primary"
          variant="solid"
        >
          {isApproving && <Spinner data-icon="inline-start" size="xs" />}
          {isApproving ? copy.approvingLabel : copy.approveLabel}
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

function ConnectNotice({
  client,
  message,
}: {
  client: ConnectClient;
  message: string;
}) {
  return (
    <ConnectShell>
      <H1 className="mb-2" variant="page">
        {CONNECT_COPY[client].title}
      </H1>
      <Muted>{message}</Muted>
    </ConnectShell>
  );
}

function ConnectProgress({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      {label && <Muted aria-live="polite">{label}</Muted>}
    </div>
  );
}

function ConnectShell({ children }: { children: ReactNode }) {
  return <AuthPageShell className="text-center">{children}</AuthPageShell>;
}
