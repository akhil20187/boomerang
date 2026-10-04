import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireUser, hashToken } from "./access";
export const playback = mutation({
  args: {
    attemptId: v.id("callAttempts"),
    accessToken: v.optional(v.string()),
  },
  returns: v.object({ url: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken),
      attempt = await ctx.db.get(args.attemptId);
    if (!attempt?.recordingId) throw new Error("Call recording is not ready.");
    const task = await ctx.db.get(attempt.taskId);
    if (task?.userId !== userId) throw new Error("Call recording not found.");
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`,
      expiresAt = Date.now() + 5 * 60000;
    await ctx.db.insert("playbackTokens", {
      userId,
      attemptId: attempt._id,
      hash: await hashToken(token),
      expiresAt,
    });
    return {
      url: `${process.env.CONVEX_SITE_URL}/api/recording?token=${encodeURIComponent(token)}`,
      expiresAt,
    };
  },
});
export const resolvePlayback = internalQuery({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const hash = await hashToken(args.token);
    const grant = await ctx.db
      .query("playbackTokens")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .unique();
    if (!grant || grant.expiresAt < Date.now()) return null;
    const attempt = await ctx.db.get(grant.attemptId);
    if (!attempt?.recordingId) return null;
    const task = await ctx.db.get(attempt.taskId);
    if (task?.userId !== grant.userId) return null;
    return ctx.storage.getUrl(attempt.recordingId);
  },
});
export const check = internalQuery({
  args: {
    attemptId: v.id("callAttempts"),
    taskId: v.id("tasks"),
    shopJobId: v.id("shopJobs"),
    eventId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.attemptId);
    if (!a || a.taskId !== args.taskId || a.shopJobId !== args.shopJobId)
      throw new Error("Recording identifiers do not match");
    return (
      !!a.recordingId ||
      !!(await ctx.db
        .query("taskEvents")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .unique())
    );
  },
});
export const attach = internalMutation({
  args: {
    attemptId: v.id("callAttempts"),
    taskId: v.id("tasks"),
    shopJobId: v.id("shopJobs"),
    eventId: v.string(),
    recordingId: v.id("_storage"),
    durationSeconds: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.attemptId);
    if (!a || a.taskId !== args.taskId || a.shopJobId !== args.shopJobId)
      throw new Error("Recording identifiers do not match");
    if (a.recordingId) {
      await ctx.storage.delete(args.recordingId);
      return null;
    }
    await ctx.db.patch(a._id, {
      recordingId: args.recordingId,
      recordingStatus: "ready",
      ...(args.durationSeconds !== undefined
        ? { durationSeconds: args.durationSeconds }
        : {}),
    });
    await ctx.db.insert("taskEvents", {
      taskId: args.taskId,
      shopJobId: args.shopJobId,
      attemptId: args.attemptId,
      eventId: args.eventId,
      type: "recording_ready",
      text: "Call recording ready",
      timestamp: Date.now(),
    });
    return null;
  },
});
export const ingest = internalAction({
  args: {
    attemptId: v.id("callAttempts"),
    taskId: v.id("tasks"),
    shopJobId: v.id("shopJobs"),
    eventId: v.string(),
    url: v.string(),
    durationSeconds: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (
      await ctx.runQuery(internal.recordings.check, {
        attemptId: args.attemptId,
        taskId: args.taskId,
        shopJobId: args.shopJobId,
        eventId: args.eventId,
      })
    )
      return null;
    const url = new URL(args.url),
      allowed = (process.env.RECORDING_ALLOWED_HOSTS ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !allowed.includes(url.hostname)
    )
      throw new Error(
        "Recording host is not approved. Configure RECORDING_ALLOWED_HOSTS.",
      );
    const response = await fetch(url.toString(), {
      redirect: "error",
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error("Recording download failed");
    if (Number(response.headers.get("content-length") ?? 0) > 25000000)
      throw new Error("Recording too large");
    const blob = await response.blob();
    if (blob.size > 25000000) throw new Error("Recording too large");
    if (!/^(audio\/|application\/octet-stream)/.test(blob.type))
      throw new Error("Recording is not an audio file");
    const recordingId = await ctx.storage.store(blob);
    const { url: _, ...metadata } = args;
    await ctx.runMutation(internal.recordings.attach, {
      ...metadata,
      recordingId,
    });
    return null;
  },
});
