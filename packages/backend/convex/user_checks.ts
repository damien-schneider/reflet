import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

export const checkEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const adapter = authComponent.adapter(ctx);
    const user = await adapter.findOne({
      model: "user",
      where: [{ field: "email", value: args.email }],
    });
    return !!user;
  },
});
