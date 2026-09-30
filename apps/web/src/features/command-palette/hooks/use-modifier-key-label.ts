"use client";

import { useSyncExternalStore } from "react";

const APPLE_PLATFORM = /mac|iphone|ipad/i;
const subscribeToNothing = () => () => undefined;

export function useModifierKeyLabel(): string {
  return useSyncExternalStore(
    subscribeToNothing,
    () => (APPLE_PLATFORM.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "⌘"
  );
}
