import { describe, expect, it } from "vitest";
import { maskSecrets, redactUrl } from "../redact";

describe("maskSecrets", () => {
  it("leaves ordinary words alone", () => {
    expect(maskSecrets("the save button is broken")).toBe(
      "the save button is broken"
    );
  });
});

describe("redactUrl", () => {
  it("keeps urls without sensitive parameters untouched", () => {
    expect(redactUrl("https://app.test/settings?tab=billing&view=full")).toBe(
      "https://app.test/settings?tab=billing&view=full"
    );
  });

  it("covers the common credential spellings", () => {
    const redacted = redactUrl(
      "https://app.test/x?a=1&session_id=s77&apiKey=k123&userEmail=a@b.co"
    );

    expect(redacted).not.toContain("s77");
    expect(redacted).not.toContain("k123");
    expect(redacted).not.toContain("a@b.co");
    expect(redacted).toContain("a=1");
  });

  it("drops the fragment, with or without sensitive parameters", () => {
    expect(redactUrl("https://app.test/page?tab=a#access_token=xyz")).toBe(
      "https://app.test/page?tab=a"
    );
    expect(redactUrl("https://app.test/cb?token=abc#id_token=xyz")).toBe(
      "https://app.test/cb?token=[redacted]"
    );
  });

  it("falls back to secret masking when the url cannot be parsed", () => {
    expect(redactUrl("not a url, mail ada@example.com")).toBe(
      "not a url, mail [redacted]"
    );
  });
});
