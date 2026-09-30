"use node";

import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { isNonPublicIpAddress } from "./ip_ranges";
import { assertPublicHttpUrl, NonPublicUrlError } from "./public_fetch";

const MAX_REDIRECTS = 3;
const IPV4_FAMILY = 4;
const IPV6_FAMILY = 6;
const BRACKETS_PATTERN = /^\[|\]$/g;

interface VettedAddress {
  address: string;
  family: number;
}

interface PinnedFetchOptions {
  headers: Record<string, string>;
  maxBytes: number;
  timeoutMs: number;
}

interface PinnedFetchResult {
  ok: boolean;
  status: number;
  text: string;
}

interface HopOptions {
  headers: Record<string, string>;
  maxBytes: number;
  signal: AbortSignal;
}

interface HopReply {
  location?: string;
  status: number;
  text: string;
}

export const resolvePublicAddress = async (
  hostname: string
): Promise<VettedAddress> => {
  const host = hostname.replace(BRACKETS_PATTERN, "");
  const literalIsNonPublic = isNonPublicIpAddress(host);
  if (literalIsNonPublic === false) {
    return {
      address: host,
      family: host.includes(":") ? IPV6_FAMILY : IPV4_FAMILY,
    };
  }
  if (literalIsNonPublic === true) {
    throw new NonPublicUrlError("URL must point to a public address");
  }
  const addresses = await lookup(host, { all: true }).catch(() => []);
  const [first] = addresses;
  if (!first) {
    throw new NonPublicUrlError(`Could not resolve ${host}`);
  }
  if (
    addresses.some(({ address }) => isNonPublicIpAddress(address) !== false)
  ) {
    throw new NonPublicUrlError("URL must point to a public address");
  }
  return first;
};

const pinTo =
  (vetted: VettedAddress): LookupFunction =>
  (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [vetted]);
      return;
    }
    callback(null, vetted.address, vetted.family);
  };

const collectBody = (
  response: IncomingMessage,
  maxBytes: number
): Promise<string> =>
  new Promise((resolve, reject) => {
    const decoder = new TextDecoder();
    let text = "";
    let bytesRead = 0;
    const finish = () => resolve(text + decoder.decode());
    response.on("data", (chunk: Buffer) => {
      const remaining = maxBytes - bytesRead;
      const kept =
        chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
      bytesRead += kept.byteLength;
      text += decoder.decode(kept, { stream: true });
      if (bytesRead >= maxBytes) {
        response.destroy();
        finish();
      }
    });
    response.on("end", finish);
    response.on("error", reject);
  });

const requestHop = (
  url: URL,
  vetted: VettedAddress,
  options: HopOptions
): Promise<HopReply> =>
  new Promise((resolve, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = send(
      url,
      {
        headers: options.headers,
        lookup: pinTo(vetted),
        signal: options.signal,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location =
          status >= 300 && status < 400 ? response.headers.location : undefined;
        if (location || status < 200 || status >= 300) {
          response.destroy();
          resolve({ location, status, text: "" });
          return;
        }
        collectBody(response, options.maxBytes).then(
          (text) => resolve({ status, text }),
          reject
        );
      }
    );
    request.on("error", reject);
    request.end();
  });

/**
 * Connects to the exact address that passed the public-IP check, closing the
 * DNS-rebinding gap left by `fetchPublicUrl`'s separate resolution step.
 */
export const fetchPublicUrlPinned = async (
  rawUrl: string,
  options: PinnedFetchOptions
): Promise<PinnedFetchResult> => {
  const signal = AbortSignal.timeout(options.timeoutMs);
  let url = assertPublicHttpUrl(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const vetted = await resolvePublicAddress(url.hostname);
    const reply = await requestHop(url, vetted, {
      headers: options.headers,
      maxBytes: options.maxBytes,
      signal,
    });
    if (!reply.location) {
      const ok = reply.status >= 200 && reply.status < 300;
      return { ok, status: reply.status, text: reply.text };
    }
    url = assertPublicHttpUrl(new URL(reply.location, url).href);
  }
  throw new NonPublicUrlError("Too many redirects");
};
