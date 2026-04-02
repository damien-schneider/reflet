/**
 * Inbound email receiving module for Autopilot.
 *
 * Handles incoming emails from Resend's webhook, records them in the database,
 * generates AI summaries, and creates tasks for the CEO agent if actionable.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";

// ============================================
// CONSTANTS
// ============================================

const SUMMARY_MODELS = [
  "qwen/qwen3.6-plus-preview:free",
  "openai/gpt-4o-mini",
] as const;

const EMAIL_SUMMARY_PROMPT = `Summarize this email in 1-2 sentences, focusing on the key action or information being conveyed.

Subject: {subject}

Body:
{body}

Summary:`;

const ACTIONABILITY_PROMPT = `Determine if this email requires action from the CEO/leadership team.
Respond with only "YES" or "NO".

Subject: {subject}

Body:
{body}

Actionable:`;

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Find an organization by its configured email address.
 * Queries autopilotConfig to match the given email address to an org.
 *
 * Args:
 * - emailAddress: The email address to look up
 *
 * Returns the organization ID if found, null otherwise.
 */
export const findOrgByEmailAddress = internalQuery({
  args: {
    emailAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize email to lowercase for comparison
    const normalizedAddress = args.emailAddress.toLowerCase();

    // Query all autopilot configs and find one with matching orgEmailAddress
    const configs = await ctx.db.query("autopilotConfig").collect();

    for (const config of configs) {
      if (
        config.orgEmailAddress &&
        config.orgEmailAddress.toLowerCase() === normalizedAddress
      ) {
        return config.organizationId;
      }
    }

    return null;
  },
});

// ============================================
// HELPER FUNCTIONS (NOT EXPORTED)
// ============================================

/**
 * Call OpenRouter to generate an email summary.
 * Uses free models for cost efficiency.
 */
const summarizeEmail = async (
  subject: string,
  bodyText: string
): Promise<string> => {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const prompt = EMAIL_SUMMARY_PROMPT.replace("{subject}", subject).replace(
    "{body}",
    bodyText
  );

  try {
    const result = await generateText({
      model: openrouter(SUMMARY_MODELS[0]),
      prompt,
      maxOutputTokens: 100,
    });

    return result.text.trim();
  } catch (_error) {
    // Fallback: return a basic summary if AI call fails
    const fallbackSummary = `Email from ${subject.slice(0, 50)}`;
    return fallbackSummary;
  }
};

/**
 * Determine if an email is actionable based on its content.
 * Uses AI to classify whether the email requires CEO/leadership attention.
 */
const isEmailActionable = async (
  subject: string,
  bodyText: string
): Promise<boolean> => {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const prompt = ACTIONABILITY_PROMPT.replace("{subject}", subject).replace(
    "{body}",
    bodyText
  );

  try {
    const result = await generateText({
      model: openrouter(SUMMARY_MODELS[1]),
      prompt,
      maxOutputTokens: 10,
    });

    const response = result.text.trim().toUpperCase();
    return response === "YES";
  } catch (_error) {
    // Default to not actionable if the check fails
    return false;
  }
};

// ============================================
// INTERNAL ACTIONS
// ============================================

/**
 * Process an incoming email from the webhook.
 *
 * Steps:
 * 1. Find the org by matching the `to` address against autopilotConfig.orgEmailAddress
 * 2. If no org found, log and return (unrecognized recipient)
 * 3. Record the email via internal.autopilot.email.receiveEmail
 * 4. Generate a brief AI summary of the email content
 * 5. Log activity: "Received email from {from}: {subject}"
 * 6. If the email seems actionable, create an autopilot task for the CEO agent to review
 */
export const processInboundEmail = internalAction({
  args: {
    bodyHtml: v.string(),
    bodyText: v.string(),
    cc: v.optional(v.array(v.string())),
    from: v.string(),
    inReplyTo: v.optional(v.string()),
    messageId: v.optional(v.string()),
    subject: v.string(),
    to: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Step 1: Find the org by matching the primary recipient
    if (args.to.length === 0) {
      throw new Error("Email must have at least one recipient");
    }

    const primaryRecipient = args.to[0];
    const organizationId = await ctx.runQuery(
      internal.autopilot.email_receiving.findOrgByEmailAddress,
      { emailAddress: primaryRecipient }
    );

    // Step 2: If no org found, return (no org to log to)
    if (!organizationId) {
      return null;
    }

    // Step 3: Record the email using the email.receiveEmail mutation
    await ctx.runMutation(internal.autopilot.email.receiveEmail, {
      organizationId,
      from: args.from,
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      threadId: args.messageId,
    });

    // Step 4: Generate a brief AI summary
    const summary = await summarizeEmail(args.subject, args.bodyText);

    // Step 5: Log the received email activity with summary
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId,
      agent: "system",
      level: "action",
      message: `Received email from ${args.from}: ${args.subject}`,
      details: summary,
    });

    // Step 6: Check if the email is actionable and create a task if needed
    const actionable = await isEmailActionable(args.subject, args.bodyText);

    if (actionable) {
      // Create a task for the CEO agent to review this email
      await ctx.runMutation(internal.autopilot.tasks.createTask, {
        organizationId,
        title: `Review incoming email: ${args.subject}`,
        description: `Review email from ${args.from}. Summary: ${summary}`,
        priority: "high",
        assignedAgent: "orchestrator",
        origin: "user_created",
        autonomyLevel: "review_required",
        maxRetries: 0,
      });
    }

    return null;
  },
});
