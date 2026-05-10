import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type EffectiveTier = "free" | "pro";

/**
 * E2E TEST BYPASS — production safety guard.
 *
 * The Phase 7 Playwright suites under `apps/web/e2e/tasks-*.e2e.ts` create
 * fresh organizations and exercise the full UI surface. Fresh sign-ups land
 * on the Free tier, which makes `requireAutopilotAccess` (and any other
 * caller of `getEffectiveTier`) reject the very mutations the suites need to
 * test.
 *
 * Setting `AUTOPILOT_E2E_BYPASS=1` on the Convex deployment promotes every
 * org to "pro" without touching Stripe. This is intentionally a Convex env
 * var (not an HTTP header or query arg) so it cannot be triggered by any
 * end-user request: only an operator with deployment credentials can flip
 * it. To activate locally:
 *
 *   cd packages/backend && bunx convex env set AUTOPILOT_E2E_BYPASS 1
 *
 * The Playwright config also forwards the variable to the dev server so
 * SSR-side actions inherit it. Production deployments must NEVER have this
 * env var set; we log a one-shot warning whenever the bypass takes effect
 * so the misconfiguration is loud and visible in logs.
 */
const AUTOPILOT_E2E_BYPASS_ENV = "AUTOPILOT_E2E_BYPASS";
let bypassWarned = false;

const isE2EBypassActive = (): boolean => {
  if (process.env[AUTOPILOT_E2E_BYPASS_ENV] !== "1") {
    return false;
  }
  if (!bypassWarned) {
    bypassWarned = true;
    console.warn(
      `[billing] ${AUTOPILOT_E2E_BYPASS_ENV}=1 — every org is reported as Pro tier. This must NEVER be set in production.`
    );
  }
  return true;
};

export async function getEffectiveTier(
  ctx: Pick<QueryCtx, "db" | "runQuery">,
  organizationId: Id<"organizations">
): Promise<EffectiveTier> {
  if (isE2EBypassActive()) {
    return "pro";
  }

  const organization = await ctx.db.get(organizationId);
  if (!organization?.stripeCustomerId) {
    return "free";
  }

  const subscription = await ctx.runQuery(
    components.stripe.public.getSubscriptionByOrgId,
    { orgId: organizationId }
  );
  const hasActiveSubscription =
    subscription &&
    subscription.stripeCustomerId === organization.stripeCustomerId &&
    (subscription.status === "active" || subscription.status === "trialing");

  return hasActiveSubscription ? "pro" : "free";
}
