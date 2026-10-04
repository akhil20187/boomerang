import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const cleanup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const drafts = await ctx.db
      .query("drafts")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .take(100);
    for (const draft of drafts) await ctx.db.delete(draft._id);
    const grants = await ctx.db
      .query("playbackTokens")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .take(100);
    for (const grant of grants) await ctx.db.delete(grant._id);
    return null;
  },
});
