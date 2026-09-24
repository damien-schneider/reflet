/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { modules } from "../../test.helpers";
import { toPagePathPattern } from "../page_path";
import { collectPendingReview } from "../review";

describe("feedback API detail", () => {
  test("returns reporter details only for private API reads", async () => {
    const t = convexTest(schema, modules);
    const { feedbackId, organizationId } = await t.run(async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: true,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      const externalUserId = await ctx.db.insert("externalUsers", {
        createdAt: Date.now(),
        email: "reporter@example.com",
        externalId: "reporter-1",
        lastSeenAt: Date.now(),
        name: "Reporter",
        organizationId,
      });
      const feedbackId = await ctx.db.insert("feedback", {
        assigneeId: "team-user-1",
        commentCount: 0,
        context: {
          browser: "Chrome 140",
          selections: [
            {
              componentStack: ["InvoiceRow"],
              html: "<button>Retry</button>",
              label: "button Retry",
              rect: { height: 32, width: 80, x: 10, y: 20 },
              selector: "button[data-action=retry]",
              sourceLocation: "src/invoice-row.tsx:42:7",
            },
          ],
          url: "https://app.example.com/invoices/123",
        },
        createdAt: Date.now(),
        description: "Retry does nothing",
        externalUserId,
        isApproved: true,
        isPinned: false,
        organizationId,
        status: "open",
        title: "Invoice retry is broken",
        updatedAt: Date.now(),
        voteCount: 0,
      });
      await ctx.db.insert("comments", {
        body: "Additional details",
        createdAt: Date.now(),
        externalUserId,
        feedbackId,
        isOfficial: false,
        updatedAt: Date.now(),
      });
      return { feedbackId, organizationId };
    });

    const publicResult = await t.query(
      internal.feedback.api_public_list.getFeedbackByOrganization,
      { feedbackId, includePrivateContext: false, organizationId }
    );
    expect(publicResult?.context).toBeUndefined();
    expect(publicResult?.assigneeId).toBeUndefined();
    expect(publicResult?.author?.email).toBeUndefined();

    const privateResult = await t.query(
      internal.feedback.api_public_list.getFeedbackByOrganization,
      { feedbackId, includePrivateContext: true, organizationId }
    );
    expect(privateResult?.context?.url).toBe(
      "https://app.example.com/invoices/123"
    );
    expect(privateResult?.context?.selections?.[0]?.sourceLocation).toBe(
      "src/invoice-row.tsx:42:7"
    );
    expect(privateResult?.assigneeId).toBe("team-user-1");
    expect(privateResult?.author?.email).toBe("reporter@example.com");

    const publicList = await t.query(
      internal.feedback.api_public_list.listFeedbackByOrganization,
      { includePrivateContext: false, organizationId }
    );
    expect(publicList.items[0]?.author?.email).toBeUndefined();

    const privateList = await t.query(
      internal.feedback.api_public_list.listFeedbackByOrganization,
      { includePrivateContext: true, organizationId }
    );
    expect(privateList.items[0]?.author?.email).toBe("reporter@example.com");

    const publicComments = await t.query(
      internal.feedback.api_public.listCommentsByOrganization,
      { feedbackId, includePrivateContext: false, organizationId }
    );
    expect(publicComments[0]?.author?.email).toBeUndefined();

    const privateComments = await t.query(
      internal.feedback.api_public.listCommentsByOrganization,
      { feedbackId, includePrivateContext: true, organizationId }
    );
    expect(privateComments[0]?.author?.email).toBe("reporter@example.com");

    await t.run(async (ctx) => {
      await ctx.db.patch(feedbackId, { deletedAt: Date.now() });
    });
    const deletedFeedbackComments = await t.query(
      internal.feedback.api_public.listCommentsByOrganization,
      { feedbackId, includePrivateContext: false, organizationId }
    );
    expect(deletedFeedbackComments).toEqual([]);
  });
});

describe("internal feedback via the API", () => {
  test("is readable only with private context and never enters moderation", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await t.run(
      async (ctx) => await seedOrganization(ctx)
    );
    const pageUrl = "https://app.example.com/invoices/123";

    const created = await t.mutation(
      internal.feedback.api_public_write.createFeedbackByOrganization,
      {
        context: { url: pageUrl },
        description: "Totals overflow on narrow screens",
        isInternal: true,
        organizationId,
        title: "Invoice totals overflow",
      }
    );
    expect(created.isApproved).toBe(false);
    const { feedbackId } = created;

    const publicItem = await t.query(
      internal.feedback.api_public_list.getFeedbackByOrganization,
      { feedbackId, includePrivateContext: false, organizationId }
    );
    expect(publicItem).toBeNull();
    const publicList = await t.query(
      internal.feedback.api_public_list.listFeedbackByOrganization,
      { includePrivateContext: false, organizationId }
    );
    expect(publicList.items).toEqual([]);

    const privateItem = await t.query(
      internal.feedback.api_public_list.getFeedbackByOrganization,
      { feedbackId, includePrivateContext: true, organizationId }
    );
    expect(privateItem?.isInternal).toBe(true);
    expect(privateItem?.context?.url).toBe(pageUrl);
    const privateList = await t.query(
      internal.feedback.api_public_list.listFeedbackByOrganization,
      { includePrivateContext: true, organizationId }
    );
    expect(privateList.items.map((item) => item.id)).toEqual([feedbackId]);
    expect(privateList.items[0]?.isInternal).toBe(true);
    expect(privateList.items[0]?.context?.url).toBe(pageUrl);

    const pendingReview = await t.run(
      async (ctx) => await collectPendingReview(ctx, organizationId)
    );
    expect(pendingReview).toEqual([]);
  });

  test("pagePath matches the same route with different ids only", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await t.run(async (ctx) => {
      const orgId = await seedOrganization(ctx);
      await seedFeedback(ctx, orgId, {
        context: { url: "https://app.example.com/invoices/456?tab=lines" },
        title: "invoice",
      });
      await seedFeedback(ctx, orgId, {
        context: { url: "https://app.example.com/settings/team" },
        title: "team settings",
      });
      await seedFeedback(ctx, orgId, { title: "no context" });
      return orgId;
    });

    const listTitles = async (pagePath: string) => {
      const result = await t.query(
        internal.feedback.api_public_list.listFeedbackByOrganization,
        { includePrivateContext: true, organizationId, pagePath }
      );
      return result.items.map((item) => item.title);
    };

    expect(await listTitles("/invoices/123")).toEqual(["invoice"]);
    expect(await listTitles("/settings")).toEqual([]);
    expect(await listTitles("/settings/team/")).toEqual(["team settings"]);
  });

  test("page path patterns treat only id-like segments as dynamic", () => {
    expect(toPagePathPattern("https://app.example.com/")).toBe("/");
    expect(
      toPagePathPattern("/orgs/3f2b8c1e-9d4a-4f6b-8c2d-1a2b3c4d5e6f/billing")
    ).toBe(toPagePathPattern("/orgs/a1b2c3d4/billing"));
    expect(toPagePathPattern("/api/v2/users")).not.toBe(
      toPagePathPattern("/api/v3/users")
    );
    expect(toPagePathPattern("/invoices/new")).not.toBe(
      toPagePathPattern("/invoices/123")
    );
  });
});
