/**
 * Call log for the signed-in website (D153): one row per call attempt across the user's tasks.
 * Reads existing tables only (tasks, shopJobs, callAttempts, creditReservations, taskEvents);
 * no new tables, fields or indexes, so existing records appear without a migration.
 * Never returns storage URLs, recording ids or transcripts.
 */
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireUser } from "./access";
import { nextOutcome, notChargedReason } from "./domain";
import { balances } from "./credits";

/** Each task holds at most 20 jobs x a few attempts, so a page is capped by tasks. */
export const MAX_TASKS_PER_PAGE = 20;
const MAX_JOBS = 21,
  MAX_ATTEMPTS_PER_JOB = 10,
  MAX_EVENTS = 300;
const IST_OFFSET_MS = 330 * 60 * 1000;

/** Same rule as the website's taskLabel: text before a "|" separator. */
export const taskLabel = (name: string) =>
  name.includes("|") ? name.split("|")[0].trim() || name : name;

/** Start of the current calendar month in India (IST, UTC+5:30), as a UTC timestamp. */
export function istMonthStart(now = Date.now()) {
  const ist = new Date(now + IST_OFFSET_MS);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_OFFSET_MS;
}

export type ChargeNote =
  | { kind: "held" | "charged" | "refunded" | "not_charged" | "free"; amountCents: number; reason?: string }
  | null;

/**
 * Charge note for one attempt. The job's reservation belongs to its latest attempt (the one that
 * produced the result); earlier tries of the same job are always "not charged".
 */
export function attemptChargeNote(
  task: { selfTest?: boolean; verification?: boolean },
  reservation: Pick<Doc<"creditReservations">, "state" | "amountCents"> | undefined,
  isLatest: boolean,
  state: string,
): ChargeNote {
  if (task.selfTest || task.verification) return { kind: "free", amountCents: 0 };
  if (!reservation) return null;
  if (!isLatest || reservation.state === "released")
    return { kind: "not_charged", amountCents: reservation.amountCents, reason: notChargedReason(state) };
  return {
    kind: reservation.state === "reserved" ? "held" : reservation.state,
    amountCents: reservation.amountCents,
  };
}

function recordingStatus(a: Doc<"callAttempts">) {
  if (a.recordingId) return "ready";
  if (a.recordingStatus === "processing" || (!!a.answeredAt && (!a.endedAt || Date.now() - a.endedAt < 120000)))
    return "processing";
  return "unavailable";
}

async function rowsForTask(ctx: QueryCtx, task: Doc<"tasks">) {
  const [jobs, reservations, events] = await Promise.all([
    ctx.db.query("shopJobs").withIndex("by_task", (q) => q.eq("taskId", task._id)).take(MAX_JOBS),
    ctx.db.query("creditReservations").withIndex("by_task", (q) => q.eq("taskId", task._id)).take(MAX_JOBS),
    ctx.db.query("taskEvents").withIndex("by_task", (q) => q.eq("taskId", task._id)).take(MAX_EVENTS),
  ]);
  const label = taskLabel(task.title || task.product.name);
  const perJob = await Promise.all(
    jobs.map(async (job) => {
      const attempts = await ctx.db
        .query("callAttempts")
        .withIndex("by_job", (q) => q.eq("shopJobId", job._id))
        .order("asc")
        .take(MAX_ATTEMPTS_PER_JOB);
      const reservation = reservations.find((r) => r.shopJobId === job._id);
      const jobEvents = events.filter((e) => e.shopJobId === job._id);
      return attempts.map((a, i) => {
        const next = attempts[i + 1];
        const isLatest = job.latestAttemptId ? job.latestAttemptId === a._id : !next;
        // The latest try carries the job's live/final state; earlier tries map from their own result.
        const state = isLatest ? job.state : nextOutcome(a.status, task.selfTest ? 2 : a.number);
        return {
          attemptId: a._id as Id<"callAttempts">,
          taskId: task._id,
          shopJobId: job._id,
          taskLabel: label,
          taskTitle: task.title,
          businessName: job.shop.name,
          area: job.shop.area,
          phone: job.shop.phone,
          address: job.shop.address,
          mapsUrl: job.shop.mapsUrl,
          source: task.source ?? "google",
          contactSource: job.shop.source,
          sourceUrl: job.shop.sourceUrl,
          attemptNumber: a.number,
          executor: a.executor,
          isLatestAttempt: isLatest,
          attemptStatus: a.status,
          state,
          jobState: job.state,
          startedAt: a.startedAt,
          answeredAt: a.answeredAt,
          endedAt: a.endedAt,
          durationSeconds: a.durationSeconds,
          chargeNote: attemptChargeNote(task, reservation, isLatest, state),
          recordingAvailable: !!a.recordingId,
          recordingStatus: recordingStatus(a),
          answer: a.answer ?? null,
          askedItems: a.items ?? [],
          timeline: jobEvents
            .filter((e) => !next || e.timestamp < next.startedAt)
            .map((e) => ({ text: e.text, time: e.timestamp })),
          selfTest: !!task.selfTest,
          verification: !!task.verification,
        };
      });
    }),
  );
  return perJob.flat();
}

export const log = query({
  args: { paginationOpts: paginationOptsValidator, accessToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken);
    const numItems = Math.max(1, Math.min(args.paginationOpts.numItems, MAX_TASKS_PER_PAGE));
    const result = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({ ...args.paginationOpts, numItems });
    const rows = (await Promise.all(result.page.map((task) => rowsForTask(ctx, task)))).flat();
    rows.sort((a, b) => b.startedAt - a.startedAt);
    return { ...result, page: rows };
  },
});

/** Look-back for tasks created just before the month whose retries ran inside it. */
const SUMMARY_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const SUMMARY_MAX_TASKS = 500;

export const summary = query({
  args: { accessToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken);
    const monthStart = istMonthStart();
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId).gte("_creationTime", monthStart - SUMMARY_LOOKBACK_MS))
      .order("desc")
      .take(SUMMARY_MAX_TASKS + 1);
    const truncated = tasks.length > SUMMARY_MAX_TASKS;
    let calls = 0,
      tries = 0,
      answered = 0,
      chargedPaise = 0,
      refundedPaise = 0,
      notChargedCount = 0;
    for (const task of tasks.slice(0, SUMMARY_MAX_TASKS)) {
      if (task.verification) continue;
      const [jobs, attempts, reservations] = await Promise.all([
        ctx.db.query("shopJobs").withIndex("by_task", (q) => q.eq("taskId", task._id)).take(MAX_JOBS),
        ctx.db.query("callAttempts").withIndex("by_task", (q) => q.eq("taskId", task._id)).take(MAX_JOBS * MAX_ATTEMPTS_PER_JOB),
        ctx.db.query("creditReservations").withIndex("by_task", (q) => q.eq("taskId", task._id)).take(MAX_JOBS),
      ]);
      const thisMonth = attempts.filter((a) => a.startedAt >= monthStart);
      tries += thisMonth.length;
      const jobIds = new Set(thisMonth.map((a) => a.shopJobId));
      calls += jobIds.size;
      answered += jobs.filter((j) => jobIds.has(j._id) && (j.state === "answered" || j.state === "incomplete_answer")).length;
      for (const r of reservations) {
        if (!jobIds.has(r.shopJobId)) continue;
        if (r.state === "charged") chargedPaise += r.amountCents;
        if (r.state === "refunded") refundedPaise += r.amountCents;
        if (r.state === "released") notChargedCount++;
      }
    }
    const credit = await balances(ctx, userId);
    return {
      monthStart,
      calls,
      tries,
      answered,
      chargedPaise,
      refundedPaise,
      notChargedCount,
      availablePaise: credit.availableCents,
      truncated,
    };
  },
});
