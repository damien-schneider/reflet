import { afterEach, describe, expect, test, vi } from "vitest";
import { isNonPublicIpAddress } from "../ip_ranges";
import {
  assertPublicHttpUrl,
  DnsResolutionUnavailableError,
  fetchPublicUrl,
  NonPublicUrlError,
} from "../public_fetch";

describe("isNonPublicIpAddress", () => {
  test.each([
    "127.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "[::1]",
    "::ffff:7f00:1",
    "::ffff:127.0.0.1",
    "::ffff:a9fe:a9fe",
    "64:ff9b::a9fe:a9fe",
    "2002:7f00:1::",
    "2002:a9fe:a9fe::1",
    "64:ff9b:1::a00:1",
    "2001:0:4136:e378::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "fec0::1",
    "feff::1",
    "100::1",
    "100::ffff:ffff:ffff:ffff",
    "2001:10::1",
    "2001:1f:ffff::1",
    "2001:20::1",
    "2001:2f::1",
    "ff02::1",
    "2001:db8::1",
    "1::2::3",
  ])("treats %s as non-public", (address) => {
    expect(isNonPublicIpAddress(address)).toBe(true);
  });

  test.each([
    "8.8.8.8",
    "172.15.255.255",
    "172.32.0.0",
    "100.63.255.255",
    "100.128.0.0",
    "169.253.255.255",
    "2606:4700:4700::1111",
    "::ffff:808:808",
    "2002:808:808::1",
    "2001:30::1",
    "100:0:0:1::1",
  ])("treats %s as public", (address) => {
    expect(isNonPublicIpAddress(address)).toBe(false);
  });

  test("returns null for hostnames", () => {
    expect(isNonPublicIpAddress("example.com")).toBeNull();
  });
});

describe("assertPublicHttpUrl", () => {
  test.each([
    "http://localhost:3000/hook",
    "http://LOCALHOST./hook",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://0x7f.0.0.1/",
    "http://0177.0.0.1/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/",
    "http://printer.local/",
    "http://intranet/",
    "https://user:pass@example.com/",
    "ftp://example.com/",
    "file:///etc/passwd",
    "not a url",
  ])("rejects %s", (url) => {
    expect(() => assertPublicHttpUrl(url)).toThrow(NonPublicUrlError);
  });

  test.each(["https://example.com/hook", "http://93.184.216.34:8080/health"])(
    "accepts %s",
    (url) => {
      expect(assertPublicHttpUrl(url).href).toBe(new URL(url).href);
    }
  );
});

const dnsAnswer = (address: string) =>
  Response.json({ Answer: [{ data: address, type: 1 }] });

describe("fetchPublicUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("rejects hostnames that resolve to a private address", async () => {
    const fetchMock = vi.fn(async (input: URL | string) =>
      String(input).startsWith("https://cloudflare-dns.com")
        ? dnsAnswer("10.0.0.5")
        : new Response("internal secrets")
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPublicUrl("https://rebind.example.com/")).rejects.toThrow(
      NonPublicUrlError
    );
    const requestedUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(
      requestedUrls.every((url) => url.startsWith("https://cloudflare-dns.com"))
    ).toBe(true);
  });

  test("rejects a redirect to an internal address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) =>
        String(input).startsWith("https://cloudflare-dns.com")
          ? dnsAnswer("93.184.216.34")
          : Response.redirect("http://169.254.169.254/latest", 302)
      )
    );

    await expect(fetchPublicUrl("https://example.com/")).rejects.toThrow(
      NonPublicUrlError
    );
  });

  test("returns the final response for public targets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) =>
        String(input).startsWith("https://cloudflare-dns.com")
          ? dnsAnswer("93.184.216.34")
          : new Response("ok", { status: 200 })
      )
    );

    const { response } = await fetchPublicUrl("https://example.com/");
    expect(await response.text()).toBe("ok");
  });

  test("reports an unreachable resolver distinctly from a private target", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) =>
        String(input).startsWith("https://cloudflare-dns.com")
          ? new Response("rate limited", { status: 429 })
          : new Response("ok")
      )
    );

    await expect(fetchPublicUrl("https://example.com/")).rejects.toThrow(
      DnsResolutionUnavailableError
    );
  });

  test("aborts a stalled resolver with the caller's signal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: URL | string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError"))
            );
          })
      )
    );

    await expect(
      fetchPublicUrl("https://example.com/", {
        signal: AbortSignal.timeout(20),
      })
    ).rejects.toThrow(DnsResolutionUnavailableError);
  });

  test("returns the redirect itself when following is disabled", async () => {
    const fetchMock = vi.fn(async (input: URL | string) =>
      String(input).startsWith("https://cloudflare-dns.com")
        ? dnsAnswer("93.184.216.34")
        : Response.redirect("https://other.example.org/hook", 307)
    );
    vi.stubGlobal("fetch", fetchMock);

    const { response } = await fetchPublicUrl(
      "https://example.com/",
      { method: "POST" },
      { followRedirects: false }
    );
    expect(response.status).toBe(307);
    const targetRequests = fetchMock.mock.calls.filter(
      ([input]) => !String(input).startsWith("https://cloudflare-dns.com")
    );
    expect(targetRequests).toHaveLength(1);
  });
});
