import { expect, test } from "vitest";
import type { Id } from "../../_generated/dataModel";
import {
  getOrgSubscription,
  getOrgTier,
  type OrgSubscription,
} from "../org_subscription";

const ORG_ID = "org" as Id<"organizations">;

const subscription = (
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: number
): OrgSubscription => ({
  cancelAtPeriodEnd: false,
  currentPeriodEnd,
  priceId: "price_pro_monthly",
  status,
  stripeSubscriptionId,
});

const readerOf = (subscriptions: OrgSubscription[]) => ({
  runQuery: () => Promise.resolve(subscriptions),
});

test("an org keeps pro while a canceled subscription has the later period end", async () => {
  const reader = readerOf([
    subscription("sub_canceled", "canceled", 300),
    subscription("sub_renewed", "active", 200),
  ]);

  expect(await getOrgSubscription(reader, ORG_ID)).toMatchObject({
    stripeSubscriptionId: "sub_renewed",
  });
  expect(await getOrgTier(reader, ORG_ID)).toBe("pro");
});

test("an org without an entitling subscription shows its latest one and stays free", async () => {
  const reader = readerOf([
    subscription("sub_old", "canceled", 100),
    subscription("sub_retrying", "past_due", 300),
  ]);

  expect(await getOrgSubscription(reader, ORG_ID)).toMatchObject({
    stripeSubscriptionId: "sub_retrying",
  });
  expect(await getOrgTier(reader, ORG_ID)).toBe("free");
});
