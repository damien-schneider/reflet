const RESPONDENT_ID_STORAGE_KEY = "reflet:respondent-id";

let memoryRespondentId: string | null = null;

/** `crypto.randomUUID` only exists in secure contexts; plain-http intranet sites are not. */
const newRespondentId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

/**
 * A stable anonymous id per browser, so display frequency and sampling hold
 * across visits. Falls back to one id per page load when storage is blocked.
 */
export const getRespondentId = (): string => {
  try {
    const stored = window.localStorage.getItem(RESPONDENT_ID_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const created = newRespondentId();
    window.localStorage.setItem(RESPONDENT_ID_STORAGE_KEY, created);
    return created;
  } catch {
    memoryRespondentId ??= newRespondentId();
    return memoryRespondentId;
  }
};
