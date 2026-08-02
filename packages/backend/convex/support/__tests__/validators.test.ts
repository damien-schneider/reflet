import { describe, expect, test } from "vitest";
import { SUPPORT_PREVIEW_LENGTH } from "../../shared/constants";
import { isOrgAdmin } from "../../shared/membership";
import { buildMessagePreview, isValidEmail } from "../validators";

describe("buildMessagePreview", () => {
  test("collapses whitespace runs into single spaces", () => {
    expect(buildMessagePreview("hello\n\n  world\t!")).toBe("hello world !");
  });

  test("trims surrounding whitespace", () => {
    expect(buildMessagePreview("   padded   ")).toBe("padded");
  });

  test("keeps messages at the limit untouched", () => {
    const exact = "a".repeat(SUPPORT_PREVIEW_LENGTH);
    expect(buildMessagePreview(exact)).toBe(exact);
  });

  test("truncates longer messages with an ellipsis", () => {
    const preview = buildMessagePreview(
      "b".repeat(SUPPORT_PREVIEW_LENGTH + 50)
    );
    expect(preview).toHaveLength(SUPPORT_PREVIEW_LENGTH);
    expect(preview.endsWith("…")).toBe(true);
  });

  test("returns an empty string for whitespace-only input", () => {
    expect(buildMessagePreview("   \n\t ")).toBe("");
  });
});

describe("isValidEmail", () => {
  test.each(["a@b.co", "first.last+tag@sub.example.com"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    }
  );

  test.each(["", "nope", "no@domain", "no domain@example.com", "a@b@c.com"])(
    "rejects %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    }
  );
});

describe("isOrgAdmin", () => {
  test("accepts owner and admin", () => {
    expect(isOrgAdmin("owner")).toBe(true);
    expect(isOrgAdmin("admin")).toBe(true);
  });

  test("rejects member and missing roles", () => {
    expect(isOrgAdmin("member")).toBe(false);
    expect(isOrgAdmin(undefined)).toBe(false);
  });
});
