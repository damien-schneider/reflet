import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetTeamAccess,
  readTeamAccess,
  signInTeam,
  TeamSignInError,
} from "./team-auth";

const APP_URL = "https://www.reflet.app";
const API_URL = "https://api.reflet.test";
const PUBLIC_KEY = "fb_pub_widget";
const STORAGE_KEY = `reflet-team-access:${PUBLIC_KEY}`;
const TOKEN = `fb_team_${"a".repeat(64)}`;
const IN_A_WEEK = Date.now() + 7 * 24 * 60 * 60_000;

interface FakePopup {
  close: () => void;
  closed: boolean;
  location: { href: string };
}

let popup: FakePopup;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  popup = {
    close: () => {
      popup.closed = true;
    },
    closed: false,
    location: { href: "" },
  };
  vi.stubGlobal(
    "open",
    vi.fn(() => popup)
  );
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

async function openedConsent(): Promise<URL> {
  await vi.waitFor(() => expect(popup.location.href).not.toBe(""));
  return new URL(popup.location.href);
}

function postFromPopup(data: unknown, origin = APP_URL): void {
  window.dispatchEvent(new MessageEvent("message", { data, origin }));
}

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

const signIn = () =>
  signInTeam({ apiUrl: API_URL, appUrl: APP_URL, publicKey: PUBLIC_KEY });

describe("signInTeam", () => {
  it("only accepts the code from the Reflet origin with the matching state, then stores the exchanged access", async () => {
    const access = signIn();
    const consent = await openedConsent();
    const state = consent.searchParams.get("state");

    expect(consent.origin + consent.pathname).toBe(`${APP_URL}/auth/team`);
    expect(consent.searchParams.get("origin")).toBe(window.location.origin);
    expect(consent.searchParams.get("public_key")).toBe(PUBLIC_KEY);
    postFromPopup(
      { code: "forged", state, type: "reflet:team-access" },
      "https://evil.test"
    );
    postFromPopup({
      code: "replayed",
      state: "other",
      type: "reflet:team-access",
    });
    postFromPopup({ code: "real-code", state, type: "reflet:team-access" });

    await expect(access).resolves.toEqual({
      expiresAt: IN_A_WEEK,
      organizationName: "Acme",
      token: TOKEN,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${API_URL}/api/v1/team/token`);
    const body = JSON.parse(String(init?.body));
    expect(body.code).toBe("real-code");
    expect(await sha256Base64Url(body.codeVerifier)).toBe(
      consent.searchParams.get("code_challenge")
    );
    expect(readTeamAccess(PUBLIC_KEY)?.token).toBe(TOKEN);
  });

  it("rejects as cancelled when the member cancels in the popup", async () => {
    const cancelled = signIn();
    const consent = await openedConsent();
    postFromPopup({
      error: "cancelled",
      state: consent.searchParams.get("state"),
      type: "reflet:team-access",
    });

    await expect(cancelled).rejects.toMatchObject({ reason: "cancelled" });
  });

  it("rejects as cancelled when the member closes the popup", async () => {
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"],
    });
    const closed = signIn().catch((error: unknown) => error);
    await openedConsent();
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(2000);

    const error = await closed;
    expect(error).toBeInstanceOf(TeamSignInError);
    expect(error).toMatchObject({ reason: "cancelled" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readTeamAccess(PUBLIC_KEY)).toBeNull();
  });

  it("explains a blocked popup", async () => {
    vi.stubGlobal(
      "open",
      vi.fn(() => null)
    );
    await expect(signIn()).rejects.toMatchObject({ reason: "popup_blocked" });
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
