import { extractEmailAddress } from "./route";

export type EmailHeaders = Record<string, unknown>;

const MESSAGE_ID_PATTERN = /<[^<>\s]+>/g;
const BULK_PRECEDENCE = new Set(["bulk", "junk", "list", "auto_reply"]);
const AUTOMATED_LOCAL_PARTS = new Set([
  "mailer-daemon",
  "no-reply",
  "noreply",
  "postmaster",
]);

export const headerValues = (
  headers: EmailHeaders | null | undefined,
  name: string
): string[] => {
  const wanted = name.toLowerCase();
  const values: string[] = [];
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() !== wanted) {
      continue;
    }
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      if (typeof entry === "string") {
        values.push(entry.trim());
      }
    }
  }
  return values;
};

export const messageIdsIn = (values: string[]): string[] =>
  values.flatMap((value) => value.match(MESSAGE_ID_PATTERN) ?? []);

export const isAutoSubmittedEmail = (email: {
  from: string;
  headers: EmailHeaders | null | undefined;
}): boolean => {
  const { headers } = email;
  const autoSubmitted = headerValues(headers, "auto-submitted").some(
    (value) => value.toLowerCase() !== "no"
  );
  const bulkPrecedence = headerValues(headers, "precedence").some((value) =>
    BULK_PRECEDENCE.has(value.toLowerCase())
  );
  const autoresponderHeader =
    headerValues(headers, "x-autoreply").length > 0 ||
    headerValues(headers, "x-autorespond").length > 0;
  const localPart = extractEmailAddress(email.from)?.split("@")[0] ?? "";
  return (
    autoSubmitted ||
    bulkPrecedence ||
    autoresponderHeader ||
    AUTOMATED_LOCAL_PARTS.has(localPart)
  );
};
