import { env } from "@reflet/env/web";
import posthog from "posthog-js";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

interface AnalyticsEvents {
  ai_release_notes_generated: Record<string, never>;
  changelog_subscribed: { method: "authenticated" | "email" };
  feedback_created: { source: "admin" | "public_board" };
  feedback_voted: { action: "add" | "remove" };
  github_connected: Record<string, never>;
  member_invited: { role: "admin" | "member" };
  plan_upgrade_clicked: { plan: string; interval: "yearly" | "monthly" };
  release_published: { has_version: boolean };
  release_scheduled: { has_version: boolean };
  sign_in_completed: { method: "email" | "google" | "github" };
  sign_out: Record<string, never>;
  sign_up_completed: { method: "email" | "google" | "github" };
}

const isPostHogConfigured =
  Boolean(env.NEXT_PUBLIC_POSTHOG_KEY) && env.NODE_ENV !== "development";

export function capture<K extends keyof AnalyticsEvents>(
  ...args: AnalyticsEvents[K] extends Record<string, never>
    ? [event: K]
    : [event: K, properties: AnalyticsEvents[K]]
): void {
  if (!(isPostHogConfigured && hasAnalyticsConsent())) {
    return;
  }
  const [event, properties] = args;
  posthog.capture(event, properties);
}
