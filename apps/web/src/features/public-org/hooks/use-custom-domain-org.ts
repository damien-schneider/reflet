"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

export function useCustomDomainOrg() {
  const [hostname, setHostname] = useState<string | null>(null);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const org = useQuery(
    api.domains.queries.getByCustomDomain,
    hostname ? { domain: hostname } : "skip"
  );

  return org;
}
