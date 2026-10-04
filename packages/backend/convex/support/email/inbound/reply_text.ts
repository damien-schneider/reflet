"use node";

import { SUPPORT_REPLY_MARKER } from "@reflet/email/templates/support-layout";
import EmailReplyParser from "email-reply-parser";
import { convert } from "html-to-text";
import { MAX_SUPPORT_MESSAGE_LENGTH } from "../../../shared/constants";

export const MAX_INBOUND_FULL_TEXT_CHARS = 100_000;
export const EMPTY_REPLY_PLACEHOLDER = "(empty message — view original)";

const CRLF_PATTERN = /\r\n?/g;

export const emailFullText = (email: {
  html?: string | null;
  text?: string | null;
}): string => {
  const text = email.text?.trim()
    ? email.text
    : convert(email.html ?? "", { wordwrap: false });
  return text.replace(CRLF_PATTERN, "\n").slice(0, MAX_INBOUND_FULL_TEXT_CHARS);
};

export const visibleReplyText = (fullText: string): string => {
  const markerIndex = fullText.indexOf(SUPPORT_REPLY_MARKER);
  const aboveMarker =
    markerIndex === -1 ? fullText : fullText.slice(0, markerIndex);
  const visible = new EmailReplyParser()
    .read(aboveMarker)
    .getVisibleText()
    .trim();
  return visible
    ? visible.slice(0, MAX_SUPPORT_MESSAGE_LENGTH)
    : EMPTY_REPLY_PLACEHOLDER;
};
