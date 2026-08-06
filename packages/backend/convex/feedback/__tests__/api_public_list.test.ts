/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

describe("feedback API detail", () => {
  test("returns report context only for private API reads", async () => {
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
      const feedbackId = await ctx.db.insert("feedback", {
        assigneeId: "team-user-1",
        commentCount: 0,
        context: {
          browser: "Chrome 140",
          selection: {
            componentStack: ["InvoiceRow"],
            html: "<button>Retry</button>",
            label: "button Retry",
            rect: { height: 32, width: 80, x: 10, y: 20 },
            selector: "button[data-action=retry]",
            sourceLocation: "src/invoice-row.tsx:42:7",
          },
          url: "https://app.example.com/invoices/123",
        },
        createdAt: Date.now(),
        description: "Retry does nothing",
        isApproved: true,
        isPinned: false,
        organizationId,
        status: "open",
        title: "Invoice retry is broken",
        updatedAt: Date.now(),
        voteCount: 0,
      });
      return { feedbackId, organizationId };
    });

    const publicResult = await t.query(
      internal.feedback.api_public_list.getFeedbackByOrganization,
      { feedbackId, includePrivateContext: false, organizationId }
    );
    expect(publicResult?.context).toBeUndefined();
    expect(publicResult?.assigneeId).toBeUndefined();

    const privateResult = await t.query(
      internal.feedback.api_public_list.getFeedbackByOrganization,
      { feedbackId, includePrivateContext: true, organizationId }
    );
    expect(privateResult?.context?.url).toBe(
      "https://app.example.com/invoices/123"
    );
    expect(privateResult?.context?.selection?.sourceLocation).toBe(
      "src/invoice-row.tsx:42:7"
    );
    expect(privateResult?.assigneeId).toBe("team-user-1");
  });
});
