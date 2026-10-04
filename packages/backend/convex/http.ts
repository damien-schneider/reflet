import { registerRoutes as registerStripeRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";
import type Stripe from "stripe";
import { components, internal } from "./_generated/api";
import { type ActionCtx, httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth/auth";
import { cancellationFromStripeSubscription } from "./billing/cancellations";
import { generateRssFeed } from "./changelog/rss";
import { resend } from "./email/send";
import { registerAdminAgentRoutes } from "./http/admin_agent";
import { registerAdminContentRoutes } from "./http/admin_content";
import { registerAdminFeedbackRoutes } from "./http/admin_feedback";
import { registerAdminManagementRoutes } from "./http/admin_management";
import { registerAdminSurveyRoutes } from "./http/admin_surveys";
import { registerAiApiRoutes } from "./http/ai_api";
import { registerDevtoolsRoutes } from "./http/devtools_routes";
import { registerGithubWebhookRoutes } from "./http/github_webhook";
import { registerPublicApiRoutes } from "./http/public_api";
import { registerSupportEmailRoutes } from "./support/email/http_routes";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

const syncSubscribedOrg = async (
  ctx: Pick<ActionCtx, "runMutation">,
  event:
    | Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionDeletedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
): Promise<void> => {
  const organizationId = event.data.object.metadata.orgId;
  if (!organizationId) {
    return;
  }
  const cancellation = cancellationFromStripeSubscription(event.data.object);
  try {
    await ctx.runMutation(internal.billing.internal.syncOrgSubscription, {
      organizationId,
    });
    if (cancellation) {
      await ctx.runMutation(
        internal.billing.cancellations.recordSubscriptionCancellation,
        { ...cancellation, organizationId }
      );
    }
  } catch (error) {
    // A 500 here makes Stripe retry, then disable the endpoint for all billing events.
    console.error("[Stripe webhook] org subscription sync failed", {
      error,
      eventId: event.id,
      organizationId,
    });
  }
};

// biome-ignore lint/suspicious/noExplicitAny: @convex-dev/stripe compiled against older convex version
registerStripeRoutes(http, components.stripe as any, {
  events: {
    "customer.subscription.created": syncSubscribedOrg,
    "customer.subscription.deleted": syncSubscribedOrg,
    "customer.subscription.updated": syncSubscribedOrg,
  },
  webhookPath: "/stripe/webhook",
});

registerGithubWebhookRoutes(http);

registerAiApiRoutes(http);

registerPublicApiRoutes(http);
registerDevtoolsRoutes(http);

http.route({
  handler: httpAction(
    async (ctx, request) => await resend.handleResendEventWebhook(ctx, request)
  ),
  method: "POST",
  path: "/resend-webhook",
});

registerSupportEmailRoutes(http);

http.route({
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const orgSlug = pathParts[1];

    if (!orgSlug) {
      return new Response("Organization slug required", { status: 400 });
    }

    const org = await ctx.runQuery(
      internal.changelog.rss.getOrganizationBySlug,
      { slug: orgSlug }
    );

    if (!org) {
      return new Response("Organization not found", { status: 404 });
    }

    if (!org.isPublic) {
      return new Response("RSS feed not available for private organizations", {
        status: 404,
      });
    }

    const releases = await ctx.runQuery(
      internal.changelog.rss.getPublishedReleases,
      { limit: 50, organizationId: org._id }
    );

    const siteUrl = process.env.SITE_URL ?? "";
    const rssXml = generateRssFeed(org, releases, siteUrl);

    return new Response(rssXml, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
      status: 200,
    });
  }),
  method: "GET",
  path: "/rss",
});

registerAdminFeedbackRoutes(http);
registerAdminAgentRoutes(http);
registerAdminContentRoutes(http);
registerAdminSurveyRoutes(http);
registerAdminManagementRoutes(http);

export default http;
