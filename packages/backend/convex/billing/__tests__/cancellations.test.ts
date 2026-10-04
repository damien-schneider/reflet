/// <reference types="vite/client" />
import type { FunctionArgs } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import {
  type CancellationSource,
  cancellationFromStripeSubscription,
} from "../cancellations";

const PERIOD_END_SECONDS = 1_800_000_000;
const REQUESTED_SECONDS = 1_700_000_000;

const PAYING: CancellationSource = {
  cancel_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  cancellation_details: null,
  ended_at: null,
  id: "sub_1",
  items: { data: [{ current_period_end: PERIOD_END_SECONDS }] },
  status: "active",
  trial_end: null,
};

const TOO_EXPENSIVE = {
  comment: "Great product, too pricey for us right now",
  feedback: "too_expensive",
  feedback_option: null,
  reason: "cancellation_requested",
} as const;

test("a portal cancellation keeps the customer's reason and the date it takes effect", () => {
  expect(
    cancellationFromStripeSubscription({
      ...PAYING,
      cancel_at_period_end: true,
      canceled_at: REQUESTED_SECONDS,
      cancellation_details: TOO_EXPENSIVE,
    })
  ).toEqual({
    comment: TOO_EXPENSIVE.comment,
    endsAt: PERIOD_END_SECONDS * 1000,
    feedback: "too_expensive",
    reason: "cancellation_requested",
    requestedAt: REQUESTED_SECONDS * 1000,
    state: "scheduled",
    stripeSubscriptionId: "sub_1",
  });
});

test("a subscription renewing normally reads as renewing", () => {
  expect(cancellationFromStripeSubscription(PAYING)).toMatchObject({
    state: "renewing",
  });
});

test("trials ending are not churn", () => {
  expect(
    cancellationFromStripeSubscription({ ...PAYING, status: "trialing" })
  ).toBeNull();
  expect(
    cancellationFromStripeSubscription({
      ...PAYING,
      ended_at: REQUESTED_SECONDS,
      status: "canceled",
      trial_end: REQUESTED_SECONDS,
    })
  ).toBeNull();
});

const recordCancellation =
  internal.billing.cancellations.recordSubscriptionCancellation;

type RecordArgs = Omit<
  FunctionArgs<typeof recordCancellation>,
  "organizationId" | "stripeSubscriptionId"
>;

const setup = async () => {
  const t = setupTest();
  const organizationId = await t.run((ctx) => seedOrganization(ctx));
  const record = (args: RecordArgs) =>
    t.mutation(recordCancellation, {
      organizationId,
      stripeSubscriptionId: "sub_1",
      ...args,
    });
  const rows = () =>
    t.run((ctx) => ctx.db.query("subscriptionCancellations").collect());
  return { record, rows };
};

test("a cancellation is opened on request, closed when the period ends, and never duplicated by webhook replays", async () => {
  const { record, rows } = await setup();

  await record({
    endsAt: PERIOD_END_SECONDS * 1000,
    feedback: "too_expensive",
    reason: "cancellation_requested",
    requestedAt: REQUESTED_SECONDS * 1000,
    state: "scheduled",
  });
  await record({
    endsAt: PERIOD_END_SECONDS * 1000,
    feedback: "too_expensive",
    reason: "cancellation_requested",
    requestedAt: REQUESTED_SECONDS * 1000,
    state: "scheduled",
  });
  const [open, ...duplicates] = await rows();
  expect(duplicates).toEqual([]);
  expect(open).toMatchObject({
    feedback: "too_expensive",
    requestedAt: REQUESTED_SECONDS * 1000,
  });
  expect(open?.endedAt).toBeUndefined();

  await record({ reason: "cancellation_requested", state: "ended" });
  await record({ reason: "cancellation_requested", state: "ended" });
  const [ended, ...replays] = await rows();
  expect(replays).toEqual([]);
  expect(ended?.endedAt).toBeTypeOf("number");
});

test("a customer who un-cancels leaves the record resumed, and a later cancellation starts a new one", async () => {
  const { record, rows } = await setup();

  await record({ reason: "cancellation_requested", state: "scheduled" });
  await record({ state: "renewing" });
  await record({ reason: "cancellation_requested", state: "scheduled" });

  const [first, second] = await rows();
  expect(first?.resumedAt).toBeTypeOf("number");
  expect(second?.endedAt).toBeUndefined();
  expect(second?.resumedAt).toBeUndefined();
});

test("a payment failure records the churn in one step", async () => {
  const { record, rows } = await setup();

  await record({ reason: "payment_failed", state: "ended" });

  expect(await rows()).toMatchObject([{ reason: "payment_failed" }]);
  expect((await rows())[0]?.endedAt).toBeTypeOf("number");
});

test("a renewal without any open cancellation writes nothing", async () => {
  const { record, rows } = await setup();

  await record({ state: "renewing" });

  expect(await rows()).toEqual([]);
});
