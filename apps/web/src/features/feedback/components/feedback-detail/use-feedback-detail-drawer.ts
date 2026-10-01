import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useHotkeys } from "react-hotkeys-hook";
import { isCompositeWidgetFocused } from "./composite-widget-focus";

export function useDrawerFeedback(feedbackId: Id<"feedback"> | null) {
  return useQuery(
    api.feedback.queries.get,
    feedbackId ? { id: feedbackId } : "skip"
  );
}

function useNavigationHotkey(
  key: string,
  onNavigate: (() => void) | undefined,
  enabled: boolean
) {
  useHotkeys(
    key,
    () => {
      if (!isCompositeWidgetFocused()) {
        onNavigate?.();
      }
    },
    { enabled },
    [enabled, onNavigate]
  );
}

interface DrawerNavigationHotkeysOptions {
  hasNext: boolean;
  hasPrevious: boolean;
  isOpen: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function useDrawerNavigationHotkeys({
  hasNext,
  hasPrevious,
  isOpen,
  onNext,
  onPrevious,
}: DrawerNavigationHotkeysOptions) {
  const canGoNext = isOpen && hasNext;
  const canGoPrevious = isOpen && hasPrevious;

  useNavigationHotkey("j", onNext, canGoNext);
  useNavigationHotkey("k", onPrevious, canGoPrevious);
  useNavigationHotkey("ArrowDown", onNext, canGoNext);
  useNavigationHotkey("ArrowUp", onPrevious, canGoPrevious);
}
