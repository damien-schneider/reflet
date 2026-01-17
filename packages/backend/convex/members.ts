import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthUser } from "./utils";

/**
 * List all members of an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Verify user is a member of this org
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    // Get all members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Fetch user details for each member from Better Auth
    const membersWithUserInfo = await Promise.all(
      members.map(async (member) => {
        // Get user info from Better Auth
        const userData = await authComponent.getAnyUserById(ctx, member.userId);

        return {
          ...member,
          user: userData
            ? {
                name: userData.name ?? null,
                email: userData.email ?? null,
                image: userData.image ?? null,
              }
            : null,
        };
      })
    );

    return membersWithUserInfo;
  },
});

/**
 * Get current user's membership in an organization
 */
export const getMembership = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    return membership;
  },
});

/**
 * Remove a member from the organization
 */
export const remove = mutation({
  args: {
    organizationId: v.id("organizations"),
    memberId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Get the membership to remove
    const memberToRemove = await ctx.db.get(args.memberId);
    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    if (memberToRemove.organizationId !== args.organizationId) {
      throw new Error("Member does not belong to this organization");
    }

    // Check current user's permission
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!currentMembership) {
      throw new Error("You are not a member of this organization");
    }

    // Only owner can remove admins
    if (memberToRemove.role === "admin" && currentMembership.role !== "owner") {
      throw new Error("Only the owner can remove admins");
    }

    // Cannot remove owner
    if (memberToRemove.role === "owner") {
      throw new Error("Cannot remove the owner");
    }

    // Members can only remove themselves
    if (
      currentMembership.role === "member" &&
      memberToRemove.userId !== user._id
    ) {
      throw new Error("You don't have permission to remove members");
    }

    await ctx.db.delete(args.memberId);
    return true;
  },
});

/**
 * Update a member's role
 */
export const updateRole = mutation({
  args: {
    memberId: v.id("organizationMembers"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const memberToUpdate = await ctx.db.get(args.memberId);
    if (!memberToUpdate) {
      throw new Error("Member not found");
    }

    // Cannot change owner's role
    if (memberToUpdate.role === "owner") {
      throw new Error("Cannot change the owner's role");
    }

    // Check current user's permission
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", memberToUpdate.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!currentMembership) {
      throw new Error("You are not a member of this organization");
    }

    // Only owner can change roles to/from admin
    if (
      (memberToUpdate.role === "admin" || args.role === "admin") &&
      currentMembership.role !== "owner"
    ) {
      throw new Error("Only the owner can manage admin roles");
    }

    // Admins can only change members to members (no-op)
    if (currentMembership.role === "admin" && args.role === "admin") {
      throw new Error("Only the owner can promote members to admin");
    }

    await ctx.db.patch(args.memberId, { role: args.role });
    return true;
  },
});

/**
 * Transfer ownership to another member
 */
export const transferOwnership = mutation({
  args: {
    organizationId: v.id("organizations"),
    newOwnerId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check current user is owner
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!currentMembership || currentMembership.role !== "owner") {
      throw new Error("Only the owner can transfer ownership");
    }

    // Get new owner
    const newOwnerMembership = await ctx.db.get(args.newOwnerId);
    if (!newOwnerMembership) {
      throw new Error("New owner not found");
    }

    if (newOwnerMembership.organizationId !== args.organizationId) {
      throw new Error("New owner is not a member of this organization");
    }

    // Transfer ownership
    await ctx.db.patch(currentMembership._id, { role: "admin" });
    await ctx.db.patch(args.newOwnerId, { role: "owner" });

    return true;
  },
});

/**
 * Leave an organization
 */
export const leave = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role === "owner") {
      throw new Error(
        "Owner cannot leave. Transfer ownership first or delete the organization."
      );
    }

    await ctx.db.delete(membership._id);
    return true;
  },
});
