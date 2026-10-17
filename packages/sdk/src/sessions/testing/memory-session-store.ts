import type {
  NewOperation,
  SessionLocalStore,
  StoredDraft,
  StoredOperation,
} from "../local/session-store";

class MemorySessionStore implements SessionLocalStore {
  private readonly drafts = new Map<string, StoredDraft>();
  private nextId = 1;
  private readonly operations = new Map<number, StoredOperation>();

  addOperation = (operation: NewOperation): Promise<StoredOperation> => {
    const stored = { ...operation, id: this.nextId };
    this.nextId += 1;
    this.operations.set(stored.id, stored);
    return Promise.resolve(stored);
  };

  cancelDraft = async (deletion: NewOperation): Promise<void> => {
    await Promise.all([
      this.patchDraft(deletion.sessionKey, { state: "cancelled" }),
      this.addOperation(deletion),
    ]);
  };

  deleteDraft = (sessionKey: string): Promise<void> => {
    this.drafts.delete(sessionKey);
    return Promise.resolve();
  };

  deleteOperations = (ids: number[]): Promise<void> => {
    for (const id of ids) {
      this.operations.delete(id);
    }
    return Promise.resolve();
  };

  patchDraft = (
    sessionKey: string,
    patch: Partial<StoredDraft>
  ): Promise<void> => {
    const current = this.drafts.get(sessionKey);
    if (current) {
      this.drafts.set(sessionKey, { ...current, ...patch });
    }
    return Promise.resolve();
  };

  purgeAccount = (accountKey: string): Promise<void> => {
    for (const [key, draft] of this.drafts) {
      if (draft.accountKey === accountKey) {
        this.drafts.delete(key);
      }
    }
    for (const [id, operation] of this.operations) {
      if (operation.accountKey === accountKey) {
        this.operations.delete(id);
      }
    }
    return Promise.resolve();
  };

  readDrafts = (accountKey: string): Promise<StoredDraft[]> =>
    Promise.resolve(
      [...this.drafts.values()].filter(
        (draft) => draft.accountKey === accountKey
      )
    );

  readOperations = (accountKey: string): Promise<StoredOperation[]> =>
    Promise.resolve(
      [...this.operations.values()]
        .filter((operation) => operation.accountKey === accountKey)
        .sort((a, b) => a.id - b.id)
    );

  replaceOperation = (operation: StoredOperation): Promise<void> => {
    if (this.operations.has(operation.id)) {
      this.operations.set(operation.id, operation);
    }
    return Promise.resolve();
  };

  writeDraft = (draft: StoredDraft): Promise<void> => {
    this.drafts.set(draft.sessionKey, draft);
    return Promise.resolve();
  };
}

export function createMemorySessionStore(): SessionLocalStore {
  return new MemorySessionStore();
}
