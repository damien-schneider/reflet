/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api";
import { scheduledFunctionNames, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const VICTIM = "victim@example.com";

const setup = async () => {
  const t = setupTest();
  const organizationId = await t.run((ctx) => seedOrganization(ctx));
  const subscriberRow = () =>
    t.run((ctx) =>
      ctx.db
        .query("statusSubscribers")
        .withIndex("by_email_org", (q) =>
          q.eq("email", VICTIM).eq("organizationId", organizationId)
        )
        .unique()
    );
  const subscribe = (email: string) =>
    t.mutation(api.status.subscriptions.subscribe, { email, organizationId });
  return { subscribe, subscriberRow, t };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("status email subscriptions", () => {
  test("an anonymous subscription stays pending until its confirmation link is used", async () => {
    const { subscribe, subscriberRow, t } = await setup();

    await subscribe(VICTIM);

    const token = (await subscriberRow())?.confirmationToken;
    expect(token).toBeDefined();
    expect(await t.run((ctx) => scheduledFunctionNames(ctx))).toEqual([
      "email/renderer:sendSubscriptionConfirmationEmail",
    ]);

    await t.mutation(api.status.subscriptions.confirm, { token: token ?? "" });

    const confirmed = await subscriberRow();
    expect(confirmed?.email).toBe(VICTIM);
    expect(confirmed?.confirmationToken).toBeUndefined();
  });

  test("re-subscribing a pending address stops sending confirmations at the per-address limit", async () => {
    const { subscribe } = await setup();

    await subscribe(VICTIM);
    await subscribe(VICTIM);
    await subscribe(VICTIM);

    await expect(subscribe(VICTIM)).rejects.toThrow("RateLimited");
  });

  test("rejects addresses longer than 254 characters", async () => {
    const { subscribe } = await setup();

    await expect(subscribe(`${"a".repeat(250)}@example.com`)).rejects.toThrow(
      "Invalid email format"
    );
  });
});
