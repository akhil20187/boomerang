import { internalMutation } from "./mutationSafety";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { convertUserToRupees } from "./credits";
import { internal } from "./_generated/api";
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
// One-off D135 conversion. Run convertCreditsToRupees until isDone, then
// convertTaskPricesToRupees until isDone. Both are safe to repeat.
export const convertCreditsToRupees = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("creditEntries").paginate({ cursor: args.cursor, numItems: 10 });
    const users = [...new Set(page.page.filter(e => e.currency === "USD").map(e => e.userId))];
    const mismatched: Id<"users">[] = [];
    let converted = 0;
    for (const userId of users) {
      const result = await convertUserToRupees(ctx, userId);
      if (result === "converted") converted++;
      if (result === "mismatched") mismatched.push(userId);
    }
    return { converted, mismatched, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});
export const convertTaskPricesToRupees = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("tasks").paginate({ cursor: args.cursor, numItems: 100 });
    let converted = 0;
    for (const task of page.page) {
      if (task.currency || task.answerPriceCents === undefined) continue;
      // Leave a task alone while its owner's credit is still unconverted (a reported mismatch).
      const stillUsd = (await ctx.db.query("creditEntries").withIndex("by_user", q => q.eq("userId", task.userId)).take(10000)).some(e => e.currency === "USD");
      if (stillUsd) continue;
      await ctx.db.patch(task._id, { answerPriceCents: task.answerPriceCents * 100, currency: "INR" });
      converted++;
    }
    return { converted, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});
/** Chat turn ledger (chat.ts takeTurn) only needs the last hour; rows older than this are deleted. */
export const CHAT_TURN_RETENTION_MS = 2 * 60 * 60 * 1000;
export const CHAT_TURN_CLEANUP_BATCH = 200;
/** Deletes chatTurns rows older than 2 hours in bounded batches; schedules itself again while a full batch was found. */
export const cleanupChatTurns = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - CHAT_TURN_RETENTION_MS;
    const old = await ctx.db
      .query("chatTurns")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .take(CHAT_TURN_CLEANUP_BATCH);
    for (const turn of old) await ctx.db.delete(turn._id);
    if (old.length === CHAT_TURN_CLEANUP_BATCH)
      await ctx.scheduler.runAfter(0, internal.maintenance.cleanupChatTurns, {});
    return old.length;
  },
});
