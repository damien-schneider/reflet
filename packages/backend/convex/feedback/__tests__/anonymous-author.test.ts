import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../_generated/api";
import { authComponent } from "../../auth/auth";
import { SYSTEM_ACTOR_ID } from "../../shared/actors";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const MEMBER = {
  _id: "member",
  email: "member@example.com",
  name: "Member",
};

afterEach(() => {
  vi.restoreAllMocks();
});

test.each([
  { authorId: "anonymous:test@example.com", isMember: false },
  { authorId: "anonymous:unknown", isMember: false },
  { authorId: "anonymous:test@example.com", isMember: true },
  { authorId: "anonymous:unknown", isMember: true },
  { authorId: SYSTEM_ACTOR_ID, isMember: false },
  { authorId: SYSTEM_ACTOR_ID, isMember: true },
])(
  "non-user feedback opens with author $authorId for member=$isMember",
  async ({ authorId, isMember }) => {
    const testClient = setupTest({ authUsers: [MEMBER] });
    const feedbackId = await testClient.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx, {
        isPublic: !isMember,
      });
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId,
        role: "owner",
        userId: MEMBER._id,
      });
      return await seedFeedback(ctx, organizationId, { authorId });
    });
    vi.spyOn(authComponent, "getAnyUserById").mockRejectedValue(
      new Error("Invalid argument `id` for `db.get`: Unable to decode ID")
    );
    const viewer = isMember
      ? testClient.withIdentity({
          sessionId: MEMBER._id,
          subject: MEMBER._id,
        })
      : testClient;

    const feedback = await viewer.query(api.feedback.queries.get, {
      id: feedbackId,
    });

    expect(feedback).toMatchObject({
      _id: feedbackId,
      author: null,
      title: "Draft lost on save",
    });
  }
);
