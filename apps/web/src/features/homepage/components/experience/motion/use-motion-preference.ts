"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia(REDUCED_MOTION_QUERY);
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function readMotionPreference() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function serverMotionPreference() {
  return false;
}

export function useMotionPreference() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    readMotionPreference,
    serverMotionPreference
  );
}
