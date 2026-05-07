/**
 * Growth content storage — handles saving generated content documents
 * with backlog management, dedup, and thread metadata enrichment.
 */

import type { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { validateUrl } from "../shared_web";
import type { growthContentSchema, ScoredThread } from "./discovery";

const MAX_PENDING_GROWTH_CONTENT = 10;
const MAX_PENDING_BLOG_POSTS = 3;

/** Content types ordered by priority — community engagement first, blog posts last */
const CONTENT_PRIORITY: string[] = [
  "reddit_reply",
  "hn_comment",
  "twitter_post",
  "linkedin_post",
  "blog_post",
];

type GrowthContentItem = z.infer<typeof growthContentSchema>["items"][number];

const DOCUMENT_TYPE_BY_CONTENT_TYPE = {
  blog_post: "blog_post",
  changelog_announce: "changelog",
  email_campaign: "email",
  hn_comment: "hn_comment",
  linkedin_post: "linkedin_post",
  reddit_reply: "reddit_reply",
  twitter_post: "twitter_post",
} satisfies Record<
  GrowthContentItem["type"],
  Doc<"autopilotDocuments">["type"]
>;

export const buildThreadMetadata = (
  targetUrl: string,
  scoredThreads?: ScoredThread[]
): string | undefined => {
  if (!(targetUrl && scoredThreads?.length)) {
    return undefined;
  }
  const thread = scoredThreads.find((t) => t.url === targetUrl);
  if (!thread) {
    return undefined;
  }
  return JSON.stringify({
    originalPost: thread.originalPostContent.slice(0, 2000),
    topComments: thread.topComments.slice(0, 5),
    community: thread.community,
    postAge: thread.postAge,
    commentCount: thread.commentCount,
    relevanceScore: thread.relevanceScore,
    relevanceReason: thread.relevanceReason,
  });
};

export const saveContentDocuments = async (
  ctx: {
    runMutation: ActionCtx["runMutation"];
    runQuery: ActionCtx["runQuery"];
  },
  organizationId: Id<"organizations">,
  items: z.infer<typeof growthContentSchema>["items"],
  scoredThreads?: ScoredThread[]
): Promise<{ saved: number; dropped: number }> => {
  // Check existing backlog
  const pendingDocs = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByTags,
    { organizationId, tags: ["growth"], status: "pending_review" }
  );
  const currentTotal = pendingDocs.length;
  const currentBlogCount = pendingDocs.filter(
    (d) => d.type === "blog_post"
  ).length;

  // If already at the cap, skip entirely
  if (currentTotal >= MAX_PENDING_GROWTH_CONTENT) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message: `Content generation skipped — backlog full (${currentTotal}/${MAX_PENDING_GROWTH_CONTENT} pending)`,
    });
    return { saved: 0, dropped: items.length };
  }

  // Sort items by priority: community engagement first, blog posts last
  const sortedItems = [...items].sort(
    (a, b) =>
      (CONTENT_PRIORITY.indexOf(a.type) === -1
        ? CONTENT_PRIORITY.length
        : CONTENT_PRIORITY.indexOf(a.type)) -
      (CONTENT_PRIORITY.indexOf(b.type) === -1
        ? CONTENT_PRIORITY.length
        : CONTENT_PRIORITY.indexOf(b.type))
  );

  // Batch dedup check — single query instead of N individual queries
  const dedupResults = await ctx.runQuery(
    internal.autopilot.dedup.findSimilarGrowthItems,
    { organizationId, titles: sortedItems.map((i) => i.title) }
  );
  const existingTitles = new Set(
    dedupResults.filter((r) => r.existingId !== null).map((r) => r.title)
  );

  let saved = 0;
  let dropped = 0;
  let blogsSaved = 0;

  for (const item of sortedItems) {
    // Total cap
    if (currentTotal + saved >= MAX_PENDING_GROWTH_CONTENT) {
      dropped++;
      continue;
    }

    // Blog-specific cap
    if (
      item.type === "blog_post" &&
      currentBlogCount + blogsSaved >= MAX_PENDING_BLOG_POSTS
    ) {
      dropped++;
      continue;
    }

    // Dedup
    if (existingTitles.has(item.title)) {
      continue;
    }

    let validatedTargetUrl = item.targetUrl;
    if (validatedTargetUrl) {
      const validation = await validateUrl(validatedTargetUrl);
      if (!validation.valid) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId,
          agent: "growth",
          level: "info",
          message: `Dropped invalid targetUrl: ${validatedTargetUrl} (${validation.reason})`,
        });
        validatedTargetUrl = "";
      }
    }

    await ctx.runMutation(internal.autopilot.documents.createDocument, {
      organizationId,
      type: DOCUMENT_TYPE_BY_CONTENT_TYPE[item.type],
      title: item.title,
      content: item.content,
      targetUrl: validatedTargetUrl,
      status: "pending_review",
      sourceAgent: "growth",
      needsReview: true,
      reviewType: "growth_content",
      tags: ["growth", item.type],
      metadata: buildThreadMetadata(validatedTargetUrl, scoredThreads),
    });

    saved++;
    if (item.type === "blog_post") {
      blogsSaved++;
    }
  }

  if (dropped > 0) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message: `Content cap applied: saved ${saved}, dropped ${dropped} (total backlog: ${currentTotal + saved}/${MAX_PENDING_GROWTH_CONTENT}, blogs: ${currentBlogCount + blogsSaved}/${MAX_PENDING_BLOG_POSTS})`,
    });
  }

  return { saved, dropped };
};
