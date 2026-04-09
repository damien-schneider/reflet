/**
 * Sales discovery helpers — Exa-powered lead discovery and validated lead creation.
 */

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import {
  type ExaResult,
  resetExaCostTracker,
  searchWithExa,
} from "./shared_exa";
import { validateUrl } from "./shared_web";

const formatExaResultsForLLM = (
  results: ExaResult[],
  label: string
): string => {
  if (results.length === 0) {
    return "";
  }
  return `${label}:\n${results
    .map(
      (r) =>
        `- [${r.title}](${r.url})${r.author ? ` by ${r.author}` : ""}\n  ${(r.highlights?.join(" ") ?? r.text?.slice(0, 300) ?? "").slice(0, 300)}`
    )
    .join("\n")}`;
};

export const runExaSalesDiscovery = async (
  marketNotesContext: string,
  marketDocsContext: string
): Promise<{
  searchResults: string;
  citations: Array<{ url: string; title: string; content: string }>;
}> => {
  resetExaCostTracker();

  // Run people + company + signal searches in sequence
  // (parallel would be faster but Exa rate limits can be tight)
  const allResults: ExaResult[] = [];

  // People discovery — find decision-makers and content creators
  try {
    const peopleResults = await searchWithExa({
      query: `${marketNotesContext.slice(0, 100)} decision maker`,
      category: "people",
      includeDomains: ["linkedin.com"],
      numResults: 5,
      contents: { highlights: { maxCharacters: 2000 } },
    });
    allResults.push(...peopleResults.results);
  } catch {
    // People search is optional
  }

  // Company discovery — find companies in the target market
  try {
    const companyResults = await searchWithExa({
      query: `${marketDocsContext.slice(0, 100)} company`,
      category: "company",
      numResults: 5,
      contents: { highlights: { maxCharacters: 2000 } },
    });
    allResults.push(...companyResults.results);
  } catch {
    // Company search is optional
  }

  // High-intent signal search — community discussions
  try {
    const signalResults = await searchWithExa({
      query: "looking for alternative solution recommendation",
      numResults: 10,
      type: "auto",
      startPublishedDate: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      includeDomains: [
        "github.com",
        "reddit.com",
        "news.ycombinator.com",
        "producthunt.com",
      ],
      contents: { highlights: { maxCharacters: 2000 } },
    });
    allResults.push(...signalResults.results);
  } catch {
    // Signal search is optional
  }

  // Format as text + citations for the existing LLM structuring pipeline
  const searchResults = [
    formatExaResultsForLLM(
      allResults.filter((r) => r.url.includes("linkedin.com")),
      "PEOPLE FOUND"
    ),
    formatExaResultsForLLM(
      allResults.filter(
        (r) =>
          !(
            r.url.includes("linkedin.com") ||
            r.url.includes("reddit.com") ||
            r.url.includes("github.com")
          )
      ),
      "COMPANIES FOUND"
    ),
    formatExaResultsForLLM(
      allResults.filter(
        (r) =>
          r.url.includes("reddit.com") ||
          r.url.includes("github.com") ||
          r.url.includes("news.ycombinator.com") ||
          r.url.includes("producthunt.com")
      ),
      "HIGH-INTENT SIGNALS"
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  const citations = allResults.map((r) => ({
    url: r.url,
    title: r.title,
    content:
      r.highlights?.join(" ").slice(0, 500) ?? r.text?.slice(0, 500) ?? "",
  }));

  return { searchResults, citations };
};

export const createValidatedLeads = async (
  ctx: { runMutation: ActionCtx["runMutation"] },
  organizationId: Id<"organizations">,
  leads: Array<{
    name: string;
    company: string;
    source: string;
    sourceUrl: string;
    notes: string;
    priority: string;
  }>,
  existingLeads: Array<{ name: string; company?: string }>
): Promise<number> => {
  let count = 0;
  for (const lead of leads) {
    const isDuplicate = existingLeads.some(
      (existing) =>
        existing.name.toLowerCase() === lead.name.toLowerCase() ||
        (existing.company &&
          lead.company &&
          existing.company.toLowerCase() === lead.company.toLowerCase())
    );
    if (isDuplicate) {
      continue;
    }

    let validatedSourceUrl = lead.sourceUrl;
    if (validatedSourceUrl) {
      const validation = await validateUrl(validatedSourceUrl);
      if (!validation.valid) {
        validatedSourceUrl = "";
      }
    }

    await ctx.runMutation(
      internal.autopilot.agents.sales_mutations.createLead,
      {
        organizationId,
        name: lead.name,
        company: lead.company,
        source: lead.source as
          | "github_star"
          | "github_fork"
          | "product_hunt"
          | "hackernews"
          | "reddit"
          | "web_search"
          | "referral"
          | "manual",
        sourceUrl: validatedSourceUrl,
        notes: lead.notes,
      }
    );
    count++;
  }
  return count;
};
