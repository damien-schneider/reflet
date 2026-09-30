"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { describeFetchFailure } from "../shared/outbound/public_fetch";
import { fetchPublicUrlPinned } from "../shared/outbound/public_fetch_node";

const MAX_HTML_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_CONTENT_LENGTH = 5000;

const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/i;
const META_DESC_REGEX =
  /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i;
const SCRIPT_TAG_REGEX = /<script[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_TAG_REGEX = /<style[^>]*>[\s\S]*?<\/style>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;

const extractPage = (html: string) => {
  const content = html
    .replace(SCRIPT_TAG_REGEX, "")
    .replace(STYLE_TAG_REGEX, "")
    .replace(HTML_TAG_REGEX, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return {
    description: html.match(META_DESC_REGEX)?.[1]?.trim() || undefined,
    scrapedContent:
      content.length > MAX_CONTENT_LENGTH
        ? `${content.slice(0, MAX_CONTENT_LENGTH)}...`
        : content,
    title: html.match(TITLE_REGEX)?.[1]?.trim() || undefined,
  };
};

export const scrapeWebsite = internalAction({
  args: { referenceId: v.id("websiteReferences") },
  handler: async (ctx, args) => {
    const reference = await ctx.runQuery(
      internal.integrations.website_references.getReference,
      { id: args.referenceId }
    );
    if (!reference) {
      return null;
    }

    await ctx.runMutation(
      internal.integrations.website_references.updateStatus,
      { id: args.referenceId, status: "fetching" }
    );

    const recordError = (errorMessage: string) =>
      ctx.runMutation(internal.integrations.website_references.updateStatus, {
        errorMessage,
        id: args.referenceId,
        status: "error",
      });

    let html: string;
    try {
      const response = await fetchPublicUrlPinned(reference.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.app)",
        },
        maxBytes: MAX_HTML_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
      });
      if (!response.ok) {
        await recordError(`HTTP ${response.status}`);
        return null;
      }
      html = response.text;
    } catch (error) {
      await recordError(describeFetchFailure(error));
      return null;
    }

    await ctx.runMutation(
      internal.integrations.website_references.updateStatus,
      { ...extractPage(html), id: args.referenceId, status: "success" }
    );
    return null;
  },
  returns: v.null(),
});
