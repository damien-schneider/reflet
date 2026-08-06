import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { GITHUB_API_URL } from "./github_constants";

export const createWebhook = internalAction({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    secret: v.string(),
    webhookUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/hooks`,
      {
        body: JSON.stringify({
          active: true,
          config: {
            content_type: "json",
            insecure_ssl: "0",
            secret: args.secret,
            url: args.webhookUrl,
          },
          events: ["release"],
          name: "web",
        }),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create webhook: ${response.statusText} - ${errorText}`
      );
    }

    const webhook = (await response.json()) as { id: number };
    return { webhookId: String(webhook.id) };
  },
});

/**
 * Internal mutation to process webhook release event
 */

/**
 * Internal mutation to handle auto-import of issue to feedback
 */
