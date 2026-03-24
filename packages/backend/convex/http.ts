import { registerRoutes as registerStripeRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth/auth";
import { generateRssFeed } from "./changelog/rss";
import { registerAdminContentRoutes } from "./http/admin_content";
import { registerAdminFeedbackRoutes } from "./http/admin_feedback";
import { registerAdminManagementRoutes } from "./http/admin_management";
import { registerAiApiRoutes } from "./http/ai_api";
import { registerGithubApiRoutes } from "./http/github_api";
import { registerGithubWebhookRoutes } from "./http/github_webhook";
import { registerPublicApiRoutes } from "./http/public_api";
import { mcpCorsHandler, mcpHandler } from "./mcp/handler";

const http = httpRouter();

// Better Auth routes
authComponent.registerRoutes(http, createAuth);

// Stripe webhook
// biome-ignore lint/suspicious/noExplicitAny: @convex-dev/stripe compiled against older convex version
registerStripeRoutes(http, components.stripe as any, {
  webhookPath: "/stripe/webhook",
});

// GitHub webhook
registerGithubWebhookRoutes(http);

// GitHub API (repositories, labels, issues, sync, setup)
registerGithubApiRoutes(http);

// AI API (release title, feedback matching)
registerAiApiRoutes(http);

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

// MCP server (JSON-RPC 2.0 over HTTP)
http.route({ path: "/mcp", method: "POST", handler: mcpHandler });
http.route({ path: "/mcp", method: "OPTIONS", handler: mcpCorsHandler });

export default http;
