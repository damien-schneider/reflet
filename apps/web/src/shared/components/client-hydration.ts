"use client";

import { useSyncExternalStore } from "react";

function unsubscribeFromClientSnapshot() {
  return undefined;
}

function subscribeToClientSnapshot() {
  return unsubscribeFromClientSnapshot;
}

function getClientHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

function getClientHostnameSnapshot() {
  return window.location.hostname;
}

function getServerHostnameSnapshot() {
  return null;
}

export function useClientHydrated() {
  return useSyncExternalStore(
    subscribeToClientSnapshot,
    getClientHydratedSnapshot,
    getServerHydratedSnapshot
  );
}

export function useClientHostname() {
  return useSyncExternalStore(
    subscribeToClientSnapshot,
    getClientHostnameSnapshot,
    getServerHostnameSnapshot
  );
}
