/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createOrg } from "./test-helpers";

const testSchema = schema as any;

describe("admin_api_members", () => {
  test("listMembers should return org members", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("organizationMembers", {
        organizationId: orgId,
        userId: "user-1",
        role: "admin",
        createdAt: Date.now(),
      });
      await ctx.db.insert("organizationMembers", {
        organizationId: orgId,
        userId: "user-2",
        role: "member",
        createdAt: Date.now(),
      });
    });

    const members = await t.query(internal.admin_api.members.listMembers, {
      organizationId: orgId,
    });

    expect(members).toHaveLength(2);
    expect(members.map((m: { userId: string }) => m.userId).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
  });

  test("createInvitation should create a pending invitation", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const result = await t.mutation(
      internal.admin_api.members.createInvitation,
      {
        organizationId: orgId,
        email: "test@example.com",
        role: "member",
      }
    );

    expect(result.id).toBeDefined();

    const invitations = await t.query(
      internal.admin_api.members.listInvitations,
      { organizationId: orgId }
    );

    expect(invitations).toHaveLength(1);
    expect(invitations[0].email).toBe("test@example.com");
    expect(invitations[0].role).toBe("member");
    expect(invitations[0].status).toBe("pending");
  });

  test("createInvitation should reject duplicate pending invitation", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.members.createInvitation, {
      organizationId: orgId,
      email: "dup@example.com",
      role: "member",
    });

    await expect(
      t.mutation(internal.admin_api.members.createInvitation, {
        organizationId: orgId,
        email: "dup@example.com",
        role: "admin",
      })
    ).rejects.toThrow("An invitation for this email is already pending");
  });

  test("cancelInvitation should delete pending invitation", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: invitationId } = await t.mutation(
      internal.admin_api.members.createInvitation,
      {
        organizationId: orgId,
        email: "cancel@example.com",
        role: "member",
      }
    );

    await t.mutation(internal.admin_api.members.cancelInvitation, {
      organizationId: orgId,
      invitationId,
    });

    const invitations = await t.query(
      internal.admin_api.members.listInvitations,
      { organizationId: orgId }
    );
    expect(invitations).toHaveLength(0);
  });

  test("cancelInvitation should reject non-pending invitation", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    // Create invitation manually with accepted status
    const invitationId = await t.run(async (ctx) =>
      ctx.db.insert("invitations", {
        organizationId: orgId,
        email: "accepted@example.com",
        role: "member",
        status: "accepted",
        expiresAt: Date.now() + 86_400_000,
        createdAt: Date.now(),
        inviterId: "user-1",
        token: "test-token",
      })
    );

    await expect(
      t.mutation(internal.admin_api.members.cancelInvitation, {
        organizationId: orgId,
        invitationId,
      })
    ).rejects.toThrow("Can only cancel pending invitations");
  });

  test("cancelInvitation should reject wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Other",
        slug: "other",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      })
    );

    const { id: invitationId } = await t.mutation(
      internal.admin_api.members.createInvitation,
      {
        organizationId: orgId,
        email: "test@example.com",
        role: "member",
      }
    );

    await expect(
      t.mutation(internal.admin_api.members.cancelInvitation, {
        organizationId: otherOrgId,
        invitationId,
      })
    ).rejects.toThrow("Invitation not found");
  });
});
