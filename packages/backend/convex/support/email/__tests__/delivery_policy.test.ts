import { describe, expect, test } from "vitest";
import { chooseCustomerDelivery } from "../delivery_policy";

const VERIFIED_DOMAIN = {
  fromAddress: "help@support.acme.test",
  status: "verified" as const,
};
const CONFIRMED = { email: "jane@example.com", verified: true };
const UNCONFIRMED = { email: "jane@example.com", verified: false };

const base = {
  domain: null,
  isPro: false,
  paused: false,
  recipient: CONFIRMED,
  suppressed: false,
};

describe("chooseCustomerDelivery", () => {
  test("no recipient email wins over everything", () => {
    expect(
      chooseCustomerDelivery({
        ...base,
        domain: VERIFIED_DOMAIN,
        isPro: true,
        paused: true,
        recipient: null,
        suppressed: true,
      })
    ).toEqual({ kind: "none", reason: "no_email" });
  });

  test("a suppressed recipient is never emailed, even on a paused org", () => {
    expect(
      chooseCustomerDelivery({ ...base, paused: true, suppressed: true })
    ).toEqual({ kind: "none", reason: "suppressed" });
  });

  test("a paused org sends nothing, even with a verified domain", () => {
    expect(
      chooseCustomerDelivery({
        ...base,
        domain: VERIFIED_DOMAIN,
        isPro: true,
        paused: true,
      })
    ).toEqual({ kind: "none", reason: "paused" });
  });

  test("Pro with a verified domain sends the full reply, even to an unconfirmed address", () => {
    expect(
      chooseCustomerDelivery({
        ...base,
        domain: VERIFIED_DOMAIN,
        isPro: true,
        recipient: UNCONFIRMED,
      })
    ).toEqual({
      from: VERIFIED_DOMAIN.fromAddress,
      kind: "full",
      to: UNCONFIRMED.email,
    });
  });

  test("a verified domain on the free plan falls back to the notice", () => {
    expect(
      chooseCustomerDelivery({ ...base, domain: VERIFIED_DOMAIN })
    ).toEqual({ kind: "notice", to: CONFIRMED.email });
  });

  test("Pro with a pending domain sends the notice to a confirmed address", () => {
    expect(
      chooseCustomerDelivery({
        ...base,
        domain: { ...VERIFIED_DOMAIN, status: "pending" },
        isPro: true,
      })
    ).toEqual({ kind: "notice", to: CONFIRMED.email });
  });

  test("an unconfirmed address without a full domain gets nothing", () => {
    expect(chooseCustomerDelivery({ ...base, recipient: UNCONFIRMED })).toEqual(
      { kind: "none", reason: "unverified_contact" }
    );
  });
});
