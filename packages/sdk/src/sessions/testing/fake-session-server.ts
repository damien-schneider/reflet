import { vi } from "vitest";
import { createSessionApi, type SessionApi } from "../api/session-api";
import type { SessionApiPath } from "../api-paths";

export const SESSION_SUMMARY = {
  analysis: {
    analyzedRevision: null,
    error: null,
    proposalCount: null,
    state: "idle",
    transcriptRevision: 0,
    updatedAt: null,
  },
  authorName: "Ada",
  collection: "recording",
  counts: {
    evidence: 0,
    failedSegments: 0,
    handoffs: 0,
    kept: 0,
    pendingSegments: 0,
    proposals: 0,
    segments: 0,
  },
  durationMs: 0,
  endedAt: null,
  id: "session-1",
  isMine: true,
  startedAt: 1000,
  surface: "devtools",
  title: "Checkout",
  visibility: "private",
};

const SEGMENT = {
  audioExpiresAt: null,
  context: [],
  contextAmbiguous: false,
  endMs: 0,
  hasAudio: true,
  id: "segment-1",
  language: null,
  revision: 0,
  source: "voice",
  startMs: 0,
  text: "",
  textOrigin: "transcription",
  transcription: { attempts: 0, error: null, state: "pending" },
};

const EVIDENCE = {
  atMs: 0,
  element: null,
  frame: null,
  id: "evidence-1",
  image: null,
  kind: "screenshot",
  link: null,
  missingReason: null,
  note: null,
  status: "available",
  trigger: "start",
};

export interface RecordedCall {
  body: unknown;
  path: SessionApiPath;
}

function readClientKey(body: unknown): string {
  return typeof body === "object" && body !== null && "clientKey" in body
    ? String(body.clientKey)
    : "session";
}

function respond(path: SessionApiPath, body: unknown): unknown {
  switch (path) {
    case "/api/v1/sessions/start":
    case "/api/v1/sessions/collection":
      return {
        session: { ...SESSION_SUMMARY, id: `id-${readClientKey(body)}` },
      };
    case "/api/v1/sessions/events":
      return { accepted: 1, dropped: 0, limitReached: false };
    case "/api/v1/sessions/upload-url":
      return { uploadUrl: "https://upload.test/blob" };
    case "/api/v1/sessions/segments":
      return { segment: SEGMENT };
    case "/api/v1/sessions/evidence":
      return { evidence: EVIDENCE };
    case "/api/v1/sessions/analyze":
      return { analysis: SESSION_SUMMARY.analysis };
    default:
      return null;
  }
}

export interface FakeSessionServer {
  api: SessionApi;
  calls: RecordedCall[];
  callsTo: (path: SessionApiPath) => unknown[];
  failNext: (path: SessionApiPath, error: Error) => void;
}

export function createFakeSessionServer(): FakeSessionServer {
  const calls: RecordedCall[] = [];
  const failures = new Map<SessionApiPath, Error[]>();
  const api = createSessionApi({
    request: async ({ body, path, schema }) => {
      calls.push({ body, path });
      await Promise.resolve();
      const failure = failures.get(path)?.shift();
      if (failure) {
        throw failure;
      }
      return schema.parse(respond(path, body));
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ storageId: "storage-1" }))
  );
  return {
    api,
    calls,
    callsTo: (path: SessionApiPath) =>
      calls.filter((call) => call.path === path).map((call) => call.body),
    failNext: (path: SessionApiPath, error: Error) => {
      failures.set(path, [...(failures.get(path) ?? []), error]);
    },
  };
}
