import { registerRoutes as registerStripeRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth/auth";
import { generateRssFeed } from "./changelog/rss";
import { registerAdminContentRoutes } from "./http/admin_content";
import { registerAdminFeedbackRoutes } from "./http/admin_feedback";
import { registerAdminManagementRoutes } from "./http/admin_management";
import { registerGithubWebhookRoutes } from "./http/github_webhook";
import { registerPublicApiRoutes } from "./http/public_api";

const http = httpRouter();

// Better Auth routes
authComponent.registerRoutes(http, createAuth);

// Stripe webhook
registerStripeRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

// GitHub webhook
registerGithubWebhookRoutes(http);

// Public feedback API (v1)
registerPublicApiRoutes(http);

// RSS feed
http.route({
  path: "/rss",
  method: "GET",
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
      { organizationId: org._id, limit: 50 }
    );

    const siteUrl = process.env.SITE_URL ?? "";
    const rssXml = generateRssFeed(org, releases, siteUrl);

    return new Response(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

// Admin API (v1)
registerAdminFeedbackRoutes(http);
registerAdminContentRoutes(http);
registerAdminManagementRoutes(http);

export default http;
