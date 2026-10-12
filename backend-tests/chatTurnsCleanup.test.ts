import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { CHAT_TURN_CLEANUP_BATCH } from "../convex/maintenance";

const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
afterEach(() => { vi.useRealTimers(); });

it("deletes chat turn records older than 2 hours and keeps recent ones", async () => {
  vi.useFakeTimers();
  const start = Date.UTC(2026, 9, 12, 6, 0);
  vi.setSystemTime(start);
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { email: "a@example.com" }));
  await t.run(async (ctx) => { for (let i = 0; i < 3; i++) await ctx.db.insert("chatTurns", { userId }); });
  vi.setSystemTime(start + 90 * 60 * 1000);
  await t.run((ctx) => ctx.db.insert("chatTurns", { userId }));
  // 2 h 1 min after the first three: they are past retention, the 90-minute one is not.
  vi.setSystemTime(start + 121 * 60 * 1000);
  expect(await t.mutation(internal.maintenance.cleanupChatTurns, {})).toBe(3);
  expect(await t.run((ctx) => ctx.db.query("chatTurns").collect())).toHaveLength(1);
  expect(await t.mutation(internal.maintenance.cleanupChatTurns, {})).toBe(0);
});

it("works in bounded batches and schedules the rest", async () => {
  vi.useFakeTimers();
  const start = Date.UTC(2026, 9, 12, 6, 0);
  vi.setSystemTime(start);
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { email: "b@example.com" }));
  const total = CHAT_TURN_CLEANUP_BATCH + 5;
  await t.run(async (ctx) => { for (let i = 0; i < total; i++) await ctx.db.insert("chatTurns", { userId }); });
  vi.setSystemTime(start + 3 * 60 * 60 * 1000);
  expect(await t.mutation(internal.maintenance.cleanupChatTurns, {})).toBe(CHAT_TURN_CLEANUP_BATCH);
  expect(await t.run((ctx) => ctx.db.query("chatTurns").collect())).toHaveLength(5);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.query("chatTurns").collect())).toHaveLength(0);
});
