import { expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import {
  applyRecordedTriage,
  seedFeedback,
  seedOrganization,
} from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const member = {
  _id: "category-member",
  email: "member@test.example",
  name: "Member",
};

async function seedCategories() {
  const t = setupTest({ authUsers: [member] });
  const ids = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const feedbackId = await seedFeedback(ctx, organizationId);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "admin",
      userId: member._id,
    });
    for (const category of [
      { isPublic: true, name: "Public" },
      { isPublic: false, name: "Private" },
      { isPublic: undefined, name: "Unconfigured" },
    ]) {
      const tagId = await ctx.db.insert("tags", {
        color: "red",
        createdAt: Date.now(),
        name: category.name,
        organizationId,
        settings:
          category.isPublic === undefined
            ? undefined
            : { isPublic: category.isPublic },
        slug: category.name.toLowerCase(),
      });
      await ctx.db.insert("feedbackTags", { feedbackId, tagId });
    }
    return { feedbackId, organizationId };
  });
  return { ...ids, t };
}

test("category lists and slug lookup honor category visibility for visitors and members", async () => {
  const { t, organizationId } = await seedCategories();
  for (const endpoint of [
    api.feedback.tags.list,
    api.feedback.tags.listPublic,
    api.organizations.tag_manager.list,
  ]) {
    const tags = await t.query(endpoint, { organizationId });
    expect(tags.map((tag) => tag.name)).toEqual(["Public"]);
  }
  expect(
    await t.query(api.feedback.tags.getBySlug, {
      organizationId,
      slug: "private",
    })
  ).toBeNull();
  const signedIn = t.withIdentity({
    sessionId: member._id,
    subject: member._id,
  });
  expect(
    (await signedIn.query(api.feedback.tags.list, { organizationId })).map(
      (tag) => tag.name
    )
  ).toEqual(["Private", "Public", "Unconfigured"]);
  expect(
    (
      await signedIn.query(api.feedback.tags.getBySlug, {
        organizationId,
        slug: "private",
      })
    )?.name
  ).toBe("Private");
});

test("public feedback projections hide team categories while member projections retain them", async () => {
  const { t, feedbackId, organizationId } = await seedCategories();
  const lists = await Promise.all([
    t.query(api.feedback.list.listByOrganization, { organizationId }),
    t.query(api.feedback.actions.listPublic, { organizationId }),
  ]);
  for (const items of lists) {
    expect(items[0].tags.map((tag) => tag?.name)).toEqual(["Public"]);
  }
  expect(
    (await t.query(api.feedback.queries.get, { id: feedbackId }))?.tags.map(
      (tag) => tag?.name
    )
  ).toEqual(["Public"]);
  expect(
    (await t.query(api.feedback.tags.getForFeedback, { feedbackId })).map(
      (tag) => tag?.name
    )
  ).toEqual(["Public"]);
  const signedIn = t.withIdentity({
    sessionId: member._id,
    subject: member._id,
  });
  const own = await signedIn.query(api.feedback.queries.get, {
    id: feedbackId,
  });
  expect(own?.tags.map((tag) => tag?.name).sort()).toEqual([
    "Private",
    "Public",
    "Unconfigured",
  ]);
  const board = await signedIn.query(api.feedback.list.listByOrganization, {
    organizationId,
  });
  expect(board[0].tags.map((tag) => tag?.name).sort()).toEqual([
    "Private",
    "Public",
    "Unconfigured",
  ]);
});

test("widget projections use public categories and authorized private context retains team categories", async () => {
  const { t, feedbackId, organizationId } = await seedCategories();
  const config = await t.query(
    internal.feedback.api_public.getOrganizationConfig,
    { organizationId }
  );
  expect(config?.tags.map((tag) => tag.name)).toEqual(["Public"]);
  const publicList = await t.query(
    internal.feedback.api_public_list.listFeedbackByOrganization,
    { organizationId }
  );
  expect(publicList.items[0].tags.map((tag) => tag.name)).toEqual(["Public"]);
  const detail = await t.query(
    internal.feedback.api_public_list.getFeedbackByOrganization,
    { feedbackId, organizationId }
  );
  expect(detail?.tags.map((tag) => tag.name)).toEqual(["Public"]);
  const privateDetail = await t.query(
    internal.feedback.api_public_list.getFeedbackByOrganization,
    { feedbackId, includePrivateContext: true, organizationId }
  );
  expect(privateDetail?.tags.map((tag) => tag.name).sort()).toEqual([
    "Private",
    "Public",
    "Unconfigured",
  ]);
});

test("a visitor cannot infer private category associations by filtering with its ID", async () => {
  const { t, feedbackId, organizationId } = await seedCategories();
  const signedIn = t.withIdentity({
    sessionId: member._id,
    subject: member._id,
  });
  const privateTag = await signedIn.query(api.feedback.tags.getBySlug, {
    organizationId,
    slug: "private",
  });
  if (!privateTag) {
    throw new Error("Missing private category");
  }
  const publicBoard = await t.query(api.feedback.list.listByOrganization, {
    organizationId,
    tagIds: [privateTag._id],
  });
  expect(publicBoard).toEqual([]);
  const publicWidget = await t.query(
    internal.feedback.api_public_list.listFeedbackByOrganization,
    { organizationId, tagId: privateTag._id }
  );
  expect(publicWidget.items).toEqual([]);
  const privateWidget = await t.query(
    internal.feedback.api_public_list.listFeedbackByOrganization,
    { includePrivateContext: true, organizationId, tagId: privateTag._id }
  );
  expect(privateWidget.items.map((item) => item.id)).toEqual([feedbackId]);
});

test("JEV still receives the team's full category catalog", async () => {
  const { t, feedbackId } = await seedCategories();
  await applyRecordedTriage(t, { feedbackId });
  const run = await t.run((ctx) => ctx.db.query("feedbackTriageRuns").first());
  expect(run?.tags.map((tag) => tag.name).sort()).toEqual([
    "Private",
    "Public",
    "Unconfigured",
  ]);
});

test("the category editor persists audience and appearance updates preserve every setting", async () => {
  const { t, organizationId } = await seedCategories();
  const signedIn = t.withIdentity({
    sessionId: member._id,
    subject: member._id,
  });
  const id = await signedIn.mutation(
    api.organizations.tag_manager_actions.create,
    {
      color: "red",
      isPublic: true,
      name: "Shared",
      organizationId,
    }
  );
  expect((await t.run((ctx) => ctx.db.get(id)))?.settings?.isPublic).toBe(true);
  await t.run((ctx) =>
    ctx.db.patch(id, {
      settings: {
        defaultStatus: "planned",
        isPublic: true,
        requireApproval: true,
      },
    })
  );
  await signedIn.mutation(api.organizations.tag_manager_actions.update, {
    color: "blue",
    id,
    name: "Renamed",
  });
  expect((await t.run((ctx) => ctx.db.get(id)))?.settings).toEqual({
    defaultStatus: "planned",
    isPublic: true,
    requireApproval: true,
  });
  await signedIn.mutation(api.organizations.tag_manager_actions.update, {
    id,
    isPublic: false,
  });
  expect((await t.run((ctx) => ctx.db.get(id)))?.settings).toEqual({
    defaultStatus: "planned",
    isPublic: false,
    requireApproval: true,
  });
});
