import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const approve = internalMutation({
  args: { email: v.string(), grantWelcomeCredit: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error("Customer must sign in before approval.");
    await ctx.db.patch(user._id, { eligible: true });
    if (args.grantWelcomeCredit) {
      const operationId = `welcome:${user._id}`;
      const old = await ctx.db
        .query("creditEntries")
        .withIndex("by_operation", (q) => q.eq("operationId", operationId))
        .unique();
      if (!old)
        await ctx.db.insert("creditEntries", {
          userId: user._id,
          amount: 5,
          currency: "USD",
          type: "grant",
          reason: "Approved $5 welcome credit",
          operationId,
        });
    }
    return { userId: user._id };
  },
});
