import { describe, expect, test } from "vitest";
import {
  EMPTY_REPLY_PLACEHOLDER,
  emailFullText,
  visibleReplyText,
} from "../inbound/reply_text";

describe("visibleReplyText", () => {
  test("cuts everything below the reply marker", () => {
    const text = [
      "Thanks, that fixed it!",
      "",
      "##- Reply above this line -##",
      "Acme replied to your request.",
    ].join("\n");

    expect(visibleReplyText(text)).toBe("Thanks, that fixed it!");
  });

  test("removes an English Gmail quote", () => {
    const text = [
      "Still broken on Safari.",
      "",
      "On Mon, Oct 5, 2026 at 10:00 AM Acme <support@acme.com> wrote:",
      "> Could you try again?",
      ">",
    ].join("\n");

    expect(visibleReplyText(text)).toBe("Still broken on Safari.");
  });

  test("removes a French Gmail quote", () => {
    const text = [
      "Toujours cassé.",
      "",
      "Le lun. 5 oct. 2026 à 10:00, Acme <support@acme.com> a écrit :",
      "> Pouvez-vous réessayer ?",
    ].join("\n");

    expect(visibleReplyText(text)).toBe("Toujours cassé.");
  });

  test("an empty reply becomes a placeholder", () => {
    expect(
      visibleReplyText("\n\n##- Reply above this line -##\nOld content")
    ).toBe(EMPTY_REPLY_PLACEHOLDER);
  });
});

describe("emailFullText", () => {
  test("falls back to the HTML body when there is no text part", () => {
    expect(
      emailFullText({ html: "<p>Hello <strong>team</strong></p>", text: null })
    ).toBe("Hello team");
  });

  test("prefers the text part and normalizes line endings", () => {
    expect(emailFullText({ html: "<p>ignored</p>", text: "a\r\nb" })).toBe(
      "a\nb"
    );
  });
});
