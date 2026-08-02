import type { QueryCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";

interface PersonInfo {
  email: string;
  image?: string;
  name?: string;
}

type AssignedUser = PersonInfo & { id: string };

const toPersonInfo = (user: {
  email: string;
  image?: string | null;
  name?: string | null;
}): PersonInfo => ({
  email: user.email,
  image: user.image || undefined,
  name: user.name || undefined,
});

export const asGuestPerson = (
  guestEmail: string | undefined
): PersonInfo | undefined =>
  guestEmail
    ? { email: guestEmail, image: undefined, name: undefined }
    : undefined;

export const resolveConversationPerson = async (
  ctx: QueryCtx,
  conversation: { guestEmail?: string; guestId?: string; userId: string }
): Promise<PersonInfo | undefined> => {
  if (conversation.guestId) {
    return asGuestPerson(conversation.guestEmail);
  }
  const user = await authComponent.getAnyUserById(ctx, conversation.userId);
  return user ? toPersonInfo(user) : asGuestPerson(conversation.guestEmail);
};

export const resolveAssignedUser = async (
  ctx: QueryCtx,
  assignedTo: string | undefined
): Promise<AssignedUser | undefined> => {
  if (!assignedTo) {
    return;
  }
  const user = await authComponent.getAnyUserById(ctx, assignedTo);
  return user ? { ...toPersonInfo(user), id: user._id } : undefined;
};

export const resolveMessageSenders = async (
  ctx: QueryCtx,
  senderIds: string[]
): Promise<Map<string, AssignedUser>> => {
  const unique = [...new Set(senderIds)];
  const entries = await Promise.all(
    unique.map(async (senderId) => {
      const user = await authComponent.getAnyUserById(ctx, senderId);
      return user
        ? ([senderId, { ...toPersonInfo(user), id: user._id }] as const)
        : null;
    })
  );
  return new Map(entries.filter((entry) => entry !== null));
};
