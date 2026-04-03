"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IntelligenceRedirect() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : "";

  useEffect(
    function redirectToAutopilotIntelligence() {
      if (orgSlug) {
        router.replace(`/dashboard/${orgSlug}/autopilot/intelligence`);
      }
    },
    [orgSlug, router]
  );

  return null;
}
