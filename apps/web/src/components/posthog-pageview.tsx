"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { hasAnalyticsConsent } from "@/components/cookie-consent-banner";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(
    function trackPageView() {
      // Skip first render — PostHog captures the initial pageview automatically
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (pathname && hasAnalyticsConsent()) {
        let url = window.origin + pathname;
        if (searchParams.toString()) {
          url = `${url}?${searchParams.toString()}`;
        }
        posthog.capture("$pageview", { $current_url: url });
      }
    },
    [pathname, searchParams]
  );

  return null;
}
