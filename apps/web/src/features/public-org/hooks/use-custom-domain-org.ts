"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useSyncExternalStore } from "react";

const subscribeToHostname = () => () => undefined;
const getHostname = () => window.location.hostname;
const getServerHostname = () => null;

export function useCustomDomainOrg() {
  const hostname = useSyncExternalStore(
    subscribeToHostname,
    getHostname,
    getServerHostname
  );

  const org = useQuery(
    api.domains.queries.getByCustomDomain,
    hostname ? { domain: hostname } : "skip"
  );

  return org;
}
