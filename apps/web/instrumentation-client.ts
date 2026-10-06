import { env } from "@reflet/env/web";
import posthog from "posthog-js";
import { stripUrlQueriesBeforeSend } from "@/lib/posthog-url-privacy";

const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;
const isDevelopment = env.NODE_ENV === "development";

if (posthogKey && !isDevelopment) {
  posthog.init(posthogKey, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    before_send: stripUrlQueriesBeforeSend,
    capture_exceptions: true,
    defaults: "2026-01-30",
    disable_capture_url_hashes: true,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    ui_host: "https://eu.posthog.com",
  });
}
