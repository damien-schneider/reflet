/** Executor form: the SDK targets ES2022, before `Promise.withResolvers`. */
export function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function openDatabase(options: {
  name: string;
  upgrade: (database: IDBDatabase) => void;
  version: number;
}): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB is unavailable in this browser.")
    );
  }
  const request = indexedDB.open(options.name, options.version);
  request.onupgradeneeded = () => options.upgrade(request.result);
  return settle(request);
}

const FAILURE_COPY_BY_NAME: Record<string, string> = {
  QuotaExceededError:
    "This device is out of storage space. Free some up, then try again.",
  SecurityError:
    "This browser blocks storage on this page, often in a private window or by site settings.",
};

export function describeStorageFailure(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "The browser cancelled the save without giving a reason.";
  }
  const name =
    "name" in error && typeof error.name === "string" ? error.name : "";
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  return FAILURE_COPY_BY_NAME[name] ?? (message || name || "Saving failed.");
}
