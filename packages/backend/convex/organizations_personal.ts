import { mutation } from "./_generated/server";
import { getAuthUser } from "./utils";

// Helper to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

/**
 * Ensure the current user has a personal organization
 */
export const ensurePersonalOrganization = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const existingMembership = memberships[0];
    if (existingMembership) {
      const org = await ctx.db.get(existingMembership.organizationId);
      if (org) {
        return {
          id: org._id,
          name: org.name,
          slug: org.slug,
        };
      }
    }

    const orgName = "Mon Organisation";

    let slug = generateSlug(orgName);

    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existingOrg) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const orgId = await ctx.db.insert("organizations", {
      name: orgName,
      slug,
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    });

    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId: user._id,
      role: "owner",
      createdAt: Date.now(),
    });

    return {
      id: orgId,
      name: orgName,
      slug,
    };
  },
});
