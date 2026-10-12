import type { OutboxPayload, StoredOperation } from "./session-store";

/** WebKit private windows refuse Blobs in IndexedDB, so recordings are stored as raw bytes. */
interface StoredBytes {
  bytes: ArrayBuffer;
  type: string;
}

type VoicePayload = Extract<OutboxPayload, { kind: "voice" }>;
type EvidencePayload = Extract<OutboxPayload, { kind: "evidence" }>;
type EvidenceImage = NonNullable<EvidencePayload["image"]>;

type StoredPayload =
  | Exclude<OutboxPayload, { kind: "voice" | "evidence" }>
  | (Omit<VoicePayload, "audio"> & { audio: StoredBytes | null })
  | (Omit<EvidencePayload, "image"> & {
      image:
        | (Omit<EvidenceImage, "blob"> & { blob: StoredBytes | null })
        | null;
    });

export type StoredRow<Operation> = Omit<Operation, "payload"> & {
  payload: StoredPayload;
};

async function toBytes(blob: Blob | null): Promise<StoredBytes | null> {
  return blob ? { bytes: await blob.arrayBuffer(), type: blob.type } : null;
}

function toBlob(stored: StoredBytes | null): Blob | null {
  return stored ? new Blob([stored.bytes], { type: stored.type }) : null;
}

async function packPayload(payload: OutboxPayload): Promise<StoredPayload> {
  if (payload.kind === "voice") {
    return { ...payload, audio: await toBytes(payload.audio) };
  }
  if (payload.kind === "evidence" && payload.image) {
    const blob = await toBytes(payload.image.blob);
    return { ...payload, image: { ...payload.image, blob } };
  }
  if (payload.kind === "evidence") {
    return { ...payload, image: null };
  }
  return payload;
}

function unpackPayload(payload: StoredPayload): OutboxPayload {
  if (payload.kind === "voice") {
    return { ...payload, audio: toBlob(payload.audio) };
  }
  if (payload.kind === "evidence" && payload.image) {
    const blob = toBlob(payload.image.blob);
    return { ...payload, image: { ...payload.image, blob } };
  }
  if (payload.kind === "evidence") {
    return { ...payload, image: null };
  }
  return payload;
}

export async function packOperation<
  Operation extends Omit<StoredOperation, "id">,
>(operation: Operation): Promise<StoredRow<Operation>> {
  return { ...operation, payload: await packPayload(operation.payload) };
}

export function unpackOperation(
  row: StoredRow<StoredOperation>
): StoredOperation {
  return { ...row, payload: unpackPayload(row.payload) };
}
