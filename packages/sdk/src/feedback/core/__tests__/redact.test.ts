import { describe, expect, it } from "vitest";
import { maskSecrets, redactUrl } from "../redact";

describe("maskSecrets", () => {
  it("masks emails and token-shaped strings", () => {
    expect(maskSecrets("mail ada@example.com now")).toBe("mail [redacted] now");
    expect(maskSecrets("bearer sk-live-abcdefabcdefabcdefabcdef1234")).toBe(
      "bearer [redacted]"
    );
  });

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

  it("masks the value of sensitive parameters but keeps the key", () => {
    const redacted = redactUrl(
      "https://app.test/callback?token=abc123def456&next=/reports"
    );

    expect(redacted).toContain("token=");
    expect(redacted).not.toContain("abc123def456");
    expect(redacted).toContain("next=/reports");
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

  it("preserves the fragment", () => {
    expect(redactUrl("https://app.test/page#billing")).toBe(
      "https://app.test/page#billing"
    );
  });

  it("falls back to secret masking when the url cannot be parsed", () => {
    expect(redactUrl("not a url at all")).toBe("not a url at all");
  });
});
