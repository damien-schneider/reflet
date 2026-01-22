import { atom } from "jotai";

// ============================================
// AUTH STORE
// ============================================

/**
 * Dialog visibility state for auth modal
 */
export const authDialogOpenAtom = atom(false);

/**
 * Which form to show in the auth dialog
 */
export const authDialogModeAtom = atom<"signIn" | "signUp">("signIn");

/**
 * Custom message to show in the auth dialog (e.g., explaining why auth is required)
 */
export const authDialogMessageAtom = atom<string | null>(null);

/**
 * Helper atom to open auth dialog in a specific mode with optional message
 */
export const openAuthDialogAtom = atom(
  null,
  (
    _get,
    set,
    options?:
      | { mode?: "signIn" | "signUp"; message?: string }
      | "signIn"
      | "signUp"
  ) => {
    if (typeof options === "string") {
      set(authDialogModeAtom, options);
      set(authDialogMessageAtom, null);
    } else {
      set(authDialogModeAtom, options?.mode ?? "signIn");
      set(authDialogMessageAtom, options?.message ?? null);
    }
    set(authDialogOpenAtom, true);
  }
);

/**
 * Helper atom to close auth dialog
 */
export const closeAuthDialogAtom = atom(null, (_get, set) => {
  set(authDialogOpenAtom, false);
  set(authDialogMessageAtom, null);
});
