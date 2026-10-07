import { it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);

async function runAll(t: ReturnType<typeof convexTest>) {
  let cursor: string | null = null, mismatched: string[] = [], converted = 0;
  for (;;) {
    const r: any = await t.mutation(internal.maintenance.convertCreditsToRupees, { cursor });
    mismatched = mismatched.concat(r.mismatched); converted += r.converted;
    if (r.isDone) break; cursor = r.continueCursor;
  }
  cursor = null;
  for (;;) {
    const r: any = await t.mutation(internal.maintenance.convertTaskPricesToRupees, { cursor });
    if (r.isDone) break; cursor = r.continueCursor;
  }
  return { mismatched, converted };
}

async function accountWithHolds(t: ReturnType<typeof convexTest>, email: string, balanceCents = 500) {
  return t.run(async ctx => {
    const userId = await ctx.db.insert("users", { email });
    await ctx.db.insert("creditEntries", { userId, amount: 5, amountCents: 500, currency: "USD", type: "grant", reason: "welcome", operationId: `welcome:${userId}` });
    const draftId = await ctx.db.insert("drafts", { userId, productInput: "phone", product: { name: "phone" }, pincode: "500037", cards: [], comments: "", radiusKm: 10, shops: [], expiresAt: Date.now() + 60000 });
    const taskId = await ctx.db.insert("tasks", { userId, draftId, title: "phone", type: "shop_calls", detailsVersion: 1, status: "running", approvedAt: Date.now(), idempotencyKey: `k:${email}`, answerPriceCents: 100, product: { name: "phone" }, pincode: "500037", cards: [], comments: "" });
    for (let i = 0; i < 3; i++) {
      const shop = { placeId: `p${i}`, name: `Shop ${i}`, address: "Road", ratingCount: 100, distanceKm: 1, mapsUrl: "https://maps.google.com", fewRatings: false };
      const shopJobId = await ctx.db.insert("shopJobs", { taskId, shop, state: "waiting", attemptCount: 0, executor: "AI", billingState: "reserved" });
      await ctx.db.insert("creditReservations", { userId, taskId, shopJobId, amountCents: 100, state: "reserved" });
      await ctx.db.insert("creditEntries", { userId, taskId, shopJobId, amount: 0, amountCents: 100, currency: "USD", type: "reservation", reason: "hold", operationId: `reserve:${shopJobId}` });
    }
    await ctx.db.insert("creditAccounts", { userId, balanceCents, reservedCents: 300 });
    return { userId, taskId };
  });
}
const me = (t: ReturnType<typeof convexTest>, userId: string) => t.withIdentity({ subject: `${userId}|session` }).query(api.users.me, {});

it("converts balances, holds and history ×100 and marks them INR", async () => {
  const t = convexTest(schema, modules);
  const { userId, taskId } = await accountWithHolds(t, "holds@example.com");
  await runAll(t);
  const account: any = await me(t, userId);
  expect(account).toMatchObject({ balanceCents: 50000, reservedCents: 30000, availableCents: 20000, currency: "INR" });
  const rows = await t.run(async ctx => ({
    entries: await ctx.db.query("creditEntries").collect(),
    reservations: await ctx.db.query("creditReservations").collect(),
    task: await ctx.db.get(taskId),
  }));
  expect(rows.entries.every(e => e.currency === "INR")).toBe(true);
  expect(rows.entries.find(e => e.type === "grant")).toMatchObject({ amount: 500, amountCents: 50000 });
  expect(rows.reservations.map(r => r.amountCents)).toEqual([10000, 10000, 10000]);
  expect(rows.task).toMatchObject({ answerPriceCents: 10000, currency: "INR" });
});

it("converts an old history with no account row and no amountCents", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(async ctx => {
    const id = await ctx.db.insert("users", { email: "legacy@example.com" });
    await ctx.db.insert("creditEntries", { userId: id, amount: 5, currency: "USD", type: "grant", reason: "legacy", operationId: `welcome:${id}` });
    return id;
  });
  await runAll(t);
  expect((await me(t, userId) as any).availableCents).toBe(50000);
});

it("is safe to run twice", async () => {
  const t = convexTest(schema, modules);
  const { userId, taskId } = await accountWithHolds(t, "twice@example.com");
  await runAll(t);
  const second = await runAll(t);
  expect(second.converted).toBe(0);
  expect((await me(t, userId) as any).balanceCents).toBe(50000);
  expect((await t.run(ctx => ctx.db.get(taskId)))?.answerPriceCents).toBe(10000);
});

it("reports and skips an account whose balance does not match its history", async () => {
  const t = convexTest(schema, modules);
  const { userId } = await accountWithHolds(t, "mismatch@example.com", 999);
  const result = await runAll(t);
  expect(result.mismatched).toEqual([userId]);
  expect((await me(t, userId) as any).balanceCents).toBe(999);
  const entries = await t.run(ctx => ctx.db.query("creditEntries").collect());
  expect(entries.every(e => e.currency === "USD")).toBe(true);
});
