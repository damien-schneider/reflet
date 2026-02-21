"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { type ReactNode, Suspense, useEffect } from "react";
import { initPostHog } from "./posthog";

function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      const search = searchParams.toString();
      if (search) {
        url += `?${search}`;
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

function PostHogInit(): null {
  useEffect(() => {
    initPostHog();
  }, []);

  return null;
}

export function PostHogProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <>
      <PostHogInit />
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
