import posthog from "posthog-js";

interface AnalyticsEvents {
  // Feature adoption
  ai_release_notes_generated: Record<string, never>;
  changelog_subscribed: { method: "authenticated" | "email" };

  // Engagement
  feedback_created: { source: "admin" | "public_board" };
  feedback_voted: { action: "add" | "remove" };
  first_feedback_created: Record<string, never>;
  first_github_connected: Record<string, never>;
  first_member_invited: Record<string, never>;
  first_release_published: Record<string, never>;
  github_connected: Record<string, never>;
  member_invited: { role: "admin" | "member" };
  onboarding_completed: Record<string, never>;

  // Onboarding
  onboarding_step_completed: { step: string; stepNumber: number };

  // Activation milestones
  org_created: Record<string, never>;

  // Revenue
  plan_upgrade_clicked: { plan: string; interval: "yearly" | "monthly" };

  // Pricing
  pricing_billing_toggled: { interval: "monthly" | "yearly" };
  pricing_tier_clicked: { tier: string; interval: "monthly" | "yearly" };
  release_published: { has_version: boolean };
  release_scheduled: { has_version: boolean };
  sign_in_completed: { method: "email" | "google" | "github" };
  sign_out: Record<string, never>;
  // Acquisition
  sign_up_completed: { method: "email" | "google" | "github" };
  widget_installed: Record<string, never>;
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
