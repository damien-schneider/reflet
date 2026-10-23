import { z } from "zod";
import { type SessionApi, SessionApiError } from "../api/session-api";
import { uploadSessionBlob } from "../api/session-transports";
import type { SessionLimitKind } from "../protocol";
import type {
  OutboxPayload,
  SessionLocalStore,
  StoredOperation,
} from "./session-store";

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 504]);
const SMALL_OPERATION_BYTES = 256;

export type OperationOutcome =
  | { kind: "auth" }
  | { kind: "done" }
  | { kind: "drop"; message: string }
  | { kind: "limit"; limit: SessionLimitKind }
  | { kind: "retry"; message: string }
  | { kind: "sessionGone" }
  | { kind: "started"; sessionId: string };

interface OperationContext {
  api: SessionApi;
  operation: StoredOperation;
  sessionId: string;
  store: SessionLocalStore;
}

export function operationBytes(payload: OutboxPayload): number {
  switch (payload.kind) {
    case "voice":
      return payload.audio?.size ?? SMALL_OPERATION_BYTES;
    case "evidence":
      return (
        (payload.image?.blob?.size ?? 0) +
        JSON.stringify(payload.evidence).length +
        SMALL_OPERATION_BYTES
      );
    case "events":
      return JSON.stringify(payload.events).length;
    case "speakers":
      return JSON.stringify(payload.turns).length;
    default:
      return SMALL_OPERATION_BYTES;
  }
}

export function classifyFailure(error: unknown): OperationOutcome {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof z.ZodError) {
    return { kind: "drop", message: "Reflet sent an unexpected answer." };
  }
  if (!(error instanceof SessionApiError)) {
    return { kind: "retry", message };
  }
  if (error.status === 401) {
    return { kind: "auth" };
  }
  if (error.status === 404) {
    return { kind: "sessionGone" };
  }
  if (error.status === 413) {
    return { kind: "limit", limit: error.limit ?? "bytes" };
  }
  return RETRYABLE_STATUSES.has(error.status)
    ? { kind: "retry", message }
    : { kind: "drop", message };
}

/** Uploads once: the storage id is saved before the record that uses it, so a retry never re-uploads. */
async function uploadOnce(
  context: OperationContext,
  upload: {
    blob: Blob | null;
    kind: "audio" | "image";
    storageId: string | null;
  },
  remember: (storageId: string) => OutboxPayload
): Promise<string> {
  if (upload.storageId !== null) {
    return upload.storageId;
  }
  if (!upload.blob) {
    throw new Error("The recorded file is missing from this browser.");
  }
  const uploadUrl = await context.api.uploadUrl({
    kind: upload.kind,
    sessionId: context.sessionId,
  });
  const storageId = await uploadSessionBlob(uploadUrl, upload.blob);
  await context.store.replaceOperation({
    ...context.operation,
    bytes: SMALL_OPERATION_BYTES,
    payload: remember(storageId),
  });
  return storageId;
}

async function sendVoice(
  context: OperationContext,
  payload: Extract<OutboxPayload, { kind: "voice" }>
): Promise<void> {
  const audioStorageId = await uploadOnce(
    context,
    { blob: payload.audio, kind: "audio", storageId: payload.storageId },
    (storageId) => ({ ...payload, audio: null, storageId })
  );
  await context.api.addVoiceSegment({
    audioStorageId,
    clientKey: payload.clientKey,
    endMs: payload.endMs,
    sessionId: context.sessionId,
    startMs: payload.startMs,
  });
}

async function sendEvidence(
  context: OperationContext,
  payload: Extract<OutboxPayload, { kind: "evidence" }>
): Promise<void> {
  const { image } = payload;
  const storageId = image
    ? await uploadOnce(
        context,
        { blob: image.blob, kind: "image", storageId: image.storageId },
        (uploaded) => ({
          ...payload,
          image: { ...image, blob: null, storageId: uploaded },
        })
      )
    : null;
  await context.api.addEvidence({
    ...payload.evidence,
    image:
      image && storageId
        ? { height: image.height, storageId, width: image.width }
        : undefined,
    sessionId: context.sessionId,
  });
}

async function sendSessionOperation(
  context: OperationContext,
  payload: Exclude<OutboxPayload, { kind: "start" | "delete" }>
): Promise<OperationOutcome> {
  const { api, sessionId } = context;
  switch (payload.kind) {
    case "collection":
      await api.collection({
        action: payload.action,
        atMs: payload.atMs,
        reason: payload.reason,
        sessionId,
      });
      return { kind: "done" };
    case "events": {
      const result = await api.events({
        clientKey: payload.clientKey,
        events: payload.events,
        sessionId,
      });
      return result.limitReached
        ? { kind: "limit", limit: "events" }
        : { kind: "done" };
    }
    case "speakers":
      await api.addSpeakerTurns({
        clientKey: payload.clientKey,
        sessionId,
        turns: payload.turns,
      });
      return { kind: "done" };
    case "voice":
      await sendVoice(context, payload);
      return { kind: "done" };
    case "evidence":
      await sendEvidence(context, payload);
      return { kind: "done" };
    default:
      await api.analyze(sessionId);
      return { kind: "done" };
  }
}

export async function sendOperation(
  context: Omit<OperationContext, "sessionId"> & { sessionId: string | null }
): Promise<OperationOutcome> {
  const { payload } = context.operation;
  if (payload.kind === "start") {
    const session = await context.api.start(payload.body);
    return { kind: "started", sessionId: session.id };
  }
  if (payload.kind === "delete") {
    if (context.sessionId !== null) {
      await context.api.deleteSession(context.sessionId);
    }
    return { kind: "done" };
  }
  if (context.sessionId === null) {
    return {
      kind: "drop",
      message: "This session was never created on Reflet.",
    };
  }
  return await sendSessionOperation(
    { ...context, sessionId: context.sessionId },
    payload
  );
}
