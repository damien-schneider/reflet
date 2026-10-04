import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const visibilityLabel = (isPublic: boolean) =>
  isPublic ? "public" : "private";

export const logVisibilityChange = async (
  ctx: MutationCtx,
  args: {
    actorId: string;
    isPublic: boolean | undefined;
    organization: Doc<"organizations">;
  }
): Promise<void> => {
  const { actorId, isPublic, organization } = args;
  if (isPublic === undefined || isPublic === organization.isPublic) {
    return;
  }
  await ctx.db.insert("activityLogs", {
    action: "visibility_changed",
    authorId: actorId,
    createdAt: Date.now(),
    details: JSON.stringify({
      current: visibilityLabel(isPublic),
      previous: visibilityLabel(organization.isPublic),
    }),
    organizationId: organization._id,
  });
};
