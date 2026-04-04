/**
 * Agent context loader — builds enriched context from knowledge base,
 * signals, and initiatives for any agent before LLM calls.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { activityLogAgent } from "./schema/validators";

/**
 * Load contextual data for an agent: knowledge docs, recent signals,
 * and active initiatives. Returns a formatted string ready for prompt injection.
 */
export const loadAgentContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: activityLogAgent,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const sections: string[] = [];

    // 1. Knowledge docs relevant to this agent
    const knowledgeDocs = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (knowledgeDocs.length > 0) {
      const docSummaries = knowledgeDocs
        .map((doc) => `- [${doc.docType}] ${doc.title}: ${doc.contentSummary}`)
        .join("\n");
      sections.push(`KNOWLEDGE BASE:\n${docSummaries}`);
    }

    // 2. Recent notes (last 48h)
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    const notes = await ctx.db
      .query("autopilotNotes")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentNotes = notes
      .filter((n) => n.createdAt > twoDaysAgo)
      .slice(0, 10);

    if (recentNotes.length > 0) {
      const noteSummaries = recentNotes
        .map(
          (n) =>
            `- [${n.category}/${n.status}] ${n.title} (strength: ${n.strength}, by: ${n.sourceAgent})`
        )
        .join("\n");
      sections.push(`RECENT NOTES:\n${noteSummaries}`);
    }

    // 3. Active initiatives
    const initiatives = await ctx.db
      .query("autopilotInitiatives")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    if (initiatives.length > 0) {
      const initiativeSummaries = initiatives
        .map(
          (i) =>
            `- ${i.title} (${i.completionPercent}% complete, priority: ${i.priority})`
        )
        .join("\n");
      sections.push(`ACTIVE INITIATIVES:\n${initiativeSummaries}`);
    }

    if (sections.length === 0) {
      return "";
    }

    return `\n--- AGENT CONTEXT ---\n${sections.join("\n\n")}\n--- END CONTEXT ---`;
  },
});
