import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
const typeV = v.union(v.literal("started"), v.literal("completed"));
export const claim = internalMutation({
  args: { taskId: v.id("tasks"), type: typeV },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_task_type", (q) =>
        q.eq("taskId", args.taskId).eq("type", args.type),
      )
      .unique();
    const now = Date.now();
    if (
      existing &&
      (existing.status === "sent" ||
        (existing.attempts ?? 0) >= 5 ||
        (existing.leaseUntil ?? 0) > now ||
        (existing.nextRetryAt ?? 0) > now)
    )
      return null;
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;
    const user = await ctx.db.get(task.userId);
    const url = `${process.env.SITE_URL ?? "http://localhost:5173"}/status?task=${args.taskId}`;
    const payload = existing?.payload ?? {
      from: process.env.RESEND_FROM_EMAIL ?? "",
      to: user?.email ?? "",
      subject:
        args.type === "started"
          ? "Your shop calls are starting"
          : "Your shop call results are ready",
      text: `${task.product.name}\n\n${args.type === "started" ? "Follow your shop calls" : "Read every shop answer"}: ${url}\n\nSign in to your Human MCP account to view this task.`,
    };
    const patch = {
      status: "pending" as const,
      attempts: (existing?.attempts ?? 0) + 1,
      leaseUntil: now + 60000,
      nextRetryAt: undefined,
      payload,
    };
    const notificationId = existing
      ? existing._id
      : await ctx.db.insert("notifications", { ...args, ...patch });
    if (existing) await ctx.db.patch(existing._id, patch);
    await ctx.scheduler.runAfter(65000, internal.notifications.send, args);
    return { notificationId, payload };
  },
});
export const result = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    status: v.union(v.literal("sent"), v.literal("error")),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { notificationId, ...patch }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification || notification.status === "sent") return null;
    const delay = 15000 * 2 ** Math.max(0, (notification.attempts ?? 1) - 1),
      nextRetryAt = patch.status === "error" ? Date.now() + delay : undefined;
    await ctx.db.patch(notificationId, {
      ...patch,
      leaseUntil: undefined,
      nextRetryAt,
    });
    if (nextRetryAt && (notification.attempts ?? 0) < 5)
      await ctx.scheduler.runAt(nextRetryAt, internal.notifications.send, {
        taskId: notification.taskId,
        type: notification.type,
      });
    return null;
  },
});
export const send = internalAction({
  args: { taskId: v.id("tasks"), type: typeV },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const claim = await ctx.runMutation(internal.notifications.claim, args);
    if (!claim) return null;
    const key = process.env.RESEND_API_KEY,
      from = process.env.RESEND_FROM_EMAIL;
    if (!key || !from || !claim.payload.to || !claim.payload.from) {
      await ctx.runMutation(internal.notifications.result, {
        notificationId: claim.notificationId,
        status: "error",
        error: "Email service or recipient is not configured.",
      });
      return null;
    }
    try {
      const url = `${process.env.SITE_URL ?? "http://localhost:5173"}/status?task=${args.taskId}`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `task-${args.taskId}-${args.type}`,
        },
        body: JSON.stringify(claim.payload),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`Email provider returned ${r.status}`);
      const body = await r.json();
      await ctx.runMutation(internal.notifications.result, {
        notificationId: claim.notificationId,
        status: "sent",
        providerId: body.id,
      });
    } catch (e) {
      await ctx.runMutation(internal.notifications.result, {
        notificationId: claim.notificationId,
        status: "error",
        error: e instanceof Error ? e.message : "Email could not be sent",
      });
    }
    return null;
  },
});
export const forTask = internalQuery({
  args: { taskId: v.id("tasks") },
  returns: v.any(),
  handler: async (ctx, args) =>
    ctx.db
      .query("notifications")
      .withIndex("by_task_type", (q) => q.eq("taskId", args.taskId))
      .take(2),
});
