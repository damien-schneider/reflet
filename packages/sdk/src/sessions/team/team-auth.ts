import { z } from "zod";
import { sessionApiErrorSchema } from "../protocol";
import { TEAM_ACTIVATION_PARAM, teamAccessStorageKey } from "./team-activation";

const RETURN_CODE_PARAM = "reflet-team-code";
const RETURN_ERROR_PARAM = "reflet-team-error";
const RETURN_STATE_PARAM = "reflet-team-state";
const RETURN_PARAMS = [
  RETURN_CODE_PARAM,
  RETURN_ERROR_PARAM,
  RETURN_STATE_PARAM,
];
const PENDING_SIGN_IN_PREFIX = "reflet-team-sign-in:";
const PKCE_RANDOM_BYTES = 32;
const TRAILING_SLASHES = /\/+$/;
const BASE64_PADDING = /[=]+$/;

const teamAccessSchema = z.object({
  expiresAt: z.number(),
  organizationName: z.string(),
  token: z.string().startsWith("fb_team_"),
});

export type TeamAccess = z.infer<typeof teamAccessSchema>;

const pendingSignInSchema = z.object({
  codeVerifier: z.string(),
  state: z.string(),
});

type PendingSignIn = z.infer<typeof pendingSignInSchema>;

const SIGN_IN_FAILURE_MESSAGES = {
  cancelled: "Sign-in was cancelled.",
  exchange_failed: "Couldn't finish signing in to Reflet. Try again.",
  interrupted:
    "This sign-in was started in another tab or has expired. Sign in again.",
  storage_blocked:
    "Your browser blocks storage for this site, so Reflet sign-in can't finish. Allow site data, then try again.",
} as const;

export type TeamSignInFailure = keyof typeof SIGN_IN_FAILURE_MESSAGES;

export class TeamSignInError extends Error {
  readonly reason: TeamSignInFailure;

  constructor(reason: TeamSignInFailure, message?: string) {
    super(message ?? SIGN_IN_FAILURE_MESSAGES[reason]);
    this.name = "TeamSignInError";
    this.reason = reason;
  }
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(BASE64_PADDING, "");
}

function randomBase64Url(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(PKCE_RANDOM_BYTES)));
}

async function pkceChallengeFor(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  return base64Url(new Uint8Array(digest));
}

function apiEndpoint(apiUrl: string, path: string): string {
  return `${apiUrl.replace(TRAILING_SLASHES, "")}${path}`;
}

function parseStoredJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storedTeamAccess(publicKey: string): TeamAccess | null {
  try {
    const raw = localStorage.getItem(teamAccessStorageKey(publicKey));
    const parsed = teamAccessSchema.safeParse(
      raw === null ? null : parseStoredJson(raw)
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function persistTeamAccess(publicKey: string, access: TeamAccess | null): void {
  try {
    if (access) {
      localStorage.setItem(
        teamAccessStorageKey(publicKey),
        JSON.stringify(access)
      );
    } else {
      localStorage.removeItem(teamAccessStorageKey(publicKey));
    }
  } catch {
    // Storage disabled by browser policy: access then only lasts for this page.
  }
}

export function readTeamAccess(publicKey: string): TeamAccess | null {
  const access = storedTeamAccess(publicKey);
  if (access && access.expiresAt > Date.now()) {
    return access;
  }
  persistTeamAccess(publicKey, null);
  return null;
}

function pendingSignInKey(publicKey: string): string {
  return `${PENDING_SIGN_IN_PREFIX}${publicKey}`;
}

function takePendingSignIn(publicKey: string): PendingSignIn | null {
  try {
    const key = pendingSignInKey(publicKey);
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    const parsed = pendingSignInSchema.safeParse(
      raw === null ? null : parseStoredJson(raw)
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function rememberPendingSignIn(publicKey: string, pending: PendingSignIn) {
  try {
    sessionStorage.setItem(
      pendingSignInKey(publicKey),
      JSON.stringify(pending)
    );
  } catch {
    throw new TeamSignInError("storage_blocked");
  }
}

function returnUrl(): string {
  const url = new URL(window.location.href);
  for (const param of RETURN_PARAMS) {
    url.searchParams.delete(param);
  }
  if (!url.searchParams.has(TEAM_ACTIVATION_PARAM)) {
    url.searchParams.set(TEAM_ACTIVATION_PARAM, "");
  }
  return url.href;
}

async function exchangeCode(options: {
  apiUrl: string;
  code: string;
  codeVerifier: string;
}): Promise<TeamAccess> {
  const response = await fetch(
    apiEndpoint(options.apiUrl, "/api/v1/team/token"),
    {
      body: JSON.stringify({
        code: options.code,
        codeVerifier: options.codeVerifier,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
  if (!response.ok) {
    const failure = sessionApiErrorSchema.safeParse(
      await response.json().catch(() => null)
    );
    throw new TeamSignInError(
      "exchange_failed",
      failure.success ? failure.data.error : undefined
    );
  }
  const access = teamAccessSchema.safeParse(
    await response.json().catch(() => null)
  );
  if (!access.success) {
    throw new TeamSignInError("exchange_failed");
  }
  return access.data;
}

export async function prepareTeamSignIn(options: {
  appUrl: string;
  publicKey: string;
}): Promise<string> {
  const pending = { codeVerifier: randomBase64Url(), state: randomBase64Url() };
  rememberPendingSignIn(options.publicKey, pending);
  const consentUrl = new URL("/auth/team", options.appUrl);
  consentUrl.search = new URLSearchParams({
    code_challenge: await pkceChallengeFor(pending.codeVerifier),
    origin: window.location.origin,
    public_key: options.publicKey,
    return_to: returnUrl(),
    state: pending.state,
  }).toString();
  return consentUrl.href;
}

export function hasTeamSignInReturn(): boolean {
  return new URL(window.location.href).searchParams.has(RETURN_STATE_PARAM);
}

async function completeReturnedSignIn(options: {
  apiUrl: string;
  code: string | null;
  pending: PendingSignIn | null;
  publicKey: string;
  state: string;
}): Promise<TeamAccess> {
  if (options.pending?.state !== options.state) {
    throw new TeamSignInError("interrupted");
  }
  if (options.code === null) {
    throw new TeamSignInError("cancelled");
  }
  const access = await exchangeCode({
    apiUrl: options.apiUrl,
    code: options.code,
    codeVerifier: options.pending.codeVerifier,
  });
  persistTeamAccess(options.publicKey, access);
  return access;
}

/** Strips the returned code from the address bar at once, so it is consumed by one caller only. */
export function finishTeamSignIn(options: {
  apiUrl: string;
  publicKey: string;
}): Promise<TeamAccess> | null {
  const url = new URL(window.location.href);
  const state = url.searchParams.get(RETURN_STATE_PARAM);
  if (state === null) {
    return null;
  }
  const code = url.searchParams.get(RETURN_CODE_PARAM);
  for (const param of RETURN_PARAMS) {
    url.searchParams.delete(param);
  }
  window.history.replaceState(window.history.state, "", url.href);
  return completeReturnedSignIn({
    apiUrl: options.apiUrl,
    code,
    pending: takePendingSignIn(options.publicKey),
    publicKey: options.publicKey,
    state,
  });
}

export async function forgetTeamAccess(options: {
  apiUrl: string;
  publicKey: string;
}): Promise<void> {
  const access = storedTeamAccess(options.publicKey);
  persistTeamAccess(options.publicKey, null);
  if (!access) {
    return;
  }
  await fetch(apiEndpoint(options.apiUrl, "/api/v1/team/revoke"), {
    headers: { Authorization: `Bearer ${access.token}` },
    method: "POST",
  });
}
