import { useState } from "react";
import { SHEET_TABS, type SheetTab } from "./devtools-bar";

const TAB_KEY = "reflet-devtools-sheet-tab";
export const FIRST_SHEET_TAB: SheetTab = "inbox";

function readStoredTab(): SheetTab {
  try {
    const stored = localStorage.getItem(TAB_KEY);
    return SHEET_TABS.find((tab) => tab === stored) ?? FIRST_SHEET_TAB;
  } catch {
    return FIRST_SHEET_TAB;
  }
}

function storeTab(tab: SheetTab) {
  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {
    // Blocked storage only costs the remembered tab on the next reload.
  }
}

/** The panel reopens where it was left, across reloads. */
export function useSheetTab() {
  const [openTab, setOpenTab] = useState<SheetTab | null>(null);
  const [lastTab, setLastTab] = useState(readStoredTab);
  return {
    close: () => setOpenTab(null),
    lastTab,
    openTab,
    select: (tab: SheetTab) => {
      setOpenTab(tab);
      setLastTab(tab);
      storeTab(tab);
    },
  };
}
