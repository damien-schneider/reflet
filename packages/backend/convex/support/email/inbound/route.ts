export type InboundRouteCandidate =
  | { kind: "alias"; alias: string }
  | { kind: "thread"; token: string };

const ADDRESS_PATTERN = /<?([^<>\s@]+@[^<>\s@]+)>?\s*$/;
const THREAD_LOCAL_PART_PATTERN = /^r\+([a-z0-9]+)$/;
const THREAD_MESSAGE_ID_PATTERN = /<m\.[^.<>@\s]+\.([a-z0-9]+)@([^<>\s]+)>/g;

export const extractEmailAddress = (raw: string): string | null => {
  const match = ADDRESS_PATTERN.exec(raw.trim());
  return match?.[1] ? match[1].toLowerCase() : null;
};

const localPartsAtDomain = (
  recipients: string[],
  inboundDomain: string
): string[] => {
  const suffix = `@${inboundDomain}`;
  const localParts = new Set<string>();
  for (const recipient of recipients) {
    const address = extractEmailAddress(recipient);
    if (address?.endsWith(suffix)) {
      localParts.add(address.slice(0, -suffix.length));
    }
  }
  return [...localParts];
};

const threadTokensFromMessageIds = (
  messageIds: string[],
  inboundDomain: string
): string[] =>
  messageIds.flatMap((header) =>
    [...header.toLowerCase().matchAll(THREAD_MESSAGE_ID_PATTERN)].flatMap(
      ([, token, domain]) => (token && domain === inboundDomain ? [token] : [])
    )
  );

export const routeInbound = (input: {
  inReplyTo?: string;
  inboundDomain: string;
  recipients: string[];
  references: string[];
}): InboundRouteCandidate[] => {
  const inboundDomain = input.inboundDomain.toLowerCase();
  const localParts = localPartsAtDomain(input.recipients, inboundDomain);
  const addressedTokens: string[] = [];
  const aliases: string[] = [];
  for (const localPart of localParts) {
    const token = THREAD_LOCAL_PART_PATTERN.exec(localPart)?.[1];
    if (token) {
      addressedTokens.push(token);
    } else {
      aliases.push(localPart);
    }
  }
  const newestReferenceFirst = [...input.references].reverse();
  const referencedTokens = threadTokensFromMessageIds(
    input.inReplyTo
      ? [input.inReplyTo, ...newestReferenceFirst]
      : newestReferenceFirst,
    inboundDomain
  );
  return [
    ...addressedTokens.map((token) => ({ kind: "thread" as const, token })),
    ...aliases.map((alias) => ({ alias, kind: "alias" as const })),
    ...referencedTokens.map((token) => ({ kind: "thread" as const, token })),
  ];
};
