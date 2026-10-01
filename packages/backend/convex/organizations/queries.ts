import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getOrgMembership } from "../shared/membership";
import { memberRole } from "../shared/validators";
import { organizationTables } from "./tableFields";

export type MemberOrganization = Doc<"organizations"> & {
  role: Infer<typeof memberRole>;
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const organizations = await Promise.all(
      memberships.map(
        async (membership): Promise<MemberOrganization | null> => {
          const org = await ctx.db.get(membership.organizationId);
          if (!org) {
            return null;
          }
          return {
            ...org,
            role: membership.role,
          };
        }
      )
    );

    return organizations.filter(Boolean);
  },
});

const organizationFields = organizationTables.organizations.validator.fields;

export const publicOrganizationValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("organizations"),
  feedbackSettings: organizationFields.feedbackSettings,
  hideBranding: organizationFields.hideBranding,
  isPublic: organizationFields.isPublic,
  logo: organizationFields.logo,
  name: organizationFields.name,
  primaryColor: organizationFields.primaryColor,
  slug: organizationFields.slug,
  supportEnabled: organizationFields.supportEnabled,
});

export type PublicOrganization = Infer<typeof publicOrganizationValidator>;

export const toPublicOrganization = (
  org: Doc<"organizations">
): PublicOrganization => ({
  _creationTime: org._creationTime,
  _id: org._id,
  feedbackSettings: org.feedbackSettings,
  hideBranding: org.hideBranding,
  isPublic: org.isPublic,
  logo: org.logo,
  name: org.name,
  primaryColor: org.primaryColor,
  slug: org.slug,
  supportEnabled: org.supportEnabled,
});

const viewOrganization = async (ctx: QueryCtx, org: Doc<"organizations">) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  const membership = user
    ? await getOrgMembership(ctx, org._id, user._id)
    : null;
  if (membership) {
    return { ...org, role: membership.role };
  }
  if (org.isPublic) {
    return { ...toPublicOrganization(org), role: null };
  }
  return null;
};

const organizationViewValidator = v.union(
  v.null(),
  v.object({
    ...organizationFields,
    _creationTime: v.number(),
    _id: v.id("organizations"),
    role: memberRole,
  }),
  v.object({ ...publicOrganizationValidator.fields, role: v.null() })
);

export const get = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    return org ? await viewOrganization(ctx, org) : null;
  },
  returns: organizationViewValidator,
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return org ? await viewOrganization(ctx, org) : null;
  },
  returns: organizationViewValidator,
});
