/**
 * Agent context loader — builds enriched context from knowledge base,
 * signals, and initiatives for any agent before LLM calls.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { assignedAgent } from "./schema/validators";

/**
 * Load contextual data for an agent: knowledge docs, recent signals,
 * and active initiatives. Returns a formatted string ready for prompt injection.
 */
export const loadAgentContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
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

    // 2. Recent documents (last 48h)
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    const documents = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentDocs = documents
      .filter((d) => d.createdAt > twoDaysAgo)
      .slice(0, 10);

    if (recentDocs.length > 0) {
      const docSummaries = recentDocs
        .map(
          (d) =>
            `- [${d.type}/${d.status}] ${d.title} (by: ${d.sourceAgent ?? "unknown"})`
        )
        .join("\n");
      sections.push(`RECENT DOCUMENTS:\n${docSummaries}`);
    }

    // 3. Active initiatives (work items with type=initiative)
    const initiatives = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const activeInitiatives = initiatives.filter(
      (i) => i.type === "initiative"
    );

    if (activeInitiatives.length > 0) {
      const initiativeSummaries = activeInitiatives
        .map(
          (i) =>
            `- ${i.title} (${i.completionPercent ?? 0}% complete, priority: ${i.priority})`
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
