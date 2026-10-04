/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { seedBranchingSurvey } from "./branching_seed";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };
const UNSAFE = "Button links must start with http:// or https://.";

describe("survey button links", () => {
  it("rejects script links on every write path and keeps http(s) and relative ones", async () => {
    const t = setupTest({ authUsers: [ADMIN] });
    const { organizationId, surveyId, love } = await t.run(async (ctx) => {
      const orgId = await seedOrganization(ctx);
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role: "owner",
        userId: ADMIN._id,
      });
      return {
        organizationId: orgId,
        ...(await seedBranchingSurvey(ctx, orgId, { status: "draft" })),
      };
    });
    const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
    const statement = {
      config: { buttonUrl: "javascript:alert(1)" },
      required: false,
      title: "Read our docs",
      type: "statement" as const,
    };

    await expect(
      admin.mutation(api.surveys.mutations.create, {
        organizationId,
        questions: [statement],
        title: "Docs",
        triggerType: "manual",
      })
    ).rejects.toThrow(UNSAFE);
    await expect(
      admin.mutation(api.surveys.mutations.addQuestion, {
        question: statement,
        surveyId,
      })
    ).rejects.toThrow(UNSAFE);
    await expect(
      admin.mutation(api.surveys.mutations.updateQuestion, {
        config: { buttonUrl: "data:text/html,hi" },
        questionId: love,
      })
    ).rejects.toThrow(UNSAFE);
    await expect(
      admin.mutation(api.surveys.mutations.update, {
        endings: [
          { buttonUrl: "javascript:void(0)", id: "end", title: "Thanks" },
        ],
        surveyId,
      })
    ).rejects.toThrow(UNSAFE);

    await admin.mutation(api.surveys.mutations.update, {
      endings: [
        { buttonUrl: "https://acme.com/docs", id: "promoter", title: "Fan" },
        { buttonUrl: "/pricing", id: "detractor", title: "Sorry" },
      ],
      surveyId,
    });
  });
});
