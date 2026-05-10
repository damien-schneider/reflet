import { atom } from "jotai";

export const authDialogOpenAtom = atom(false);
export const authDialogModeAtom = atom<"signIn" | "signUp">("signIn");
export const authDialogMessageAtom = atom<string | null>(null);
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

export const closeAuthDialogAtom = atom(null, (_get, set) => {
  set(authDialogOpenAtom, false);
  set(authDialogMessageAtom, null);
});
