import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { afterEach, describe, expect, test, vi } from "vitest";
import { NonPublicUrlError } from "../public_fetch";
import {
  fetchPublicUrlPinned,
  resolvePublicAddress,
} from "../public_fetch_node";

const dns = vi.hoisted(() => ({ lookup: vi.fn() }));
const https = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("node:dns/promises", () => dns);
vi.mock("node:https", () => https);

interface FakeReply {
  body?: string;
  headers?: Record<string, string>;
  status: number;
}

type PinnedLookup = (
  hostname: string,
  options: { all?: boolean },
  callback: (error: Error | null, address: string, family: number) => void
) => void;

const connectedAddresses: string[] = [];

const serveReplies = (replies: FakeReply[]) => {
  https.request.mockImplementation(
    (
      _url: URL,
      options: { lookup: PinnedLookup },
      onResponse: (response: Readable) => void
    ) => {
      const request = Object.assign(new EventEmitter(), {
        end: () => {
          options.lookup("ignored", {}, (_error, address) => {
            connectedAddresses.push(address);
          });
          const reply = replies.shift() ?? { status: 500 };
          const response = Object.assign(
            Readable.from([Buffer.from(reply.body ?? "")]),
            { headers: reply.headers ?? {}, statusCode: reply.status }
          );
          onResponse(response);
        },
      });
      return request;
    }
  );
};

const resolveTo = (records: Record<string, string[]>) => {
  dns.lookup.mockImplementation(async (hostname: string) =>
    (records[hostname] ?? []).map((address) => ({ address, family: 4 }))
  );
};

const options = { headers: {}, maxBytes: 1000, timeoutMs: 5000 };

afterEach(() => {
  vi.resetAllMocks();
  connectedAddresses.length = 0;
});

describe("resolvePublicAddress", () => {
  test.each([
    ["loopback", ["127.0.0.1"]],
    ["private", ["10.0.0.7"]],
    ["mixed public and private", ["93.184.216.34", "10.0.0.7"]],
  ])("rejects a hostname resolving to %s addresses", async (_label, ips) => {
    resolveTo({ "rebind.example.com": ips });

    await expect(resolvePublicAddress("rebind.example.com")).rejects.toThrow(
      NonPublicUrlError
    );
  });

  test("accepts a hostname resolving only to public addresses", async () => {
    resolveTo({ "docs.example.com": ["93.184.216.34"] });

    await expect(resolvePublicAddress("docs.example.com")).resolves.toEqual({
      address: "93.184.216.34",
      family: 4,
    });
  });

  test("rejects a hostname that does not resolve", async () => {
    dns.lookup.mockRejectedValue(new Error("ENOTFOUND"));

    await expect(resolvePublicAddress("missing.example.com")).rejects.toThrow(
      "Could not resolve missing.example.com"
    );
  });
});

describe("fetchPublicUrlPinned", () => {
  test("connects to the vetted address even if DNS changes afterwards", async () => {
    dns.lookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    serveReplies([{ body: "<title>Docs</title>", status: 200 }]);

    const result = await fetchPublicUrlPinned(
      "https://docs.example.com/",
      options
    );

    expect(result).toEqual({
      ok: true,
      status: 200,
      text: "<title>Docs</title>",
    });
    expect(connectedAddresses).toEqual(["93.184.216.34"]);
  });

  test("rejects a redirect to a host resolving to a private address", async () => {
    resolveTo({
      "docs.example.com": ["93.184.216.34"],
      "internal.example.com": ["10.0.0.7"],
    });
    serveReplies([
      { headers: { location: "https://internal.example.com/" }, status: 302 },
      { body: "internal secrets", status: 200 },
    ]);

    await expect(
      fetchPublicUrlPinned("https://docs.example.com/", options)
    ).rejects.toThrow("URL must point to a public address");
    expect(connectedAddresses).toEqual(["93.184.216.34"]);
  });

  test("truncates the body at maxBytes", async () => {
    resolveTo({ "docs.example.com": ["93.184.216.34"] });
    serveReplies([{ body: "abcdefgh", status: 200 }]);

    const result = await fetchPublicUrlPinned("https://docs.example.com/", {
      ...options,
      maxBytes: 3,
    });

    expect(result.text).toBe("abc");
  });
});
