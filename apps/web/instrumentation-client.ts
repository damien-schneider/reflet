import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const isDevelopment = process.env.NODE_ENV === "development";

if (posthogKey && !isDevelopment) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
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
