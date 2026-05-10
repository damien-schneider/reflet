/**
 * Work item identifier allocation — Linear-style "ORG-123".
 *
 * The org prefix is derived from the organization slug (or name fallback)
 * by taking the first 3-6 alphabetic characters, uppercased. Defaults to
 * "ORG" if no alpha characters can be extracted.
 *
 * Counter increments are atomic per Convex doc: reading and patching the
 * same `organizationCounters` row inside a single mutation is serialized.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

const PREFIX_MIN_LENGTH = 3;
const PREFIX_MAX_LENGTH = 6;
const FALLBACK_PREFIX = "ORG";
const ALPHA_REGEX = /[A-Za-z]/g;

export function deriveOrgPrefix(
  org: Pick<Doc<"organizations">, "slug" | "name">
): string {
  const sources = [org.slug, org.name];
  for (const source of sources) {
    const alpha = source.match(ALPHA_REGEX)?.join("") ?? "";
    if (alpha.length >= PREFIX_MIN_LENGTH) {
      return alpha.slice(0, PREFIX_MAX_LENGTH).toUpperCase();
    }
  }
  return FALLBACK_PREFIX;
}

export const WORK_ITEM_COUNTER_KIND = "work_item";

export async function allocateWorkItemIdentifier(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<string> {
  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error("Organization not found");
  }
  const prefix = deriveOrgPrefix(org);

  const existing = await ctx.db
    .query("organizationCounters")
    .withIndex("by_org_kind", (q) =>
      q.eq("organizationId", organizationId).eq("kind", WORK_ITEM_COUNTER_KIND)
    )
    .unique();

  const now = Date.now();
  let nextValue: number;
  if (existing) {
    nextValue = existing.value + 1;
    await ctx.db.patch(existing._id, { value: nextValue, updatedAt: now });
  } else {
    nextValue = 1;
    await ctx.db.insert("organizationCounters", {
      organizationId,
      kind: WORK_ITEM_COUNTER_KIND,
      value: nextValue,
      updatedAt: now,
    });
  }

  return `${prefix}-${nextValue}`;
}
