import { committed, openDatabase, settle } from "../../storage/indexed-db";
import type {
  SessionLocalStore,
  StoredDraft,
  StoredOperation,
} from "./session-store";
import {
  packOperation,
  type StoredRow,
  unpackOperation,
} from "./stored-payload";

const DATABASE_NAME = "reflet-sessions";
const DATABASE_VERSION = 1;
const DRAFTS = "drafts";
const OPERATIONS = "operations";
const BY_ACCOUNT = "by_account";

interface SessionDatabase {
  readAccount: <T>(storeName: string, accountKey: string) => Promise<T[]>;
  transaction: (storeNames: string[]) => Promise<IDBTransaction>;
  write: (
    storeNames: string[],
    run: (transaction: IDBTransaction) => void
  ) => Promise<void>;
}

function createSessionsSchema(database: IDBDatabase): void {
  database
    .createObjectStore(DRAFTS, { keyPath: "sessionKey" })
    .createIndex(BY_ACCOUNT, "accountKey");
  database
    .createObjectStore(OPERATIONS, { autoIncrement: true, keyPath: "id" })
    .createIndex(BY_ACCOUNT, "accountKey");
}

function connectSessionDatabase(): SessionDatabase {
  let database: Promise<IDBDatabase> | null = null;
  const connect = () => {
    database ??= openDatabase({
      name: DATABASE_NAME,
      upgrade: createSessionsSchema,
      version: DATABASE_VERSION,
    }).catch((error: unknown) => {
      database = null;
      throw error;
    });
    return database;
  };
  const transaction = async (storeNames: string[]) =>
    (await connect()).transaction(storeNames, "readwrite");

  return {
    readAccount: async (storeName, accountKey) =>
      await settle(
        (await connect())
          .transaction(storeName, "readonly")
          .objectStore(storeName)
          .index(BY_ACCOUNT)
          .getAll(accountKey)
      ),
    transaction,
    write: async (storeNames, run) => {
      const opened = await transaction(storeNames);
      run(opened);
      await committed(opened);
    },
  };
}

function deleteAccountRows(
  transaction: IDBTransaction,
  storeName: string,
  accountKey: string
): void {
  const store = transaction.objectStore(storeName);
  const request = store.index(BY_ACCOUNT).getAllKeys(accountKey);
  request.onsuccess = () => {
    for (const key of request.result) {
      store.delete(key);
    }
  };
}

function draftMethods(database: SessionDatabase) {
  return {
    deleteDraft: (sessionKey: string) =>
      database.write([DRAFTS], (transaction) => {
        transaction.objectStore(DRAFTS).delete(sessionKey);
      }),
    patchDraft: (sessionKey: string, patch: Partial<StoredDraft>) =>
      database.write([DRAFTS], (transaction) => {
        const drafts = transaction.objectStore(DRAFTS);
        const request = drafts.get(sessionKey);
        request.onsuccess = () => {
          const current: StoredDraft | undefined = request.result;
          if (current) {
            drafts.put({ ...current, ...patch });
          }
        };
      }),
    purgeAccount: (accountKey: string) =>
      database.write([DRAFTS, OPERATIONS], (transaction) => {
        deleteAccountRows(transaction, DRAFTS, accountKey);
        deleteAccountRows(transaction, OPERATIONS, accountKey);
      }),
    readDrafts: (accountKey: string) =>
      database.readAccount<StoredDraft>(DRAFTS, accountKey),
    writeDraft: (draft: StoredDraft) =>
      database.write([DRAFTS], (transaction) => {
        transaction.objectStore(DRAFTS).put(draft);
      }),
  } satisfies Partial<SessionLocalStore>;
}

function operationMethods(database: SessionDatabase) {
  return {
    addOperation: async (operation: Omit<StoredOperation, "id">) => {
      const row = await packOperation(operation);
      const transaction = await database.transaction([OPERATIONS]);
      const request = transaction.objectStore(OPERATIONS).add(row);
      await committed(transaction);
      if (typeof request.result !== "number") {
        throw new Error("IndexedDB returned no operation id.");
      }
      return { ...operation, id: request.result };
    },
    deleteOperations: (ids: number[]) =>
      database.write([OPERATIONS], (transaction) => {
        for (const id of ids) {
          transaction.objectStore(OPERATIONS).delete(id);
        }
      }),
    readOperations: async (accountKey: string) =>
      (
        await database.readAccount<StoredRow<StoredOperation>>(
          OPERATIONS,
          accountKey
        )
      )
        .map(unpackOperation)
        .sort((a, b) => a.id - b.id),
    replaceOperation: async (operation: StoredOperation) => {
      const row = await packOperation(operation);
      await database.write([OPERATIONS], (transaction) => {
        const operations = transaction.objectStore(OPERATIONS);
        const request = operations.getKey(operation.id);
        request.onsuccess = () => {
          if (request.result !== undefined) {
            operations.put(row);
          }
        };
      });
    },
  } satisfies Partial<SessionLocalStore>;
}

export function createIndexedSessionStore(): SessionLocalStore {
  const database = connectSessionDatabase();
  return { ...draftMethods(database), ...operationMethods(database) };
}
