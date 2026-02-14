import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalQuery } from "./_generated/server";

/**
 * Get organization by slug (internal use only)
 */
export const getOrganizationBySlug = internalQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/**
 * Get published releases for an organization (internal use only)
 */
export const getPublishedReleases = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.neq(q.field("publishedAt"), undefined))
      .order("desc")
      .take(limit);

    // Sort by publishedAt descending
    return releases.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  },
});

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Generate RSS XML feed
 */
export function generateRssFeed(
  org: Doc<"organizations">,
  releases: Doc<"releases">[],
  siteUrl: string
): string {
  const channelUrl = `${siteUrl}/${org.slug}/changelog`;
  const feedUrl = `${siteUrl}/rss/${org.slug}`;

  const items = releases
    .map((release) => {
      const pubDate = release.publishedAt
        ? new Date(release.publishedAt).toUTCString()
        : new Date(release.createdAt).toUTCString();

      const description = release.description
        ? escapeXml(stripHtml(release.description).slice(0, 500))
        : "";

      const title = release.version
        ? `${escapeXml(release.title)} (${escapeXml(release.version)})`
        : escapeXml(release.title);

      return `    <item>
      <title>${title}</title>
      <link>${channelUrl}</link>
      <guid isPermaLink="false">${release._id}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join("\n");

  const firstRelease = releases[0];
  const lastBuildDate = firstRelease?.publishedAt
    ? new Date(firstRelease.publishedAt).toUTCString()
    : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(org.name)} - Changelog</title>
    <link>${channelUrl}</link>
    <description>Latest updates and releases from ${escapeXml(org.name)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}
