import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { approveWithWelcomeCredit } from "./onboarding";
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
    await approveWithWelcomeCredit(ctx, user._id, args.grantWelcomeCredit);
    return { userId: user._id };
  },
});
