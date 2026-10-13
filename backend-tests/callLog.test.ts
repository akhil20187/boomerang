import { it, expect, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { istMonthStart, attemptChargeNote, taskLabel } from "../convex/callLog";
import type { Id } from "../convex/_generated/dataModel";

const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
const page = { numItems: 10, cursor: null };

const shop = (placeId: string, name: string) => ({
  placeId,
  name,
  area: "Kondapur",
  address: `${name} Road`,
  phone: "+919999999999",
  ratingCount: 100,
  distanceKm: 1,
  mapsUrl: "https://maps.google.com",
  fewRatings: false,
});

async function seedTask(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  opts: { title: string; selfTest?: boolean },
) {
  return t.run(async (ctx) => {
    const draftId = await ctx.db.insert("drafts", {
      userId, productInput: opts.title, product: { name: opts.title }, cards: [], comments: "", shops: [], expiresAt: Date.now() + 60000,
    });
    return ctx.db.insert("tasks", {
      userId, draftId, title: opts.title, type: "shop_calls", detailsVersion: 1, product: { name: opts.title }, cards: [], comments: "",
      status: "finished", approvedAt: Date.now(), idempotencyKey: `${opts.title}-key`, answerPriceCents: 1000, currency: "INR",
      ...(opts.selfTest ? { selfTest: true } : {}),
    });
  });
}

async function seed() {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const base = Math.max(istMonthStart(now) + 1000, now - 3_600_000);
  const [alice, bob] = await t.run(async (ctx) => [
    await ctx.db.insert("users", { email: "alice@example.com", name: "Alice" }),
    await ctx.db.insert("users", { email: "bob@example.com", name: "Bob" }),
  ]);
  const task1 = await seedTask(t, alice, { title: "Plumber for kitchen tap | Kondapur" });
  const ids = await t.run(async (ctx) => {
    // Job 1: first try unanswered, retry answered and charged.
    const j1 = await ctx.db.insert("shopJobs", { taskId: task1, shop: shop("p1", "Quick Plumbing"), state: "answered", attemptCount: 2, executor: "AI", billingState: "charged" });
    const a1 = await ctx.db.insert("callAttempts", { taskId: task1, shopJobId: j1, number: 1, executor: "AI", status: "unanswered", startedAt: base, endedAt: base + 30_000, dispatchState: "accepted" });
    const items = [{ id: "m1", text: "Can you come today?", kind: "must_confirm" as const }];
    const a2 = await ctx.db.insert("callAttempts", {
      taskId: task1, shopJobId: j1, number: 2, executor: "AI", status: "completed", startedAt: base + 300_000, answeredAt: base + 305_000, endedAt: base + 365_000, durationSeconds: 60,
      items, answer: { stock: "unconfirmed", items: [{ ...items[0], status: "answered", answer: "Yes, after 4 pm", quote: "after 4" }] },
      recordingId: undefined, dispatchState: "accepted",
    });
    await ctx.db.patch(j1, { latestAttemptId: a2 });
    await ctx.db.insert("creditReservations", { userId: alice, taskId: task1, shopJobId: j1, amountCents: 1000, state: "charged" });
    for (const [i, [text, ts]] of ([["AI agent calling", base], ["No answer · retry in 5 minutes", base + 30_000], ["AI agent calling again", base + 300_000], ["Answered", base + 365_000]] as const).entries())
      await ctx.db.insert("taskEvents", { taskId: task1, shopJobId: j1, eventId: `e${i}`, type: "x", text, timestamp: ts });
    // Job 2: refused, not charged.
    const j2 = await ctx.db.insert("shopJobs", { taskId: task1, shop: shop("p2", "Tap Masters"), state: "personal_call_needed", attemptCount: 1, executor: "AI", billingState: "released" });
    const a3 = await ctx.db.insert("callAttempts", { taskId: task1, shopJobId: j2, number: 1, executor: "AI", status: "refused", startedAt: base + 10_000, endedAt: base + 50_000, dispatchState: "accepted" });
    await ctx.db.patch(j2, { latestAttemptId: a3 });
    await ctx.db.insert("creditReservations", { userId: alice, taskId: task1, shopJobId: j2, amountCents: 1000, state: "released" });
    return { j1, a1, a2, a3 };
  });
  // Alice's free personal test call.
  const task2 = await seedTask(t, alice, { title: "Personal test call", selfTest: true });
  const a4 = await t.run(async (ctx) => {
    const j = await ctx.db.insert("shopJobs", { taskId: task2, shop: shop("personal-test", "You"), state: "answered", attemptCount: 1, executor: "AI", billingState: "not_assessed" });
    const a = await ctx.db.insert("callAttempts", { taskId: task2, shopJobId: j, number: 1, executor: "AI", status: "completed", startedAt: base + 400_000, endedAt: base + 420_000, dispatchState: "accepted" });
    await ctx.db.patch(j, { latestAttemptId: a });
    // An attempt from last month on an old-style task must not count in this month's totals.
    const old = await ctx.db.insert("callAttempts", { taskId: task2, shopJobId: j, number: 2, executor: "AI", status: "completed", startedAt: istMonthStart(now) - 2 * 86_400_000, dispatchState: "accepted" });
    return { a, old };
  });
  // Bob's own call.
  const task3 = await seedTask(t, bob, { title: "Notary" });
  const a5 = await t.run(async (ctx) => {
    const j = await ctx.db.insert("shopJobs", { taskId: task3, shop: shop("p9", "Bob Notary"), state: "answered", attemptCount: 1, executor: "AI", billingState: "charged" });
    const a = await ctx.db.insert("callAttempts", { taskId: task3, shopJobId: j, number: 1, executor: "AI", status: "completed", startedAt: base, endedAt: base + 1000, dispatchState: "accepted" });
    await ctx.db.patch(j, { latestAttemptId: a });
    await ctx.db.insert("creditReservations", { userId: bob, taskId: task3, shopJobId: j, amountCents: 1000, state: "charged" });
    return a;
  });
  return {
    t, task1, task2, ...ids, a4: a4.a, oldAttempt: a4.old, a5,
    alice: t.withIdentity({ subject: `${alice}|session` }),
    bob: t.withIdentity({ subject: `${bob}|session` }),
  };
}

describe("callLog.log", () => {
  it("returns one row per attempt, newest first, with per-attempt charge notes for a retried job", async () => {
    const s = await seed();
    const result = await s.alice.query(api.callLog.log, { paginationOpts: page });
    expect(result.isDone).toBe(true);
    const rows = result.page;
    expect(rows.map((r: any) => r.attemptId)).toEqual([s.a4, s.a2, s.a3, s.a1, s.oldAttempt]);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].startedAt).toBeGreaterThanOrEqual(rows[i].startedAt);
    const byId = Object.fromEntries(rows.map((r: any) => [r.attemptId, r]));
    // Retry that produced the answer is charged; the unanswered first try is not.
    expect(byId[s.a2].chargeNote).toEqual({ kind: "charged", amountCents: 1000 });
    expect(byId[s.a1].chargeNote).toMatchObject({ kind: "not_charged", reason: "didn’t answer what you asked" });
    expect(byId[s.a1].state).toBe("retry_scheduled");
    expect(byId[s.a2].state).toBe("answered");
    expect(byId[s.a3].chargeNote).toMatchObject({ kind: "not_charged", reason: "shop prefers a personal call" });
    expect(byId[s.a4].chargeNote).toEqual({ kind: "free", amountCents: 0 });
    expect(byId[s.a2]).toMatchObject({
      taskId: s.task1, taskLabel: "Plumber for kitchen tap", businessName: "Quick Plumbing", area: "Kondapur", phone: "+919999999999",
      address: "Quick Plumbing Road", source: "google", attemptNumber: 2, executor: "AI", isLatestAttempt: true, durationSeconds: 60,
      recordingAvailable: false, attemptStatus: "completed",
    });
    expect(byId[s.a2].answer.items[0]).toMatchObject({ id: "m1", status: "answered", answer: "Yes, after 4 pm" });
    expect(byId[s.a2].askedItems).toEqual([{ id: "m1", text: "Can you come today?", kind: "must_confirm" }]);
    // Timeline stops before the next try started.
    expect(byId[s.a1].timeline.map((e: any) => e.text)).toEqual(["AI agent calling", "No answer · retry in 5 minutes"]);
    expect(byId[s.a2].timeline).toHaveLength(4);
    // Never exposes storage ids, URLs or transcripts.
    for (const r of rows) for (const key of ["recordingId", "recordingUrl", "transcript", "providerCallId"]) expect(r).not.toHaveProperty(key);
  });

  it("enforces ownership: another user sees only their own attempts", async () => {
    const s = await seed();
    const bobRows = (await s.bob.query(api.callLog.log, { paginationOpts: page })).page;
    expect(bobRows.map((r: any) => r.attemptId)).toEqual([s.a5]);
    await expect(s.t.query(api.callLog.log, { paginationOpts: page })).rejects.toThrow("Sign in");
  });

  it("paginates by task, newest task first, capped per page", async () => {
    const s = await seed();
    const first = await s.alice.query(api.callLog.log, { paginationOpts: { numItems: 1, cursor: null } });
    expect(first.page.map((r: any) => r.taskId)).toEqual([s.task2, s.task2]);
    expect(first.isDone).toBe(false);
    const second = await s.alice.query(api.callLog.log, { paginationOpts: { numItems: 1, cursor: first.continueCursor } });
    expect(new Set(second.page.map((r: any) => r.taskId))).toEqual(new Set([s.task1]));
    expect(second.page).toHaveLength(3);
  });
});

describe("callLog.summary", () => {
  it("totals the current IST month for the signed-in user only", async () => {
    const s = await seed();
    await s.t.run(async (ctx) => {
      const id = (await ctx.db.query("users").collect()).find((u) => u.email === "alice@example.com")!._id;
      await ctx.db.insert("creditAccounts", { userId: id, balanceCents: 9000, reservedCents: 0 });
    });
    expect(await s.alice.query(api.callLog.summary, {})).toMatchObject({
      calls: 3, // two businesses + one personal test (distinct jobs with a try this month)
      tries: 4, // last month's attempt excluded
      answered: 2,
      chargedPaise: 1000,
      notChargedCount: 1,
      availablePaise: 9000,
      truncated: false,
    });
    expect(await s.bob.query(api.callLog.summary, {})).toMatchObject({ calls: 1, tries: 1, answered: 1, chargedPaise: 1000, notChargedCount: 0 });
  });
});

describe("call log helpers", () => {
  it("computes the IST month start", () => {
    // 2026-10-31 19:00 UTC is 2026-11-01 00:30 IST, so the month is November.
    expect(istMonthStart(Date.UTC(2026, 9, 31, 19, 0))).toBe(Date.UTC(2026, 9, 31, 18, 30));
    expect(istMonthStart(Date.UTC(2026, 9, 12, 8, 0))).toBe(Date.UTC(2026, 8, 30, 18, 30));
  });
  it("maps reservation states to charge notes", () => {
    expect(attemptChargeNote({}, { state: "reserved", amountCents: 1000 }, true, "calling")).toEqual({ kind: "held", amountCents: 1000 });
    expect(attemptChargeNote({}, { state: "refunded", amountCents: 1000 }, true, "answered")).toEqual({ kind: "refunded", amountCents: 1000 });
    expect(attemptChargeNote({}, { state: "charged", amountCents: 1000 }, false, "retry_scheduled")?.kind).toBe("not_charged");
    expect(attemptChargeNote({}, undefined, true, "answered")).toBeNull();
    expect(taskLabel("Phone | 128GB")).toBe("Phone");
  });
});
