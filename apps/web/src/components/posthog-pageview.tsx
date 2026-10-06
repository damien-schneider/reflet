"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

export function PostHogPageView() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render — PostHog captures the initial pageview automatically
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (pathname && hasAnalyticsConsent()) {
      posthog.capture("$pageview", { $current_url: window.origin + pathname });
    }
  }, [pathname]);

  return null;
}
