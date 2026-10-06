import { describe, expect, it } from "vitest";
import { stripUrlQueriesBeforeSend } from "./posthog-url-privacy";

describe("stripUrlQueriesBeforeSend", () => {
  it("drops query strings and fragments from every url-shaped property", () => {
    const sent = stripUrlQueriesBeforeSend({
      $set_once: {
        $initial_current_url: "https://reflet.app/invite?token=abc#x",
      },
      event: "$pageview",
      properties: {
        $current_url: "https://reflet.app/unsubscribe?token=secret",
        $pathname: "/unsubscribe",
        $referrer: "https://mail.test/inbox?folder=1",
        plan: "pro?not=a-url",
      },
      uuid: "1",
    });

    expect(sent).toEqual({
      $set: undefined,
      $set_once: { $initial_current_url: "https://reflet.app/invite" },
      event: "$pageview",
      properties: {
        $current_url: "https://reflet.app/unsubscribe",
        $pathname: "/unsubscribe",
        $referrer: "https://mail.test/inbox",
        plan: "pro?not=a-url",
      },
      uuid: "1",
    });
  });

  it("passes a dropped event through", () => {
    expect(stripUrlQueriesBeforeSend(null)).toBeNull();
  });
});
