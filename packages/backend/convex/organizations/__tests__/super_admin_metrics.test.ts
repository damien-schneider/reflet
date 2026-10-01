import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../_generated/api";
import { authComponent } from "../../auth/auth";
import {
  API_ACTOR_ID,
  agentActorId,
  SYSTEM_ACTOR_ID,
} from "../../shared/actors";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = {
  _id: "admin",
  email: "admin@reflet.app",
  name: "Ada Admin",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test("recent activity names API, system and agent actors without resolving them as users", async () => {
  vi.stubEnv("SUPER_ADMIN_EMAILS", ADMIN.email);
  const testClient = setupTest({ authUsers: [ADMIN] });
  await testClient.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    for (const [index, authorId] of [
      API_ACTOR_ID,
      SYSTEM_ACTOR_ID,
      ADMIN._id,
      agentActorId("triage-bot"),
    ].entries()) {
      await ctx.db.insert("activityLogs", {
        action: `action_by_${authorId}`,
        authorId,
        createdAt: index,
        organizationId,
      });
    }
  });
  const resolveAuthUser = authComponent.getAnyUserById.bind(authComponent);
  vi.spyOn(authComponent, "getAnyUserById").mockImplementation((ctx, id) =>
    id === ADMIN._id
      ? resolveAuthUser(ctx, id)
      : Promise.reject(
          new Error("Invalid argument `id` for `db.get`: Unable to decode ID")
        )
  );

  const activity = await testClient
    .withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id })
    .query(api.organizations.super_admin_metrics.getRecentActivity, {});

  expect(
    Object.fromEntries(activity.map((entry) => [entry.action, entry.userName]))
  ).toEqual({
    [`action_by_${ADMIN._id}`]: ADMIN.name,
    [`action_by_${API_ACTOR_ID}`]: "API",
    [`action_by_${SYSTEM_ACTOR_ID}`]: "System",
    [`action_by_${agentActorId("triage-bot")}`]: "triage-bot",
  });
});
