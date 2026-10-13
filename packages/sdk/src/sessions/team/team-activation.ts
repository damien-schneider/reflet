export const TEAM_ACTIVATION_PARAM = "reflet-team";
const STORAGE_KEY_PREFIX = "reflet-team-access:";

export function teamAccessStorageKey(publicKey: string): string {
  return `${STORAGE_KEY_PREFIX}${publicKey}`;
}

function readStoredExpiry(publicKey: string): number | null {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(teamAccessStorageKey(publicKey)) ?? "null"
    );
    if (
      typeof stored === "object" &&
      stored !== null &&
      "expiresAt" in stored &&
      typeof stored.expiresAt === "number"
    ) {
      return stored.expiresAt;
    }
    return null;
  } catch {
    return null;
  }
}

/** Zod-free on purpose: the widget calls this eagerly in every customer bundle before lazy-loading team tools. */
export function hasTeamActivation(publicKey: string): boolean {
  const expiresAt = readStoredExpiry(publicKey);
  return (
    (expiresAt !== null && expiresAt > Date.now()) ||
    new URL(window.location.href).searchParams.has(TEAM_ACTIVATION_PARAM)
  );
}
