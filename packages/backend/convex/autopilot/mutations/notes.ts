/**
 * Notes mutations — public, auth-gated.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "./auth";

export const dismissNote = mutation({
  args: { noteId: v.id("autopilotNotes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, note.organizationId, user._id);

    await ctx.db.patch(args.noteId, {
      status: "dismissed",
      triagedAt: Date.now(),
    });
  },
});
