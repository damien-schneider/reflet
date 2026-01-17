import { atom } from "jotai";

// ============================================
// UI STORE
// ============================================

/**
 * Sidebar collapsed state
 */
export const sidebarCollapsedAtom = atom(false);

/**
 * Mobile sidebar open state
 */
export const mobileSidebarOpenAtom = atom(false);

/**
 * Theme preference
 */
export const themeAtom = atom<"light" | "dark" | "system">("system");
