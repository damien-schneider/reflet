/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { setupTest } from "../../test.helpers";

const ALICE = { _id: "user_alice", email: "alice@example.com" };
const MALLORY = { _id: "user_mallory", email: "mallory@example.com" };
const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send/alice-token";

const setup = () => {
  const t = setupTest({ authUsers: [ALICE, MALLORY] });
  const as = (user: typeof ALICE) =>
    t.withIdentity({ sessionId: user._id, subject: user._id });
  return { as, t };
};

const keys = { auth: "auth-key", p256dh: "p256dh-key" };

describe("push subscribe", () => {
  test.each([
    "http://fcm.googleapis.com/fcm/send/x",
    "https://169.254.169.254/latest/meta-data",
    "https://fcm.googleapis.com.attacker.example/x",
    "https://fcm.googleapis.com:8443/x",
    "not a url",
  ])("rejects non-push-service endpoint %s", async (endpoint) => {
    const { as } = setup();
    await expect(
      as(MALLORY).mutation(api.notifications.push_queries.subscribe, {
        ...keys,
        endpoint,
      })
    ).rejects.toThrow("Unsupported push endpoint");
  });

  test("accepts known push services", async () => {
    const { as } = setup();
    for (const endpoint of [
      FCM_ENDPOINT,
      "https://updates.push.services.mozilla.com/wpush/v2/x",
      "https://web.push.apple.com/x",
      "https://wns2-par02p.notify.windows.com/w/?token=x",
    ]) {
      await as(ALICE).mutation(api.notifications.push_queries.subscribe, {
        ...keys,
        endpoint,
      });
    }
    const subscriptions = await as(ALICE).query(
      api.notifications.push_queries.getUserSubscriptions,
      {}
    );
    expect(subscriptions).toHaveLength(4);
  });

  test("refuses to take over another user's endpoint", async () => {
    const { as, t } = setup();
    await as(ALICE).mutation(api.notifications.push_queries.subscribe, {
      ...keys,
      endpoint: FCM_ENDPOINT,
    });

    await expect(
      as(MALLORY).mutation(api.notifications.push_queries.subscribe, {
        auth: "mallory-auth",
        endpoint: FCM_ENDPOINT,
        p256dh: "mallory-p256dh",
      })
    ).rejects.toThrow("Push endpoint is registered to another user");

    const stored = await t.run((ctx) =>
      ctx.db
        .query("pushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", FCM_ENDPOINT))
        .unique()
    );
    expect(stored).toMatchObject({ ...keys, userId: ALICE._id });
  });
});
