import { describe, expect, test } from "vitest";
import { isAllowedRedirectUri } from "../redirect_uri";

const CALLBACK = "/api/reflet-devtools/connect/callback";

describe("isAllowedRedirectUri", () => {
  test.each([
    `http://localhost:3000${CALLBACK}`,
    `https://app.test${CALLBACK}`,
    `http://127.0.0.1:5173${CALLBACK}`,
    `http://shop.localhost:3000${CALLBACK}`,
  ])("accepts the local dev callback %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  test.each([
    `https://evil.com${CALLBACK}`,
    `http://localhost.evil.com${CALLBACK}`,
    `http://evil.com@localhost${CALLBACK}`,
    "http://localhost:3000/other",
    `http://localhost:3000${CALLBACK}?x=1`,
    `http://localhost:3000${CALLBACK}#code`,
    "javascript:alert(1)",
    "not a url",
  ])("rejects %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });
});
