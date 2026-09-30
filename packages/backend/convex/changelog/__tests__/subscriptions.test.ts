/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import { scheduledFunctionNames, seedOrganization } from "../../test.fixtures";
import { type AuthTestUser, setupTest } from "../../test.helpers";

const CONFIRMATION_EMAIL = "email/renderer:sendSubscriptionConfirmationEmail";
const VICTIM = "victim@example.com";

const setup = async (authUsers: AuthTestUser[] = []) => {
  const t = setupTest({ authUsers });
  const organizationId = await t.run((ctx) => seedOrganization(ctx));
  const notifiedEmails = async () => {
    const subscribers = await t.query(
      internal.changelog.subscriptions.getSubscribersByOrganization,
      { organizationId }
    );
    return subscribers.map((subscriber) => subscriber.email);
  };
  const subscriberRow = (email: string) =>
    t.run((ctx) =>
      ctx.db
        .query("changelogSubscribers")
        .withIndex("by_email_org", (q) =>
          q.eq("email", email).eq("organizationId", organizationId)
        )
        .unique()
    );
  const confirmationEmailCount = async () => {
    const names = await t.run((ctx) => scheduledFunctionNames(ctx));
    return names.filter((name) => name === CONFIRMATION_EMAIL).length;
  };
  return {
    confirmationEmailCount,
    notifiedEmails,
    organizationId,
    subscriberRow,
    t,
  };
};

const subscribeMany = async (
  subscribe: (email: string) => Promise<null>,
  emails: string[]
) => {
  for (const email of emails) {
    await subscribe(email);
  }
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("changelog email subscriptions", () => {
  test("an anonymous subscription is not notified until its confirmation link is used", async () => {
    const {
      confirmationEmailCount,
      notifiedEmails,
      organizationId,
      subscriberRow,
      t,
    } = await setup();

    await t.mutation(api.changelog.subscriptions.subscribeByEmail, {
      email: ` ${VICTIM.toUpperCase()} `,
      organizationId,
    });

    expect(await notifiedEmails()).toEqual([]);
    expect(await confirmationEmailCount()).toBe(1);

    const token = (await subscriberRow(VICTIM))?.confirmationToken;
    expect(token).toBeDefined();
    await t.mutation(api.changelog.subscriptions.confirmByToken, {
      token: token ?? "",
    });

    expect(await notifiedEmails()).toEqual([VICTIM]);
    await expect(
      t.mutation(api.changelog.subscriptions.confirmByToken, {
        token: token ?? "",
      })
    ).rejects.toThrow("Invalid or expired confirmation link");
  });

  test("subscribers stored before double opt-in keep receiving releases", async () => {
    const { notifiedEmails, organizationId, t } = await setup();
    await t.run((ctx) =>
      ctx.db.insert("changelogSubscribers", {
        email: "legacy@example.com",
        organizationId,
        subscribedAt: Date.now(),
        unsubscribeToken: "legacy-token",
      })
    );

    expect(await notifiedEmails()).toEqual(["legacy@example.com"]);
  });

  test("re-subscribing a pending address stops sending confirmations at the per-address limit", async () => {
    const { confirmationEmailCount, organizationId, t } = await setup();
    const subscribe = (email: string) =>
      t.mutation(api.changelog.subscriptions.subscribeByEmail, {
        email,
        organizationId,
      });

    await subscribeMany(subscribe, [VICTIM, VICTIM, VICTIM]);

    await expect(subscribe(VICTIM)).rejects.toThrow("RateLimited");
    expect(await confirmationEmailCount()).toBe(3);
  });

  test("anonymous subscriptions to one organization are rate limited", async () => {
    const { organizationId, t } = await setup();
    const subscribe = (email: string) =>
      t.mutation(api.changelog.subscriptions.subscribeByEmail, {
        email,
        organizationId,
      });

    await subscribeMany(
      subscribe,
      Array.from({ length: 20 }, (_, index) => `user${index}@example.com`)
    );

    await expect(subscribe("one-too-many@example.com")).rejects.toThrow(
      "RateLimited"
    );
  });

  test("rejects addresses longer than 254 characters", async () => {
    const { organizationId, t } = await setup();

    await expect(
      t.mutation(api.changelog.subscriptions.subscribeByEmail, {
        email: `${"a".repeat(250)}@example.com`,
        organizationId,
      })
    ).rejects.toThrow("Invalid email format");
  });

  test("a signed-in user subscribing their own verified address skips confirmation", async () => {
    const owner = {
      _id: "user_owner",
      email: "Owner@Example.com",
      emailVerified: true,
    };
    const unverified = {
      _id: "user_unverified",
      email: "unverified@example.com",
      emailVerified: false,
    };
    const { confirmationEmailCount, notifiedEmails, organizationId, t } =
      await setup([owner, unverified]);
    const as = (userId: string) =>
      t.withIdentity({ sessionId: userId, subject: userId });

    await as(owner._id).mutation(api.changelog.subscriptions.subscribeByEmail, {
      email: owner.email,
      organizationId,
    });
    await as(owner._id).mutation(api.changelog.subscriptions.subscribeByEmail, {
      email: VICTIM,
      organizationId,
    });
    await as(unverified._id).mutation(
      api.changelog.subscriptions.subscribeByEmail,
      { email: unverified.email, organizationId }
    );

    expect(await notifiedEmails()).toEqual(["owner@example.com"]);
    expect(await confirmationEmailCount()).toBe(2);
  });
});
