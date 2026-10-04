import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { randomSecretHex } from "../shared/hmac";

const THREAD_TOKEN_BYTES = 16;

export const findConversationIdByThreadToken = async (
  ctx: QueryCtx,
  token: string
): Promise<Id<"supportConversations"> | null> => {
  const row = await ctx.db
    .query("supportThreadTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  return row?.conversationId ?? null;
};

export const findThreadToken = async (
  ctx: QueryCtx,
  conversationId: Id<"supportConversations">
): Promise<string | null> => {
  const row = await ctx.db
    .query("supportThreadTokens")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .unique();
  return row?.token ?? null;
};

export const ensureThreadToken = async (
  ctx: MutationCtx,
  conversationId: Id<"supportConversations">
): Promise<string> => {
  const existing = await findThreadToken(ctx, conversationId);
  if (existing) {
    return existing;
  }
  const token = randomSecretHex(THREAD_TOKEN_BYTES);
  await ctx.db.insert("supportThreadTokens", { conversationId, token });
  return token;
};
