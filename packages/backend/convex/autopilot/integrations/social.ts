/**
 * Social media publishing pipeline for Growth agent.
 *
 * Flow: Growth generates content → pending_review → President approves →
 * auto-publishes via configured platform APIs (Buffer, Typefully, or native).
 *
 * Tracks engagement metrics back into the system.
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";

// ============================================
// QUERIES
// ============================================

/**
 * Get content approved for publishing (published status, not yet posted).
 */
export const getApprovedContent = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const publishableTypes = [
      "reddit_reply",
      "linkedin_post",
      "twitter_post",
      "hn_comment",
      "blog_post",
    ];

    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "published")
      )
      .take(50);

    return docs.filter(
      (d) =>
        publishableTypes.includes(d.type) &&
        d.sourceAgent === "growth" &&
        d.publishedAt === undefined // Not yet actually posted
    );
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Mark content as posted with the published URL and timestamp.
 */
export const markContentPosted = internalMutation({
  args: {
    documentId: v.id("autopilotDocuments"),
    publishedUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      publishedAt: Date.now(),
      publishedUrl: args.publishedUrl,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// PUBLISHING ACTION
// ============================================

/**
 * Publish approved content to configured social media platforms.
 *
 * Currently supports Buffer API for scheduling across platforms.
 * Can be extended with platform-native APIs (Twitter/X, LinkedIn, etc.).
 */
export const publishApprovedContent = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const orgId = args.organizationId;

    const approved = await ctx.runQuery(
      internal.autopilot.integrations.social.getApprovedContent,
      { organizationId: orgId }
    );

    if (approved.length === 0) {
      return;
    }

    const bufferAccessToken = process.env.BUFFER_ACCESS_TOKEN;
    const typefullyApiKey = process.env.TYPEFULLY_API_KEY;

    if (!(bufferAccessToken || typefullyApiKey)) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "info",
        message: `${approved.length} content pieces approved for publishing but no social API configured (set BUFFER_ACCESS_TOKEN or TYPEFULLY_API_KEY)`,
      });
      return;
    }

    let published = 0;

    for (const doc of approved.slice(0, 5)) {
      try {
        let publishedUrl: string | undefined;

        // Twitter/LinkedIn via Typefully (X scheduler)
        if (
          typefullyApiKey &&
          (doc.type === "twitter_post" || doc.type === "linkedin_post")
        ) {
          publishedUrl = await publishViaTypefully(
            typefullyApiKey,
            doc.content,
            doc.type === "linkedin_post"
          );
        }
        // All platforms via Buffer
        else if (bufferAccessToken) {
          publishedUrl = await publishViaBuffer(
            bufferAccessToken,
            doc.content,
            doc.type
          );
        }

        await ctx.runMutation(
          internal.autopilot.integrations.social.markContentPosted,
          { documentId: doc._id, publishedUrl }
        );

        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "success",
          message: `Content published: "${doc.title}" (${doc.type})${publishedUrl ? ` → ${publishedUrl}` : ""}`,
          action: "social.published",
        });

        published++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "error",
          message: `Failed to publish "${doc.title}": ${message}`,
        });
      }
    }

    if (published > 0) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "success",
        message: `Social publishing complete: ${published}/${approved.length} pieces published`,
      });
    }
  },
});

// ============================================
// PLATFORM ADAPTERS
// ============================================

/**
 * Publish via Typefully API (Twitter/X and LinkedIn scheduling).
 */
const publishViaTypefully = async (
  apiKey: string,
  content: string,
  isLinkedIn: boolean
): Promise<string | undefined> => {
  const response = await fetch("https://api.typefully.com/v1/drafts/", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      threadify: false,
      share: true,
      ...(isLinkedIn ? { linkedin: true } : {}),
      "schedule-date": "next-free-slot",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Typefully API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.share_url as string | undefined;
};

/**
 * Publish via Buffer API (multi-platform scheduling).
 */
const publishViaBuffer = async (
  accessToken: string,
  content: string,
  _contentType: string
): Promise<string | undefined> => {
  // Get Buffer profiles
  const profilesResponse = await fetch(
    "https://api.bufferapp.com/1/profiles.json",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!profilesResponse.ok) {
    throw new Error(`Buffer API error: ${profilesResponse.status}`);
  }

  const profiles = (await profilesResponse.json()) as Array<{
    id: string;
    service: string;
  }>;
  if (profiles.length === 0) {
    throw new Error("No Buffer profiles configured");
  }

  // Post to first available profile
  const profile = profiles[0];
  const createResponse = await fetch(
    "https://api.bufferapp.com/1/updates/create.json",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        text: content,
        "profile_ids[]": profile.id,
        now: "true",
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Buffer create error: ${createResponse.status} ${error}`);
  }

  return undefined; // Buffer doesn't return a direct post URL
};
