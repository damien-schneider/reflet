import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  finishTeamSignIn,
  forgetTeamAccess,
  hasTeamSignInReturn,
  prepareTeamSignIn,
  readTeamAccess,
  TeamSignInError,
} from "./team-auth";

const APP_URL = "https://www.reflet.app";
const API_URL = "https://api.reflet.test";
const PUBLIC_KEY = "fb_pub_widget";
const STORAGE_KEY = `reflet-team-access:${PUBLIC_KEY}`;
const TOKEN = `fb_team_${"a".repeat(64)}`;
const IN_A_WEEK = Date.now() + 7 * 24 * 60 * 60_000;

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(
    Response.json({
      expiresAt: IN_A_WEEK,
      organizationName: "Acme",
      token: TOKEN,
    })
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function leaveForConsent(path = "/billing?tab=invoices"): Promise<URL> {
  window.history.replaceState(null, "", path);
  return new URL(
    await prepareTeamSignIn({ appUrl: APP_URL, publicKey: PUBLIC_KEY })
  );
}

function comeBack(consent: URL, params: Record<string, string>): void {
  const back = new URL(consent.searchParams.get("return_to") ?? "");
  for (const [name, value] of Object.entries(params)) {
    back.searchParams.set(name, value);
  }
  window.history.replaceState(null, "", back.pathname + back.search);
}

const finish = () =>
  finishTeamSignIn({ apiUrl: API_URL, publicKey: PUBLIC_KEY });

describe("team sign-in", () => {
  it("sends the page to Reflet and back to where the member was, then trades the code with its verifier", async () => {
    const consent = await leaveForConsent();

    expect(consent.origin + consent.pathname).toBe(`${APP_URL}/auth/team`);
    expect(consent.searchParams.get("origin")).toBe(window.location.origin);
    expect(consent.searchParams.get("public_key")).toBe(PUBLIC_KEY);
    const returnTo = new URL(consent.searchParams.get("return_to") ?? "");
    expect(returnTo.pathname + returnTo.search).toBe(
      "/billing?tab=invoices&reflet-team="
    );

    comeBack(consent, {
      "reflet-team-code": "real-code",
      "reflet-team-state": consent.searchParams.get("state") ?? "",
    });
    expect(hasTeamSignInReturn()).toBe(true);
    const access = finish();

    expect(window.location.pathname + window.location.search).toBe(
      "/billing?tab=invoices&reflet-team="
    );
    expect(finish()).toBeNull();
    await expect(access).resolves.toEqual({
      expiresAt: IN_A_WEEK,
      organizationName: "Acme",
      token: TOKEN,
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${API_URL}/api/v1/team/token`);
    const body = JSON.parse(String(init?.body));
    expect(body.code).toBe("real-code");
    expect(await sha256Base64Url(body.codeVerifier)).toBe(
      consent.searchParams.get("code_challenge")
    );
    expect(readTeamAccess(PUBLIC_KEY)?.token).toBe(TOKEN);
  });

  it("refuses a code that comes back with another state, and keeps nothing", async () => {
    const consent = await leaveForConsent();
    comeBack(consent, {
      "reflet-team-code": "planted-code",
      "reflet-team-state": "someone-else",
    });

    await expect(finish()).rejects.toMatchObject({ reason: "interrupted" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readTeamAccess(PUBLIC_KEY)).toBeNull();
  });

  it("refuses a code that was not asked for from this tab", async () => {
    window.history.replaceState(
      null,
      "",
      "/?reflet-team&reflet-team-code=planted&reflet-team-state=abc"
    );

    await expect(finish()).rejects.toMatchObject({ reason: "interrupted" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a cancelled consent without calling Reflet", async () => {
    const consent = await leaveForConsent();
    comeBack(consent, {
      "reflet-team-error": "cancelled",
      "reflet-team-state": consent.searchParams.get("state") ?? "",
    });

    const cancelled = await finish()?.catch((error: unknown) => error);
    expect(cancelled).toBeInstanceOf(TeamSignInError);
    expect(cancelled).toMatchObject({ reason: "cancelled" });
    expect(window.location.search).toBe("?tab=invoices&reflet-team=");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains that sign-in cannot finish when the browser blocks storage", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    await expect(
      prepareTeamSignIn({ appUrl: APP_URL, publicKey: PUBLIC_KEY })
    ).rejects.toMatchObject({ reason: "storage_blocked" });
  });
});

describe("stored team access", () => {
  it("ignores and clears an expired access", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        expiresAt: Date.now() - 1,
        organizationName: "Acme",
        token: TOKEN,
      })
    );

    expect(readTeamAccess(PUBLIC_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("forgetting revokes the token on Reflet and clears it from the browser", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        expiresAt: IN_A_WEEK,
        organizationName: "Acme",
        token: TOKEN,
      })
    );
    fetchMock.mockResolvedValue(Response.json({ revoked: true }));

    await forgetTeamAccess({ apiUrl: API_URL, publicKey: PUBLIC_KEY });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/v1/team/revoke`,
      expect.objectContaining({
        headers: { Authorization: `Bearer ${TOKEN}` },
        method: "POST",
      })
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
