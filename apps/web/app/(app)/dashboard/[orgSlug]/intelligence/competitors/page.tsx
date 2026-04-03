"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CompetitorsRedirect() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : "";

  useEffect(
    function redirectToIntelligence() {
      if (orgSlug) {
        router.replace(`/dashboard/${orgSlug}/autopilot/intelligence`);
      }
    },
    [orgSlug, router]
  );

  return null;
}
