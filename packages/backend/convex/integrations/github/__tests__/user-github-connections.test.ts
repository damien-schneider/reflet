/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testSchema = schema as any;

const createOrg = async (t: ReturnType<typeof convexTest>, slug = "test-org") =>
  t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: false,
      name: "Test Org",
      slug,
      subscriptionStatus: "none",
      subscriptionTier: "free",
    })
  );

const createMember = async (
  t: ReturnType<typeof convexTest>,
  orgId: Awaited<ReturnType<typeof createOrg>>,
  userId: string,
  role: "owner" | "admin" | "member" = "admin"
) =>
  t.run(async (ctx) =>
    ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role,
      userId,
    })
  );

// ============================================
// saveUserInstallation
// ============================================

describe("saveUserInstallation", () => {
  test("should create a new user GitHub connection", async () => {
    const t = convexTest(testSchema, modules);

    const connectionId = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountAvatarUrl: "https://github.com/octocat.png",
        accountLogin: "octocat",
        accountType: "user",
        installationId: "inst_456",
        userId: "user_123",
      }
    );

    expect(connectionId).toBeDefined();

    const connection = await t.run(async (ctx) => ctx.db.get(connectionId));
    expect(connection).not.toBeNull();
    expect(connection?.userId).toBe("user_123");
    expect(connection?.installationId).toBe("inst_456");
    expect(connection?.accountLogin).toBe("octocat");
    expect(connection?.status).toBe("connected");
  });

  test("should upsert when user already has a connection", async () => {
    const t = convexTest(testSchema, modules);

    const firstId = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "old-user",
        accountType: "user",
        installationId: "inst_old",
        userId: "user_123",
      }
    );

    const secondId = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "new-org",
        accountType: "organization",
        installationId: "inst_new",
        userId: "user_123",
      }
    );

    expect(secondId).toBe(firstId);

    const connection = await t.run(async (ctx) => ctx.db.get(firstId));
    expect(connection?.installationId).toBe("inst_new");
    expect(connection?.accountLogin).toBe("new-org");
    expect(connection?.accountType).toBe("organization");
    expect(connection?.status).toBe("connected");
  });
});

// ============================================
// getOrgAvailableInstallations
// ============================================

describe("getOrgAvailableInstallations", () => {
  test("should return installations from org members", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");
    await createMember(t, orgId, "user_B", "member");

    // user_A has a GitHub connection
    await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "user-a-github",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    const installations = await t.query(
      internal.integrations.github.queries.getOrgAvailableInstallations,
      { organizationId: orgId }
    );

    expect(installations).toHaveLength(1);
    expect(installations[0].accountLogin).toBe("user-a-github");
    expect(installations[0].userId).toBe("user_A");
  });

  test("should return multiple installations from different members", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");
    await createMember(t, orgId, "user_B", "admin");

    await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "user-a-github",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "org-beta",
        accountType: "organization",
        installationId: "inst_B",
        userId: "user_B",
      }
    );

    const installations = await t.query(
      internal.integrations.github.queries.getOrgAvailableInstallations,
      { organizationId: orgId }
    );

    expect(installations).toHaveLength(2);
    const logins = installations.map(
      (i: { accountLogin: string }) => i.accountLogin
    );
    expect(logins).toContain("user-a-github");
    expect(logins).toContain("org-beta");
  });

  test("should exclude disconnected installations", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");

    const connectionId = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "user-a-github",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    // Manually mark as error (simulating disconnected state)
    await t.run(async (ctx) => {
      await ctx.db.patch(connectionId, { status: "error" });
    });

    const installations = await t.query(
      internal.integrations.github.queries.getOrgAvailableInstallations,
      { organizationId: orgId }
    );

    expect(installations).toHaveLength(0);
  });

  test("should return empty when no members have GitHub", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");

    const installations = await t.query(
      internal.integrations.github.queries.getOrgAvailableInstallations,
      { organizationId: orgId }
    );

    expect(installations).toHaveLength(0);
  });
});

// ============================================
// linkRepoToOrg
// ============================================

describe("linkRepoToOrg", () => {
  test("should create a new org repo link", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");

    const userConnectionId = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountAvatarUrl: "https://github.com/octocat.png",
        accountLogin: "octocat",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    const connectionId = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_A",
        organizationId: orgId,
        userGithubConnectionId: userConnectionId,
      }
    );

    expect(connectionId).toBeDefined();

    const connection = await t.run(async (ctx) => ctx.db.get(connectionId));
    expect(connection?.organizationId).toBe(orgId);
    expect(connection?.installationId).toBe("inst_A");
    expect(connection?.accountLogin).toBe("octocat");
    expect(connection?.linkedByUserId).toBe("user_A");
    expect(connection?.status).toBe("connected");
  });

  test("should update existing org connection when re-linking", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");
    await createMember(t, orgId, "user_B", "admin");

    const userConnA = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "user-a",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    // First link by user A
    const firstConnectionId = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_A",
        organizationId: orgId,
        userGithubConnectionId: userConnA,
      }
    );

    const userConnB = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "org-beta",
        accountType: "organization",
        installationId: "inst_B",
        userId: "user_B",
      }
    );

    // Re-link by user B
    const secondConnectionId = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_B",
        organizationId: orgId,
        userGithubConnectionId: userConnB,
      }
    );

    expect(secondConnectionId).toBe(firstConnectionId);

    const connection = await t.run(async (ctx) =>
      ctx.db.get(firstConnectionId)
    );
    expect(connection?.installationId).toBe("inst_B");
    expect(connection?.accountLogin).toBe("org-beta");
    expect(connection?.linkedByUserId).toBe("user_B");
  });

  test("should throw when userGithubConnection not found", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    // Create a fake ID that doesn't exist
    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("userGithubConnections", {
        accountLogin: "temp",
        accountType: "user",
        createdAt: Date.now(),
        installationId: "temp",
        status: "connected",
        updatedAt: Date.now(),
        userId: "temp",
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(internal.integrations.github.mutations.linkRepoToOrg, {
        linkedByUserId: "user_A",
        organizationId: orgId,
        userGithubConnectionId: fakeId,
      })
    ).rejects.toThrow("User GitHub connection not found");
  });
});

// ============================================
// handleMemberRemoved
// ============================================

describe("handleMemberRemoved", () => {
  test("should mark connections as owner_left when linking user leaves", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");

    const userConn = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "octocat",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    const connectionId = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_A",
        organizationId: orgId,
        userGithubConnectionId: userConn,
      }
    );

    await t.mutation(
      internal.integrations.github.mutations.handleMemberRemoved,
      {
        organizationId: orgId,
        userId: "user_A",
      }
    );

    const connection = await t.run(async (ctx) => ctx.db.get(connectionId));
    expect(connection?.status).toBe("owner_left");
  });

  test("should not affect connections linked by other users", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");
    await createMember(t, orgId, "user_B", "admin");

    const userConnB = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "user-b",
        accountType: "user",
        installationId: "inst_B",
        userId: "user_B",
      }
    );

    const connectionId = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_B",
        organizationId: orgId,
        userGithubConnectionId: userConnB,
      }
    );

    // Remove user_A (who didn't link anything)
    await t.mutation(
      internal.integrations.github.mutations.handleMemberRemoved,
      {
        organizationId: orgId,
        userId: "user_A",
      }
    );

    const connection = await t.run(async (ctx) => ctx.db.get(connectionId));
    expect(connection?.status).toBe("connected");
  });
});

// ============================================
// handleInstallationDeleted (updated)
// ============================================

describe("handleInstallationDeleted (updated)", () => {
  test("should clean up userGithubConnections and all org connections", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await createMember(t, orgId, "user_A", "admin");

    const userConnId = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "octocat",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    const orgConnectionId = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_A",
        organizationId: orgId,
        userGithubConnectionId: userConnId,
      }
    );

    const result = await t.mutation(
      internal.integrations.github.mutations.handleInstallationDeleted,
      { installationId: "inst_A" }
    );

    expect(result.deleted).toBe(true);

    // User connection should be marked as disconnected (error status used since "disconnected" is not a valid status)
    const userConn = await t.run(async (ctx) => ctx.db.get(userConnId));
    expect(userConn?.status).toBe("error");

    // Org connection should be deleted
    const orgConn = await t.run(async (ctx) => ctx.db.get(orgConnectionId));
    expect(orgConn).toBeNull();
  });

  test("should handle deletion when installation spans multiple orgs", async () => {
    const t = convexTest(testSchema, modules);
    const orgId1 = await createOrg(t, "org-1");
    const orgId2 = await createOrg(t, "org-2");
    await createMember(t, orgId1, "user_A", "admin");
    await createMember(t, orgId2, "user_A", "admin");

    const userConnId = await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "octocat",
        accountType: "user",
        installationId: "inst_A",
        userId: "user_A",
      }
    );

    const connId1 = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_A",
        organizationId: orgId1,
        userGithubConnectionId: userConnId,
      }
    );

    const connId2 = await t.mutation(
      internal.integrations.github.mutations.linkRepoToOrg,
      {
        linkedByUserId: "user_A",
        organizationId: orgId2,
        userGithubConnectionId: userConnId,
      }
    );

    await t.mutation(
      internal.integrations.github.mutations.handleInstallationDeleted,
      { installationId: "inst_A" }
    );

    // Both org connections should be deleted
    const conn1 = await t.run(async (ctx) => ctx.db.get(connId1));
    const conn2 = await t.run(async (ctx) => ctx.db.get(connId2));
    expect(conn1).toBeNull();
    expect(conn2).toBeNull();
  });
});

// ============================================
// getUserGithubConnection
// ============================================

describe("getUserGithubConnection", () => {
  test("should return user connection by userId", async () => {
    const t = convexTest(testSchema, modules);

    await t.mutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountLogin: "octocat",
        accountType: "user",
        installationId: "inst_456",
        userId: "user_123",
      }
    );

    const connection = await t.query(
      internal.integrations.github.queries.getUserGithubConnection,
      { userId: "user_123" }
    );

    expect(connection).not.toBeNull();
    expect(connection?.accountLogin).toBe("octocat");
  });

  test("should return null when user has no connection", async () => {
    const t = convexTest(testSchema, modules);

    const connection = await t.query(
      internal.integrations.github.queries.getUserGithubConnection,
      { userId: "nonexistent" }
    );

    expect(connection).toBeNull();
  });
});
