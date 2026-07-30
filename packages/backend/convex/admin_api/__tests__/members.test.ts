/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createOrg } from "./test_helpers";

const testSchema = schema as any;

describe("admin_api_members", () => {
  test("listMembers should return org members", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role: "admin",
        userId: "user-1",
      });
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role: "member",
        userId: "user-2",
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
        email: "test@example.com",
        organizationId: orgId,
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
      email: "dup@example.com",
      organizationId: orgId,
      role: "member",
    });

    await expect(
      t.mutation(internal.admin_api.members.createInvitation, {
        email: "dup@example.com",
        organizationId: orgId,
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
        email: "cancel@example.com",
        organizationId: orgId,
        role: "member",
      }
    );

    await t.mutation(internal.admin_api.members.cancelInvitation, {
      invitationId,
      organizationId: orgId,
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
        createdAt: Date.now(),
        email: "accepted@example.com",
        expiresAt: Date.now() + 86_400_000,
        inviterId: "user-1",
        organizationId: orgId,
        role: "member",
        status: "accepted",
        token: "test-token",
      })
    );

    await expect(
      t.mutation(internal.admin_api.members.cancelInvitation, {
        invitationId,
        organizationId: orgId,
      })
    ).rejects.toThrow("Can only cancel pending invitations");
  });

  test("cancelInvitation should reject wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Other",
        slug: "other",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
    );

    const { id: invitationId } = await t.mutation(
      internal.admin_api.members.createInvitation,
      {
        email: "test@example.com",
        organizationId: orgId,
        role: "member",
      }
    );

    await expect(
      t.mutation(internal.admin_api.members.cancelInvitation, {
        invitationId,
        organizationId: otherOrgId,
      })
    ).rejects.toThrow("Invitation not found");
  });
});
