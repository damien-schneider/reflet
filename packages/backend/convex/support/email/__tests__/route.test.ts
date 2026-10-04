import { describe, expect, test } from "vitest";
import { routeInbound } from "../inbound/route";

const DOMAIN = "inbox.reflet.app";

const route = (input: {
  inReplyTo?: string;
  recipients: string[];
  references?: string[];
}) =>
  routeInbound({
    inboundDomain: DOMAIN,
    references: [],
    ...input,
  });

describe("routeInbound", () => {
  test("a reply token address wins over an org alias", () => {
    expect(
      route({
        recipients: ["acme-1a2b@inbox.reflet.app", "r+abc123@inbox.reflet.app"],
      })
    ).toEqual([
      { kind: "thread", token: "abc123" },
      { alias: "acme-1a2b", kind: "alias" },
    ]);
  });

  test("finds an alias that only appears in forwarded-for recipients", () => {
    expect(
      route({
        recipients: [
          "Damien <damien@gmail.com>",
          "Acme Support <ACME-1A2B@Inbox.Reflet.App>",
        ],
      })
    ).toEqual([{ alias: "acme-1a2b", kind: "alias" }]);
  });

  test("falls back to the thread token in In-Reply-To, then References newest first", () => {
    expect(
      route({
        inReplyTo: "<M.k57abc.TOKENA@INBOX.REFLET.APP>",
        recipients: ["damien@gmail.com"],
        references: [
          "<m.k57old.tokenc@inbox.reflet.app>",
          "<other@mail.gmail.com>",
          "<m.k57new.tokenb@inbox.reflet.app>",
        ],
      })
    ).toEqual([
      { kind: "thread", token: "tokena" },
      { kind: "thread", token: "tokenb" },
      { kind: "thread", token: "tokenc" },
    ]);
  });

  test("ignores message ids from other domains", () => {
    expect(
      route({
        inReplyTo: "<m.k57abc.tokena@evil.example>",
        recipients: ["someone@example.com"],
      })
    ).toEqual([]);
  });

  test("addresses outside the inbound domain are unrouted", () => {
    expect(route({ recipients: ["r+abc@other.app", "help@acme.com"] })).toEqual(
      []
    );
  });
});
