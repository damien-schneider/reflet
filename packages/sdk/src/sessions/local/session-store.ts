import type {
  AddEvidenceBody,
  ContinuedIntentionRef,
  StartSessionBody,
} from "../api/session-api";
import type {
  SessionEvent,
  SessionGap,
  SessionGapReason,
  SessionSurface,
  SpeakerTurn,
} from "../protocol";

export interface SessionAccount {
  /** `${organizationId}:${userId}` */
  key: string;
  organizationName: string;
  userEmail: string | null;
  userName: string | null;
}

export interface LocalDraft {
  lastActiveAt: number;
  sessionId: string | null;
  sessionKey: string;
  startedAt: number;
  state: "recording" | "paused" | "interrupted" | "ended";
  title: string;
}

export interface StoredDraft extends Omit<LocalDraft, "state"> {
  accountKey: string;
  continues?: ContinuedIntentionRef;
  detectSpeakers?: boolean;
  gaps: SessionGap[];
  speakerLabelCount?: number;
  speakerReferences?: Record<string, string>;
  /** "cancelled" stays hidden until the outbox has deleted the session on Reflet. */
  state: LocalDraft["state"] | "cancelled";
  surface: SessionSurface;
}

export interface SyncSnapshot {
  blockedBy: "auth" | "storage" | null;
  isOnline: boolean;
  lastError: string | null;
  pendingBytes: number;
  pendingOperations: number;
}

export type PendingEvidence = Omit<AddEvidenceBody, "image" | "sessionId">;

export type OutboxPayload =
  | { body: StartSessionBody; kind: "start" }
  | {
      action: "pause" | "resume" | "end";
      atMs: number;
      kind: "collection";
      reason?: SessionGapReason;
    }
  | { clientKey: string; events: SessionEvent[]; kind: "events" }
  | { clientKey: string; kind: "speakers"; turns: SpeakerTurn[] }
  | {
      audio: Blob | null;
      clientKey: string;
      endMs: number;
      kind: "voice";
      startMs: number;
      storageId: string | null;
    }
  | {
      evidence: PendingEvidence;
      image: {
        blob: Blob | null;
        height: number;
        storageId: string | null;
        width: number;
      } | null;
      kind: "evidence";
    }
  | { kind: "analyze" }
  | { kind: "delete" };

export interface StoredOperation {
  accountKey: string;
  bytes: number;
  id: number;
  payload: OutboxPayload;
  sessionKey: string;
}

export type NewOperation = Omit<StoredOperation, "id">;

export interface SessionLocalStore {
  addOperation: (operation: NewOperation) => Promise<StoredOperation>;
  /** One write, so no drain pass sees the draft cancelled without its delete queued. */
  cancelDraft: (deletion: NewOperation) => Promise<void>;
  deleteDraft: (sessionKey: string) => Promise<void>;
  deleteOperations: (ids: number[]) => Promise<void>;
  patchDraft: (
    sessionKey: string,
    patch: Partial<Omit<StoredDraft, "accountKey" | "sessionKey">>
  ) => Promise<void>;
  purgeAccount: (accountKey: string) => Promise<void>;
  readDrafts: (accountKey: string) => Promise<StoredDraft[]>;
  readOperations: (accountKey: string) => Promise<StoredOperation[]>;
  replaceOperation: (operation: StoredOperation) => Promise<void>;
  writeDraft: (draft: StoredDraft) => Promise<void>;
}
