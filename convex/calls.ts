import { inquiryFromBrief } from "./intake";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { nextOutcome } from "./domain";
import { terminalStates } from "./validators";
import { settle } from "./credits";
const transcriptV = v.array(
  v.object({ speaker: v.string(), text: v.string() }),
);
export const prepare = internalMutation({
  args: { shopJobId: v.id("shopJobs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.shopJobId);
    if (!job || terminalStates.has(job.state) || job.state === "calling")
      return null;
    if (
      job.state === "retry_scheduled" &&
      job.retryAt &&
      job.retryAt > Date.now()
    )
      return null;
    const task = await ctx.db.get(job.taskId);
    if (!task) return null;
    const user = await ctx.db.get(task.userId);
    const number = job.attemptCount + 1;
    if (number > (task.selfTest ? 1 : 2)) return null;
    const attemptId = await ctx.db.insert("callAttempts", {
      taskId: task._id,
      shopJobId: job._id,
      number,
      executor: "AI",
      status: "dispatching",
      startedAt: Date.now(),
      dispatchState: "pending",
    });
    await ctx.db.patch(job._id, {
      state: "calling",
      attemptCount: number,
      latestAttemptId: attemptId,
      retryAt: undefined,
    });
    await ctx.db.insert("taskEvents", {
      taskId: task._id,
      shopJobId: job._id,
      attemptId,
      eventId: `${attemptId}:dispatch`,
      type: "dispatch",
      text: task.selfTest ? 'Calling your mobile · personal test' : `AI agent calling · try ${number} of 2`,
      timestamp: Date.now(),
    });
    return {
      attemptId,
      taskId: task._id,
      shopJobId: job._id,
      to: job.shop.phone,
      businessName: job.shop.name,
      customerName: user?.name?.split(" ")[0] ?? "our customer",
      ...(task.brief
        ? { ...inquiryFromBrief(task.brief), briefMode: true }
        : {
            productDescription: task.product.description ?? task.product.name,
            instructions: [
              task.comments,
              task.cards.length
                ? `Ask about offers with these cards: ${task.cards.join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
          }),
    };
  },
});
export const dispatch = internalAction({
  args: { shopJobId: v.id("shopJobs") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const request = await ctx.runMutation(internal.calls.prepare, args);
    if (!request) return null;
    const url = process.env.CALL_BRIDGE_URL,
      secret = process.env.CALL_BRIDGE_SECRET;
    if (process.env.LIVE_CALLS_ENABLED !== "true" || !url || !secret) {
      await ctx.runMutation(internal.calls.dispatchResult, {
        attemptId: request.attemptId,
        state: "rejected",
        reason: "Live calling has been disabled. No call was placed.",
      });
      return null;
    }
    try {
      const r = await fetch(`${url.replace(/\/$/, "")}/dispatch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15000),
      });
      if (r.ok)
        await ctx.runMutation(internal.calls.dispatchResult, {
          attemptId: request.attemptId,
          state: "accepted",
          reason: "Call request accepted",
        });
      else if (r.status === 429) {
        await ctx.runMutation(internal.calls.defer, {
          attemptId: request.attemptId,
        });
      } else
        await ctx.runMutation(internal.calls.dispatchResult, {
          attemptId: request.attemptId,
          state: r.status >= 500 ? "uncertain" : "rejected",
          reason:
            r.status >= 500
              ? "Call start could not be confirmed. No automatic redial."
              : `Call request was not accepted (${r.status}).`,
        });
    } catch {
      await ctx.runMutation(internal.calls.dispatchResult, {
        attemptId: request.attemptId,
        state: "uncertain",
        reason: "Call start could not be confirmed. No automatic redial.",
      });
    }
    return null;
  },
});
export const defer = internalMutation({
  args: { attemptId: v.id("callAttempts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.attemptId);
    if (!a) return null;
    const j = await ctx.db.get(a.shopJobId);
    if (!j || j.latestAttemptId !== a._id) return null;
    await ctx.db.patch(a._id, {
      status: "capacity_deferred",
      dispatchState: "rejected",
      endedAt: Date.now(),
    });
    await ctx.db.patch(j._id, {
      state: "waiting",
      attemptCount: Math.max(0, j.attemptCount - 1),
    });
    await ctx.scheduler.runAfter(30000, internal.calls.dispatch, {
      shopJobId: j._id,
    });
    return null;
  },
});
export const dispatchResult = internalMutation({
  args: {
    attemptId: v.id("callAttempts"),
    state: v.union(
      v.literal("accepted"),
      v.literal("uncertain"),
      v.literal("rejected"),
    ),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.attemptId);
    if (!a || a.endedAt) return null;
    const j = await ctx.db.get(a.shopJobId);
    if (!j || j.latestAttemptId !== a._id) return null;
    if (args.state === "uncertain" && a.dispatchState === "uncertain") {
      await ctx.scheduler.runAfter(5 * 60000, internal.calls.checkAbandoned, {
        attemptId: a._id,
      });
      return null;
    }
    await ctx.db.patch(a._id, {
      dispatchState: args.state,
      status: args.state === "accepted" ? "calling" : args.state,
    });
    if (args.state !== "accepted") {
      await ctx.db.patch(j._id, {
        state: args.state === "uncertain" ? "reconciling" : "technical_error",
        billingState: "released",
      });
      await ctx.db.insert("taskEvents", {
        taskId: a.taskId,
        shopJobId: j._id,
        attemptId: a._id,
        eventId: `${a._id}:dispatch-result`,
        type: "error",
        text: args.reason,
        timestamp: Date.now(),
      });
      if (args.state === "uncertain")
        await ctx.scheduler.runAfter(60000, internal.calls.checkAbandoned, {
          attemptId: a._id,
        });
      else {
        await settle(ctx, j._id, false);
        await finishIfReady(ctx, a.taskId);
      }
    } else
      await ctx.scheduler.runAfter(
        12 * 60 * 1000,
        internal.calls.checkAbandoned,
        { attemptId: a._id },
      );
    return null;
  },
});
async function finishIfReady(ctx: any, taskId: any) {
  const jobs = await ctx.db
    .query("shopJobs")
    .withIndex("by_task", (q: any) => q.eq("taskId", taskId))
    .take(21);
  if (jobs.length && jobs.every((j: any) => terminalStates.has(j.state))) {
    const task = await ctx.db.get(taskId);
    if (task?.status !== "finished") {
      await ctx.db.patch(taskId, {
        status: "finished",
        finishedAt: Date.now(),
      });
      if (!task?.selfTest) await ctx.scheduler.runAfter(0, internal.notifications.send, {
        taskId,
        type: "completed",
      });
    }
  }
}
export const receive = internalMutation({
  args: {
    eventId: v.string(),
    attemptId: v.id("callAttempts"),
    taskId: v.id("tasks"),
    shopJobId: v.id("shopJobs"),
    status: v.string(),
    providerCallId: v.optional(v.string()),
    providerRequestId: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    endReason: v.optional(v.string()),
    transportStatus: v.optional(v.string()),
    transcript: v.optional(transcriptV),
    answer: v.optional(v.any()),
  },
  returns: v.object({ duplicate: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.eventId.length > 200) throw new Error("Invalid event ID");
    const duplicate = await ctx.db
      .query("taskEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (duplicate) {
      if (
        duplicate.attemptId !== args.attemptId ||
        duplicate.taskId !== args.taskId ||
        duplicate.shopJobId !== args.shopJobId
      )
        throw new Error("Callback event identifier belongs to another call");
      return { duplicate: true };
    }
    const a = await ctx.db.get(args.attemptId),
      j = await ctx.db.get(args.shopJobId);
    if (
      !a ||
      !j ||
      a.taskId !== args.taskId ||
      a.shopJobId !== j._id ||
      j.taskId !== args.taskId
    )
      throw new Error("Callback identifiers do not match");
    if (args.status === "calling" || args.status === "answered") {
      if (a.endedAt) return { duplicate: true };
      await ctx.db.patch(a._id, {
        status: args.status,
        ...(args.status === "answered" ? { answeredAt: Date.now() } : {}),
        ...(args.providerCallId ? { providerCallId: args.providerCallId } : {}),
      });
      await ctx.db.insert("taskEvents", {
        taskId: a.taskId,
        shopJobId: j._id,
        attemptId: a._id,
        eventId: args.eventId,
        type: args.status,
        text: args.status === "answered" ? "Shop answered" : "AI agent calling",
        timestamp: Date.now(),
      });
      return { duplicate: false };
    }
    if (a.endedAt) {
      await ctx.db.insert("taskEvents", {
        taskId: a.taskId,
        shopJobId: j._id,
        attemptId: a._id,
        eventId: args.eventId,
        type: "late_callback",
        text: "Additional call update received",
        timestamp: Date.now(),
      });
      return { duplicate: false };
    }
    if (args.status === "reconciliation_required") {
      await ctx.db.patch(a._id, {
        status: "request_unknown",
        dispatchState: "uncertain",
      });
      if (j.latestAttemptId === a._id)
        await ctx.db.patch(j._id, { state: "reconciling" });
      await ctx.scheduler.runAfter(60000, internal.calls.checkAbandoned, {
        attemptId: a._id,
      });
      await ctx.db.insert("taskEvents", {
        taskId: a.taskId,
        shopJobId: j._id,
        attemptId: a._id,
        eventId: args.eventId,
        type: "reconciliation_required",
        text: "Call status unconfirmed · checking provider",
        timestamp: Date.now(),
      });
      return { duplicate: false };
    }
    const raw = args.answer;
    let answer: any = undefined;
    if (raw) {
      if (!["available", "unavailable", "unconfirmed"].includes(raw.stock))
        throw new Error("Invalid stock answer");
      if (raw.currency != null && raw.currency !== "INR")
        throw new Error("Call prices must be stated in INR");
      if (
        raw.finalPrice != null &&
        (typeof raw.finalPrice !== "number" ||
          !Number.isFinite(raw.finalPrice) ||
          raw.finalPrice < 0)
      )
        throw new Error("Invalid final price");
      answer = {
        stock: raw.stock,
        variantMatch:
          raw.variantMatch === "confirmed"
            ? "yes"
            : raw.variantMatch === "different"
              ? "no"
              : "unconfirmed",
        currency: raw.currency ?? "INR",
        ...(raw.finalPrice != null ? { finalPrice: raw.finalPrice } : {}),
        ...(typeof raw.offers === "string"
          ? { offers: raw.offers.slice(0, 3000) }
          : {}),
        ...(typeof raw.notes === "string"
          ? { notes: raw.notes.slice(0, 6000) }
          : {}),
      };
    }
    let outcome = args.transportStatus ?? args.status;
    if (raw?.personalCallNeeded) outcome = "refused";
    else if (["no-answer", "busy", "unanswered"].includes(outcome))
      outcome = "unanswered";
    else if (
      ["hangup", "answered_disconnect", "disconnected"].includes(outcome) ||
      (a.answeredAt && args.status === "failed")
    )
      outcome = "disconnected";
    else if (args.status === "reconciliation_required")
      outcome = "technical_error";
    else if (
      ["failed", "error", "request_failed", "canceled", "cancelled"].includes(
        outcome,
      )
    )
      outcome = "technical_error";
    else if (args.status === "completed")
      outcome =
        answer && answer.stock !== "unconfirmed" ? "completed" : "incomplete";
    const task = await ctx.db.get(a.taskId);
    const state = nextOutcome(outcome, task?.selfTest ? 2 : a.number);
    await ctx.db.patch(a._id, {
      status: outcome,
      endedAt: Date.now(),
      answer,
      ...(args.providerCallId ? { providerCallId: args.providerCallId } : {}),
      ...(args.providerRequestId
        ? { providerRequestId: args.providerRequestId }
        : {}),
      ...(args.durationSeconds !== undefined
        ? { durationSeconds: args.durationSeconds }
        : {}),
      ...(args.endReason ? { endReason: args.endReason } : {}),
      recordingStatus: "missing",
    });
    if (args.transcript) {
      for (const [i, segment] of args.transcript.slice(0, 500).entries())
        await ctx.db.insert("transcriptSegments", {
          attemptId: a._id,
          sequence: i,
          speaker: segment.speaker.slice(0, 30),
          text: segment.text.slice(0, 6000),
          timestamp: Date.now(),
        });
    }
    if (j.latestAttemptId === a._id) {
      const retryAt =
        state === "retry_scheduled" ? Date.now() + 300000 : undefined;
      await ctx.db.patch(j._id, {
        state,
        answer,
        retryAt,
      });
      if (retryAt)
        await ctx.scheduler.runAt(retryAt, internal.calls.dispatch, {
          shopJobId: j._id,
        });
      if (terminalStates.has(state))
        await settle(
          ctx,
          j._id,
          (state === "answered" || state === "incomplete_answer") &&
            !!answer &&
            (answer.stock !== "unconfirmed" ||
              answer.finalPrice !== undefined ||
              !!answer.notes?.trim() ||
              !!answer.offers?.trim()),
        );
    }
    const text =
      state === "answered"
        ? "Shop answered"
        : state === "retry_scheduled"
          ? "No answer · retry in five minutes"
          : state === "personal_call_needed"
            ? "Prefers a personal call"
            : state === "unreachable"
              ? "Couldn't reach the shop"
              : state === "incomplete_answer"
                ? "Partial answer · remaining details unconfirmed"
                : "Call needs review";
    await ctx.db.insert("taskEvents", {
      taskId: a.taskId,
      shopJobId: j._id,
      attemptId: a._id,
      eventId: args.eventId,
      type: state,
      text,
      timestamp: Date.now(),
    });
    await finishIfReady(ctx, a.taskId);
    return { duplicate: false };
  },
});
export const attemptContext = internalQuery({
  args: { attemptId: v.id("callAttempts") },
  returns: v.any(),
  handler: async (ctx, args) => ctx.db.get(args.attemptId),
});
export const checkAbandoned = internalAction({
  args: { attemptId: v.id("callAttempts") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const attempt = await ctx.runQuery(internal.calls.attemptContext, args);
    if (!attempt || attempt.endedAt) return null;
    const bridge = process.env.CALL_BRIDGE_URL,
      secret = process.env.CALL_BRIDGE_SECRET;
    if (bridge && secret) {
      try {
        const response = await fetch(
          `${bridge.replace(/\/$/, "")}/attempts/${encodeURIComponent(attempt._id)}`,
          {
            headers: { Authorization: `Bearer ${secret}` },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (response.ok) {
          const record = await response.json();
          if (["completed", "failed"].includes(record.status)) {
            const result = record.result ?? {};
            const callback: any = {
              eventId: `${attempt._id}:reconcile-final`,
              attemptId: attempt._id,
              taskId: attempt.taskId,
              shopJobId: attempt.shopJobId,
              status: record.status,
            };
            for (const field of [
              "providerCallId",
              "providerRequestId",
              "durationSeconds",
              "endReason",
              "transportStatus",
              "transcript",
              "answer",
            ])
              if (result[field] != null) callback[field] = result[field];
            await ctx.runMutation(internal.calls.receive, callback);
            return null;
          }
        }
      } catch {
        /* Never infer a failed call from an unavailable status endpoint. */
      }
    }
    await ctx.runMutation(internal.calls.dispatchResult, {
      attemptId: args.attemptId,
      state: "uncertain",
      reason:
        "The final call status has not arrived. Review provider status before calling again.",
    });
    return null;
  },
});
