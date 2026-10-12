import { z } from "zod";
import { sessionApiErrorSchema } from "../protocol";
import { teamAccessStorageKey } from "./team-activation";

const TEAM_ACCESS_MESSAGE_TYPE = "reflet:team-access";
const POPUP_NAME = "reflet-team-access";
const POPUP_WIDTH_PX = 480;
const POPUP_HEIGHT_PX = 680;
const POPUP_CLOSED_POLL_MS = 500;
const SIGN_IN_TIMEOUT_MS = 5 * 60_000;
const PKCE_RANDOM_BYTES = 32;
const TRAILING_SLASHES = /\/+$/;
const BASE64_PADDING = /[=]+$/;

const teamAccessSchema = z.object({
  expiresAt: z.number(),
  organizationName: z.string(),
  token: z.string().startsWith("fb_team_"),
});

export type TeamAccess = z.infer<typeof teamAccessSchema>;

const teamAccessMessageSchema = z.union([
  z.object({
    code: z.string().min(1),
    state: z.string(),
    type: z.literal(TEAM_ACCESS_MESSAGE_TYPE),
  }),
  z.object({
    error: z.literal("cancelled"),
    state: z.string(),
    type: z.literal(TEAM_ACCESS_MESSAGE_TYPE),
  }),
]);

const SIGN_IN_FAILURE_MESSAGES = {
  cancelled: "Sign-in was cancelled.",
  exchange_failed: "Couldn't finish signing in to Reflet. Try again.",
  popup_blocked:
    "Your browser blocked the Reflet sign-in window. Allow pop-ups for this site, then try again.",
  timeout: "Signing in took too long. Try again.",
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

function centeredPopupFeatures(): string {
  const left = Math.round(
    window.screenX + (window.outerWidth - POPUP_WIDTH_PX) / 2
  );
  const top = Math.round(
    window.screenY + (window.outerHeight - POPUP_HEIGHT_PX) / 2
  );
  return `popup,width=${POPUP_WIDTH_PX},height=${POPUP_HEIGHT_PX},left=${left},top=${top}`;
}

function waitForApprovedCode(options: {
  appOrigin: string;
  popup: Window;
  state: string;
}): Promise<string> {
  // Executor form: the SDK targets ES2022, before `Promise.withResolvers`.
  return new Promise((resolve, reject) => {
    const listening = new AbortController();
    let closedOnLastPoll = false;
    const settle = (outcome: { code: string } | TeamSignInError) => {
      listening.abort();
      window.clearInterval(closedPoll);
      window.clearTimeout(timeout);
      if (outcome instanceof TeamSignInError) {
        reject(outcome);
      } else {
        resolve(outcome.code);
      }
    };
    const closedPoll = window.setInterval(() => {
      if (closedOnLastPoll) {
        settle(new TeamSignInError("cancelled"));
      }
      closedOnLastPoll = options.popup.closed;
    }, POPUP_CLOSED_POLL_MS);
    const timeout = window.setTimeout(() => {
      options.popup.close();
      settle(new TeamSignInError("timeout"));
    }, SIGN_IN_TIMEOUT_MS);
    window.addEventListener(
      "message",
      (event: MessageEvent) => {
        if (event.origin !== options.appOrigin) {
          return;
        }
        const message = teamAccessMessageSchema.safeParse(event.data);
        if (message.success && message.data.state === options.state) {
          settle(
            "code" in message.data
              ? { code: message.data.code }
              : new TeamSignInError("cancelled")
          );
        }
      },
      { signal: listening.signal }
    );
  });
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

/** Call from a click handler: the popup opens before anything is awaited so browsers don't block it. */
export async function signInTeam(options: {
  apiUrl: string;
  appUrl: string;
  publicKey: string;
}): Promise<TeamAccess> {
  const popup = window.open("about:blank", POPUP_NAME, centeredPopupFeatures());
  if (!popup) {
    throw new TeamSignInError("popup_blocked");
  }
  const codeVerifier = randomBase64Url();
  const state = randomBase64Url();
  const consentUrl = new URL("/auth/team", options.appUrl);
  consentUrl.search = new URLSearchParams({
    code_challenge: await pkceChallengeFor(codeVerifier),
    origin: window.location.origin,
    public_key: options.publicKey,
    state,
  }).toString();
  popup.location.href = consentUrl.href;

  const code = await waitForApprovedCode({
    appOrigin: consentUrl.origin,
    popup,
    state,
  });
  const access = await exchangeCode({
    apiUrl: options.apiUrl,
    code,
    codeVerifier,
  });
  persistTeamAccess(options.publicKey, access);
  return access;
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
