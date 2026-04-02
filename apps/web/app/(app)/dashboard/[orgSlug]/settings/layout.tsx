"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsLayout(_props: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const rawOrgSlug = params?.orgSlug;
  const orgSlug = typeof rawOrgSlug === "string" ? rawOrgSlug : "";

  useEffect(
    function redirectToProject() {
      if (orgSlug) {
        router.replace(`/dashboard/${orgSlug}/project`);
      }
    },
    [orgSlug, router]
  );

  return null;
}
