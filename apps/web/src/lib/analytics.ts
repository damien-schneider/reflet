import posthog from "posthog-js";

interface AnalyticsEvents {
  // Acquisition
  sign_up_completed: { method: "email" | "google" | "github" };
  sign_in_completed: { method: "email" | "google" | "github" };
  sign_out: Record<string, never>;

  // Pricing
  pricing_billing_toggled: { interval: "monthly" | "yearly" };
  pricing_tier_clicked: { tier: string; interval: "monthly" | "yearly" };

  // Engagement
  feedback_created: { source: "admin" | "public_board" };
  feedback_voted: { action: "add" | "remove" };
  release_published: { has_version: boolean };
  member_invited: { role: "admin" | "member" };
  changelog_subscribed: { method: "authenticated" | "email" };

  // Revenue
  plan_upgrade_clicked: { plan: string; interval: "yearly" | "monthly" };

  // Feature adoption
  ai_release_notes_generated: Record<string, never>;
  github_connected: Record<string, never>;
}

const isPostHogEnabled =
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
  process.env.NODE_ENV !== "development";

export function capture<K extends keyof AnalyticsEvents>(
  ...args: AnalyticsEvents[K] extends Record<string, never>
    ? [event: K]
    : [event: K, properties: AnalyticsEvents[K]]
): void {
  if (!isPostHogEnabled) {
    return;
  }
  const [event, properties] = args;
  posthog.capture(event, properties);
}
