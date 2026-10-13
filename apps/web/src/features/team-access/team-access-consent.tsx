"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  CheckCircle,
  type Icon,
  UsersThree,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { BASE64URL_SHA256 } from "@reflet/backend/convex/devtools/constants";
import {
  TEAM_ORIGIN_PROBLEM_MESSAGES,
  type TeamOriginProblem,
} from "@reflet/backend/convex/team_access/origin";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { H1, Muted } from "@/components/ui/typography";
import {
  AuthPageShell,
  AuthStatus,
} from "@/features/auth/components/auth-page-shell";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";
import {
  deliverTeamAccess,
  isSameOriginUrl,
  readOpener,
  type TeamAccessOutcome,
} from "./team-access-delivery";

const RETURN_URL_MAX_LENGTH = 2000;
const NO_OPENER_MESSAGE =
  "Open this page with Sign in with Reflet in your app’s team tools. It can’t reach your app from here.";
const ORIGIN_PROBLEM_TITLES = {
  invalid: "Invalid sign-in link",
  no_allowed_domains: "Team tools aren’t enabled for this app",
  not_allowed: "Team tools aren’t enabled for this app",
} as const satisfies Record<TeamOriginProblem, string>;

const teamAccessRequestSchema = z
  .object({
    code_challenge: z.string().regex(BASE64URL_SHA256),
    origin: z.string().min(1).max(500),
    public_key: z.string().startsWith("fb_pub_").max(200),
    return_to: z.string().max(RETURN_URL_MAX_LENGTH).optional(),
    state: z.string().regex(BASE64URL_SHA256),
  })
  .refine(
    (params) =>
      params.return_to === undefined ||
      isSameOriginUrl(params.return_to, params.origin)
  )
  .transform((params) => ({
    codeChallenge: params.code_challenge,
    origin: params.origin,
    publicKey: params.public_key,
    returnTo: params.return_to ?? null,
    state: params.state,
  }));

type TeamAccessRequest = z.infer<typeof teamAccessRequestSchema>;

const subscribeToNothing = () => () => undefined;

export function TeamAccessConsent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = teamAccessRequestSchema.safeParse(searchParams);
  if (!parsed.success) {
    return (
      <TeamAccessNotice
        icon={WarningCircle}
        message={TEAM_ORIGIN_PROBLEM_MESSAGES.invalid}
        title={ORIGIN_PROBLEM_TITLES.invalid}
      />
    );
  }
  return <TeamAccessGate request={parsed.data} />;
}

function TeamAccessGate({ request }: { request: TeamAccessRequest }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) {
    return <TeamAccessProgress />;
  }
  if (!isAuthenticated) {
    const returnParams = new URLSearchParams({
      code_challenge: request.codeChallenge,
      origin: request.origin,
      public_key: request.publicKey,
      state: request.state,
      ...(request.returnTo && { return_to: request.returnTo }),
    });
    return (
      <AuthPageShell>
        <Muted className="mb-4 text-center">
          Sign in to Reflet to use team tools in your app.
        </Muted>
        <UnifiedAuthForm redirectTo={`/auth/team?${returnParams}`} />
      </AuthPageShell>
    );
  }
  return <TeamAccessTarget request={request} />;
}

function TeamAccessTarget({ request }: { request: TeamAccessRequest }) {
  const target = useQuery(api.team_access.connect.getTarget, {
    origin: request.origin,
    publicKey: request.publicKey,
  });

  if (target === undefined) {
    return <TeamAccessProgress />;
  }
  if (target === null) {
    return (
      <TeamAccessNotice
        icon={WarningCircle}
        message="This app’s Reflet key isn’t active. Ask the app’s developers to check its Reflet setup."
        title="Team tools unavailable"
      />
    );
  }
  if (!target.isMember) {
    return (
      <TeamAccessNotice
        icon={UsersThree}
        message={`You’re not a member of ${target.organizationName} on Reflet. Ask an admin to invite you, or sign in with another account.`}
        title="Members only"
      />
    );
  }
  if (target.originProblem) {
    return (
      <TeamAccessNotice
        icon={WarningCircle}
        message={TEAM_ORIGIN_PROBLEM_MESSAGES[target.originProblem]}
        title={ORIGIN_PROBLEM_TITLES[target.originProblem]}
      />
    );
  }
  return (
    <ConsentView
      organizationName={target.organizationName}
      origin={target.origin}
      request={request}
    />
  );
}

type ConsentPhase =
  | "idle"
  | "approving"
  | "signedIn"
  | "cancelled"
  | "noOpener";

interface ConsentTarget {
  organizationName: string;
  origin: string;
  request: TeamAccessRequest;
}

interface ConsentDecision {
  allow: () => Promise<void>;
  cancel: () => void;
  error: string | null;
  phase: ConsentPhase;
}

function useConsentDecision({
  origin,
  request,
}: ConsentTarget): ConsentDecision {
  const approve = useAction(api.team_access.connect.approve);
  const [phase, setPhase] = useState<ConsentPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const deliver = (outcome: TeamAccessOutcome) =>
    deliverTeamAccess(
      { origin, returnTo: request.returnTo, state: request.state },
      outcome
    );

  const allow = async () => {
    setPhase("approving");
    setError(null);
    try {
      const { code } = await approve({
        codeChallenge: request.codeChallenge,
        origin,
        publicKey: request.publicKey,
      });
      setPhase(deliver({ code }) === "unreachable" ? "noOpener" : "signedIn");
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Couldn’t sign you in. Try again."
      );
      setPhase("idle");
    }
  };

  const cancel = () => {
    deliver({ error: "cancelled" });
    setPhase("cancelled");
  };

  return { allow, cancel, error, phase };
}

function AfterDecision({
  phase,
  target,
}: {
  phase: "signedIn" | "cancelled";
  target: ConsentTarget;
}) {
  const host = new URL(target.origin).host;
  const next = target.request.returnTo
    ? `Taking you back to ${host}…`
    : "You can close this window.";
  if (phase === "signedIn") {
    return (
      <AuthStatus icon={CheckCircle} title="Signed in" tone="success">
        You’re signed in on {host}. {next}
      </AuthStatus>
    );
  }
  return (
    <AuthStatus icon={XCircle} title="Nothing was shared" tone="brand">
      Team tools stay signed out. {next}
    </AuthStatus>
  );
}

function ConsentView(target: ConsentTarget) {
  const decision = useConsentDecision(target);
  const hasOpener = useSyncExternalStore(
    subscribeToNothing,
    () => readOpener() !== null,
    () => true
  );
  const canReachApp = target.request.returnTo !== null || hasOpener;

  if (decision.phase === "noOpener" || !canReachApp) {
    return (
      <TeamAccessNotice
        icon={WarningCircle}
        message={NO_OPENER_MESSAGE}
        title="Open this from your app"
      />
    );
  }
  if (decision.phase === "signedIn" || decision.phase === "cancelled") {
    return <AfterDecision phase={decision.phase} target={target} />;
  }
  return <ConsentPrompt decision={decision} target={target} />;
}

function ConsentPrompt({
  decision,
  target,
}: {
  decision: ConsentDecision;
  target: ConsentTarget;
}) {
  const user = useQuery(api.auth.queries.getCurrentUser);
  const userLabel = user?.name || user?.email;

  return (
    <AuthPageShell className="text-center">
      <H1 className="mb-2 text-balance break-words" variant="page">
        Use Reflet team tools on {target.origin}?
      </H1>
      <Muted className="mb-2 text-pretty">
        <strong>{target.organizationName}</strong>
        {userLabel ? ` · Signed in as ${userLabel}` : null}
      </Muted>
      <Muted className="mb-6 text-pretty">
        Record sessions on this app under your name. Nothing is shared with the
        app’s users.
      </Muted>
      <p
        className="mb-4 min-h-[1lh] text-destructive-text text-sm"
        role="alert"
      >
        {decision.error}
      </p>
      <ConsentActions decision={decision} />
    </AuthPageShell>
  );
}

function ConsentActions({ decision }: { decision: ConsentDecision }) {
  const isApproving = decision.phase === "approving";
  return (
    <div className="flex flex-col gap-3">
      <Button
        disabled={isApproving}
        onClick={decision.allow}
        tone="primary"
        variant="solid"
      >
        {isApproving && <Spinner data-icon="inline-start" size="xs" />}
        {isApproving ? "Allowing…" : "Allow"}
      </Button>
      <Button
        disabled={isApproving}
        onClick={decision.cancel}
        variant="surface"
      >
        Cancel
      </Button>
    </div>
  );
}

function TeamAccessNotice({
  icon,
  message,
  title,
}: {
  icon: Icon;
  message: string;
  title: string;
}) {
  return (
    <AuthStatus icon={icon} title={title} tone="destructive">
      {message}
    </AuthStatus>
  );
}

function TeamAccessProgress() {
  return (
    <AuthPageShell className="flex justify-center">
      <Spinner aria-label="Loading" size="lg" />
    </AuthPageShell>
  );
}
