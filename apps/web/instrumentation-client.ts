import { env } from "@reflet/env/web";
import posthog from "posthog-js";

const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;
const isDevelopment = env.NODE_ENV === "development";

if (posthogKey && !isDevelopment) {
  posthog.init(posthogKey, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_exceptions: true,
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    ui_host: "https://eu.posthog.com",
  });
}
