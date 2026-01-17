import { atom } from "jotai";

/**
 * Local UI state for the dashboard
 */

// Sidebar state
export const sidebarOpenAtom = atom(true);

// Recent organizations (for history/switcher)
export const recentOrgSlugsAtom = atom<string[]>([]);

// Current board being viewed (if any)
export const currentBoardIdAtom = atom<string | null>(null);

// Dialog states
export const showCreateBoardDialogAtom = atom(false);
export const showCreateOrgDialogAtom = atom(false);
