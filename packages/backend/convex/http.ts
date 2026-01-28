import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { polar } from "./polar";

const http = httpRouter();

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth);

// ============================================
// POLAR WEBHOOK HANDLER
// ============================================

// Register Polar webhook routes at /polar/events
// The component handles webhook signature verification and subscription sync
polar.registerRoutes(http);

// ============================================
// GITHUB WEBHOOK HANDLER
// ============================================

http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const eventType = request.headers.get("X-GitHub-Event");

    if (!eventType) {
      return new Response("Missing X-GitHub-Event header", { status: 400 });
    }

    const body = await request.text();

    // TODO: Verify webhook signature using GITHUB_WEBHOOK_SECRET for production

    try {
      const payload = JSON.parse(body) as Record<string, unknown>;

      // Handle installation events (app installed/uninstalled)
      if (eventType === "installation") {
        const action = payload.action as string;
        const installation = payload.installation as {
          id: number;
          account: { login: string };
        };

        if (action === "deleted") {
          // App was uninstalled - remove the connection
          await ctx.runMutation(internal.github.handleInstallationDeleted, {
            installationId: String(installation.id),
          });
          return new Response(
            JSON.stringify({ success: true, action: "installation_deleted" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // Handle release events (placeholder for future implementation)
      if (eventType === "release") {
        const release = payload.release as { tag_name: string };
        return new Response(
          JSON.stringify({
            success: true,
            action: "release_event_received",
            release: release.tag_name,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Acknowledge other events
      return new Response(JSON.stringify({ success: true, event: eventType }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("GitHub webhook error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to process webhook",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
