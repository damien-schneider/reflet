import { describe, expect, it } from "vitest";

import { metadata as unsubscribeMetadata } from "./unsubscribe/page";

describe("changelog utility page metadata", () => {
  it("keeps unsubscribe confirmations out of the search index", () => {
    expect(unsubscribeMetadata.title).toBe("Unsubscribe from Changelog");
    expect(String(unsubscribeMetadata.alternates?.canonical)).toContain(
      "/changelog/unsubscribe"
    );
    expect(unsubscribeMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
