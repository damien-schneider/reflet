import { useSyncExternalStore } from "react";
import type { CapturedImage } from "../../../feedback/types";
import type { ElementSelection, FeedbackContext } from "../../../types";
import type { SourceRequest } from "../route/dev-route";

export type StoredImage = Omit<CapturedImage, "objectUrl">;

export interface DevNote {
  /** Set by "Clear notes": hidden everywhere, restorable, deleted for good after a day. */
  archivedAt?: number;
  capturedContext: FeedbackContext;
  createdAt: number;
  id: string;
  note: string;
  selection: ElementSelection;
  sent?: { at: number; feedbackId: string };
  source: SourceRequest | null;
}

/** In-memory only: a reload drops it, so nothing can stay stuck "sending". */
export type NoteActivity = "locating" | "sending";

interface NotePayload {
  closeUp: StoredImage | null;
  noteId: string;
}

export interface NotesSnapshot {
  activity: Readonly<Record<string, NoteActivity>>;
  error: string | null;
  notes: DevNote[];
  status: "failed" | "loading" | "ready";
}

const DATABASE_NAME = "reflet-devtools";
const DATABASE_VERSION = 1;
const NOTES = "notes";
const PAYLOADS = "payloads";
const CHANGE_CHANNEL = "reflet-devtools-notes";
export const ARCHIVE_TTL_MS = 24 * 60 * 60 * 1000;
const SERVER_SNAPSHOT: NotesSnapshot = {
  activity: {},
  error: null,
  notes: [],
  status: "loading",
};

/** Executor form: the SDK targets ES2022, before `Promise.withResolvers`. */
function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(NOTES, { keyPath: "id" });
    request.result.createObjectStore(PAYLOADS, { keyPath: "noteId" });
  };
  return settle(request);
}

function newestFirst(notes: DevNote[]): DevNote[] {
  return [...notes].sort((a, b) => b.createdAt - a.createdAt);
}

export function isActiveNote(note: DevNote): boolean {
  return note.archivedAt === undefined;
}

export function isNoteOnPage(note: DevNote, pathname: string): boolean {
  const { url } = note.capturedContext;
  return url !== undefined && new URL(url).pathname === pathname;
}

/** Pin number of each note on this page, in the order they were written — pins and cards share it. */
export function pinNumbers(
  notes: DevNote[],
  pathname: string
): ReadonlyMap<string, number> {
  const onPage = notes
    .filter((note) => isActiveNote(note) && isNoteOnPage(note, pathname))
    .sort((a, b) => a.createdAt - b.createdAt);
  return new Map(onPage.map((note, index) => [note.id, index + 1]));
}

function describeFailure(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "IndexedDB is unavailable in this browser.";
}

type NotesChange = (notes: DevNote[]) => DevNote[];

export type NotePatch = (note: DevNote) => DevNote;

/**
 * The list is what IndexedDB holds with every in-flight change laid on top:
 * a change shows at once, a reload from another tab never drops it, and a
 * failed write simply leaves the overlay — the list never shows what did not
 * persist. Edits are field patches merged onto the stored note inside their
 * own transaction, so concurrent edits and lookups never overwrite each other
 * and never resurrect a deleted note.
 */
function createNoteStore() {
  let snapshot = SERVER_SNAPSHOT;
  let stored: DevNote[] = [];
  let pending: { change: NotesChange; token: symbol }[] = [];
  let database: Promise<IDBDatabase> | null = null;
  const listeners = new Set<() => void>();
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(CHANGE_CHANNEL);

  const publish = (next: Partial<NotesSnapshot>) => {
    const merged = { ...snapshot, ...next };
    const notes = pending.reduce((notes, { change }) => change(notes), stored);
    snapshot = { ...merged, notes: newestFirst(notes) };
    for (const listener of listeners) {
      listener();
    }
  };

  const connect = () => {
    database ??= openDatabase();
    return database;
  };

  /** Loads the notes and drops archives past their day, in one readwrite pass. */
  const reload = async () => {
    try {
      const transaction = (await connect()).transaction(
        [NOTES, PAYLOADS],
        "readwrite"
      );
      const all: DevNote[] = await settle(
        transaction.objectStore(NOTES).getAll()
      );
      const expiredBefore = Date.now() - ARCHIVE_TTL_MS;
      const isExpired = (note: DevNote) =>
        note.archivedAt !== undefined && note.archivedAt < expiredBefore;
      for (const note of all.filter(isExpired)) {
        transaction.objectStore(NOTES).delete(note.id);
        transaction.objectStore(PAYLOADS).delete(note.id);
      }
      await committed(transaction);
      stored = all.filter((note) => !isExpired(note));
      publish({ error: null, status: "ready" });
    } catch (error) {
      stored = [];
      publish({ error: describeFailure(error), status: "failed" });
    }
  };

  const mutate = async (
    change: NotesChange,
    storeNames: string[],
    write: (transaction: IDBTransaction) => void
  ) => {
    const token = Symbol("pending-note-change");
    const settleChange = (committedChange: NotesChange | null) => {
      if (committedChange) {
        stored = committedChange(stored);
      }
      pending = pending.filter((entry) => entry.token !== token);
      publish({});
    };
    pending = [...pending, { change, token }];
    publish({});
    try {
      const transaction = (await connect()).transaction(
        storeNames,
        "readwrite"
      );
      write(transaction);
      await committed(transaction);
      settleChange(change);
      channel?.postMessage("changed");
    } catch (error) {
      settleChange(null);
      throw new Error(describeFailure(error));
    }
  };

  const patchStoredNote = (
    transaction: IDBTransaction,
    noteId: string,
    patch: NotePatch
  ) => {
    const notes = transaction.objectStore(NOTES);
    const request = notes.get(noteId);
    request.onsuccess = () => {
      const current: DevNote | undefined = request.result;
      if (current) {
        notes.put(patch(current));
      }
    };
  };

  channel?.addEventListener("message", () => {
    reload();
  });

  return {
    add: (note: DevNote) =>
      mutate(
        (notes) => [...notes.filter((other) => other.id !== note.id), note],
        [NOTES, PAYLOADS],
        (transaction) => {
          transaction.objectStore(NOTES).put(note);
          transaction
            .objectStore(PAYLOADS)
            .put({ closeUp: null, noteId: note.id } satisfies NotePayload);
        }
      ),
    /** Stored only while the note still exists: a late close-up must not outlive its note. */
    attachCloseUp: async (noteId: string, closeUp: StoredImage) => {
      const transaction = (await connect()).transaction(
        [NOTES, PAYLOADS],
        "readwrite"
      );
      const request = transaction.objectStore(NOTES).getKey(noteId);
      request.onsuccess = () => {
        if (request.result !== undefined) {
          transaction
            .objectStore(PAYLOADS)
            .put({ closeUp, noteId } satisfies NotePayload);
        }
      };
      await committed(transaction);
    },
    getSnapshot: () => snapshot,
    patch: (noteIds: string | string[], patch: NotePatch) => {
      const ids = typeof noteIds === "string" ? [noteIds] : noteIds;
      return mutate(
        (notes) =>
          notes.map((note) => (ids.includes(note.id) ? patch(note) : note)),
        [NOTES],
        (transaction) => {
          for (const noteId of ids) {
            patchStoredNote(transaction, noteId, patch);
          }
        }
      );
    },
    readCloseUp: async (noteId: string): Promise<StoredImage | null> => {
      const store = (await connect())
        .transaction(PAYLOADS, "readonly")
        .objectStore(PAYLOADS);
      const payload: NotePayload | undefined = await settle(store.get(noteId));
      return payload?.closeUp ?? null;
    },
    remove: (noteIds: string[]) =>
      mutate(
        (notes) => notes.filter((note) => !noteIds.includes(note.id)),
        [NOTES, PAYLOADS],
        (transaction) => {
          for (const noteId of noteIds) {
            transaction.objectStore(NOTES).delete(noteId);
            transaction.objectStore(PAYLOADS).delete(noteId);
          }
        }
      ),
    setActivity: (noteId: string, activity: NoteActivity | null) => {
      const { [noteId]: _previous, ...others } = snapshot.activity;
      publish({
        activity: activity ? { ...others, [noteId]: activity } : others,
      });
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (snapshot === SERVER_SNAPSHOT) {
        reload();
      }
      return () => listeners.delete(listener);
    },
  };
}

export const noteStore = createNoteStore();

export function useNotes(): NotesSnapshot {
  return useSyncExternalStore(
    noteStore.subscribe,
    noteStore.getSnapshot,
    () => SERVER_SNAPSHOT
  );
}
