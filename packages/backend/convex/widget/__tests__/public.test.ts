/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { MAX_URL_LENGTH, MAX_USER_AGENT_LENGTH } from "../../shared/constants";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

describe("widget getOrCreateConversation", () => {
  test("clips oversized page metadata instead of rejecting the visitor", async () => {
    const t = setupTest();
    await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx, { isPublic: true });
      await ctx.db.insert("widgets", {
        createdAt: Date.now(),
        isActive: true,
        name: "Support",
        organizationId,
        updatedAt: Date.now(),
        widgetId: "wgt_1",
      });
    });
    const longUrl = `https://acme.test/?q=${"x".repeat(MAX_URL_LENGTH)}`;

    await t.mutation(api.widget.public.getOrCreateConversation, {
      metadata: {
        referrer: longUrl,
        url: longUrl,
        userAgent: "u".repeat(MAX_USER_AGENT_LENGTH + 1),
      },
      visitorId: "v_visitor",
      widgetId: "wgt_1",
    });

    const stored = await t.run((ctx) =>
      ctx.db.query("widgetConversations").unique()
    );
    expect(stored?.metadata?.url).toHaveLength(MAX_URL_LENGTH);
    expect(stored?.metadata?.referrer).toHaveLength(MAX_URL_LENGTH);
    expect(stored?.metadata?.userAgent).toHaveLength(MAX_USER_AGENT_LENGTH);
  });
});
