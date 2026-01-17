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
 * Helper atom to open auth dialog in a specific mode
 */
export const openAuthDialogAtom = atom(
  null,
  (_get, set, mode?: "signIn" | "signUp") => {
    set(authDialogModeAtom, mode ?? "signIn");
    set(authDialogOpenAtom, true);
  }
);

/**
 * Helper atom to close auth dialog
 */
export const closeAuthDialogAtom = atom(null, (_get, set) => {
  set(authDialogOpenAtom, false);
});
