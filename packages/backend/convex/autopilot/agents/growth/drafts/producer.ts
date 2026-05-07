/**
 * Growth drafts producer — turns validated community posts into reviewable drafts.
 *
 * This is the producer for the `drafts` chain node. It only consumes community
 * posts that the Validator has approved for outreach, then links each created
 * draft back to its source post so the same opportunity is not processed twice.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../../_generated/api";
import type { Doc, Id } from "../../../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalQuery,
} from "../../../../_generated/server";
import { computeChainState, isNodeReadyToProduce } from "../../../chain";
import { chainNodeStatus, communityPlatform } from "../../../schema/validators";
import { buildAgentPrompt, GROWTH_SYSTEM_PROMPT } from "../../prompts";
import { generateObjectWithFallback } from "../../shared_generation";
import { GROWTH_CONTENT_MODELS } from "../discovery";
import {
  loadProductContext,
  MISSING_PRODUCT_DEF_MESSAGE,
  type ProductContext,
} from "../product_context";

const MAX_DRAFTS_PER_RUN = 5;
const MIN_VALIDATION_SCORE = 60;

const chainStateReturn = v.object({
  app_description: chainNodeStatus,
  codebase_understanding: chainNodeStatus,
  community_posts: chainNodeStatus,
  drafts: chainNodeStatus,
  lead_targets: chainNodeStatus,
  market_analysis: chainNodeStatus,
  personas: chainNodeStatus,
  target_definition: chainNodeStatus,
  use_cases: chainNodeStatus,
});

const draftSourcePost = v.object({
  _id: v.id("autopilotCommunityPosts"),
  authorName: v.string(),
  content: v.string(),
  platform: communityPlatform,
  sourceUrl: v.string(),
  title: v.optional(v.string()),
  validationComposite: v.number(),
  validationRationale: v.string(),
});

type CommunityPlatform = Doc<"autopilotCommunityPosts">["platform"];
type CommunityDraftDocType = Extract<
  Doc<"autopilotDocuments">["type"],
  "hn_comment" | "linkedin_post" | "reddit_reply" | "twitter_post"
>;

const DOC_TYPE_BY_PLATFORM = {
  devto: "reddit_reply",
  hackernews: "hn_comment",
  indiehackers: "reddit_reply",
  linkedin: "linkedin_post",
  other: "reddit_reply",
  reddit: "reddit_reply",
  twitter: "twitter_post",
} satisfies Record<CommunityPlatform, CommunityDraftDocType>;

const communityDraftsSchema = z.object({
  drafts: z
    .array(
      z.object({
        content: z.string(),
        sourceUrl: z.string(),
        title: z.string(),
      })
    )
    .max(MAX_DRAFTS_PER_RUN),
});

const isReadyForDraft = (post: Doc<"autopilotCommunityPosts">): boolean =>
  !post.draftDocId &&
  post.validation?.recommendation === "publish" &&
  post.validation.composite >= MIN_VALIDATION_SCORE;

export const getCommunityDraftContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    chainState: chainStateReturn,
    posts: v.array(draftSourcePost),
  }),
  handler: async (ctx, args) => {
    const [chainState, posts] = await Promise.all([
      computeChainState(ctx, args.organizationId),
      ctx.db
        .query("autopilotCommunityPosts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .take(50),
    ]);

    return {
      chainState,
      posts: posts
        .filter(isReadyForDraft)
        .slice(0, MAX_DRAFTS_PER_RUN)
        .map((post) => ({
          _id: post._id,
          authorName: post.authorName,
          content: post.content,
          platform: post.platform,
          sourceUrl: post.sourceUrl,
          title: post.title,
          validationComposite: post.validation?.composite ?? 0,
          validationRationale: post.validation?.rationale ?? "",
        })),
    };
  },
});

const buildDraftPrompt = (
  product: ProductContext,
  posts: Array<{
    authorName: string;
    content: string;
    platform: CommunityPlatform;
    sourceUrl: string;
    title?: string;
    validationComposite: number;
    validationRationale: string;
  }>
): string => `Create helpful community reply drafts for ${product.productName}.

PRODUCT:
Name: ${product.productName}
Summary: ${product.productSummary}
Description:
${product.productDescription}

VALIDATED COMMUNITY POSTS:
${JSON.stringify(
  posts.map((post) => ({
    authorName: post.authorName,
    content: post.content.slice(0, 1800),
    platform: post.platform,
    sourceUrl: post.sourceUrl,
    title: post.title,
    validationComposite: post.validationComposite,
    validationRationale: post.validationRationale,
  })),
  null,
  2
)}

Write one draft per post. Rules:
- Return the exact sourceUrl for the post being answered.
- Lead with practical help for the author's stated problem.
- Mention ${product.productName} only when it is naturally relevant.
- Do not invent facts, URLs, metrics, customers, integrations, or claims.
- Keep each reply concise enough for the platform.`;

const getDraftMetadata = (post: {
  authorName: string;
  content: string;
  platform: CommunityPlatform;
  sourceUrl: string;
  validationComposite: number;
  validationRationale: string;
}): string =>
  JSON.stringify({
    sourceAuthor: post.authorName,
    sourceContent: post.content.slice(0, 2000),
    sourcePlatform: post.platform,
    sourceUrl: post.sourceUrl,
    validationComposite: post.validationComposite,
    validationRationale: post.validationRationale,
  });

const createDraftDocument = async (
  ctx: { runMutation: ActionCtx["runMutation"] },
  organizationId: Id<"organizations">,
  post: {
    _id: Id<"autopilotCommunityPosts">;
    authorName: string;
    content: string;
    platform: CommunityPlatform;
    sourceUrl: string;
    validationComposite: number;
    validationRationale: string;
  },
  draft: z.infer<typeof communityDraftsSchema>["drafts"][number]
): Promise<Id<"autopilotDocuments">> =>
  await ctx.runMutation(internal.autopilot.documents.createDocument, {
    organizationId,
    content: draft.content,
    metadata: getDraftMetadata(post),
    needsReview: true,
    platform: post.platform,
    reviewType: "growth_content",
    sourceAgent: "growth",
    status: "pending_review",
    tags: ["growth", "community-draft", DOC_TYPE_BY_PLATFORM[post.platform]],
    targetUrl: post.sourceUrl,
    title: draft.title,
    type: DOC_TYPE_BY_PLATFORM[post.platform],
  });

export const runCommunityDraftGeneration = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { chainState, posts } = await ctx.runQuery(
      internal.autopilot.agents.growth.drafts.producer.getCommunityDraftContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(chainState, "drafts")) {
      return null;
    }

    if (posts.length === 0) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "info",
        message:
          "Community drafts skipped — no validated community posts ready for drafting",
      });
      return null;
    }

    const product = await loadProductContext(ctx, args.organizationId);
    if (!product) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "warning",
        message: MISSING_PRODUCT_DEF_MESSAGE,
      });
      return null;
    }

    const generated = await generateObjectWithFallback({
      models: GROWTH_CONTENT_MODELS,
      schema: communityDraftsSchema,
      prompt: buildDraftPrompt(product, posts),
      systemPrompt: buildAgentPrompt(
        GROWTH_SYSTEM_PROMPT,
        "",
        "",
        product.agentKnowledge
      ),
      temperature: 0.3,
    });

    const postByUrl = new Map(posts.map((post) => [post.sourceUrl, post]));
    let saved = 0;
    let skipped = 0;

    for (const draft of generated.drafts) {
      const post = postByUrl.get(draft.sourceUrl);
      if (!post) {
        skipped++;
        continue;
      }

      const draftDocId = await createDraftDocument(
        ctx,
        args.organizationId,
        post,
        draft
      );
      await ctx.runMutation(
        internal.autopilot.mutations.community_posts.linkDraftToCommunityPost,
        { communityPostId: post._id, draftDocId }
      );
      saved++;
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "growth",
      level: "success",
      message: `Community drafts generated: ${saved} saved, ${skipped} skipped`,
      details: JSON.stringify({
        draftsGenerated: generated.drafts.length,
        postsConsidered: posts.length,
        saved,
        skipped,
      }),
    });

    return null;
  },
});
