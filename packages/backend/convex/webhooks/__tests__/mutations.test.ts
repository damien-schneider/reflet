/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: ADMIN._id,
    });
    return orgId;
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  return { admin, organizationId };
};

describe("webhook URL validation", () => {
  test.each([
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3210/api",
    "http://10.0.0.5/hook",
  ])("rejects %s on create", async (url) => {
    const { admin, organizationId } = await setup();

    await expect(
      admin.mutation(api.webhooks.mutations.create, {
        events: ["feedback.created"],
        organizationId,
        url,
      })
    ).rejects.toThrow(/public/);
  });

  test("rejects an internal URL on update but keeps public ones", async () => {
    const { admin, organizationId } = await setup();
    const { webhookId } = await admin.mutation(api.webhooks.mutations.create, {
      events: ["feedback.created"],
      organizationId,
      url: "https://hooks.example.com/reflet",
    });

    await expect(
      admin.mutation(api.webhooks.mutations.update, {
        url: "http://127.0.0.1:8080/",
        webhookId,
      })
    ).rejects.toThrow(/public/);
  });
});
