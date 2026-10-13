import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
afterEach(() => { vi.unstubAllEnvs(); });

/** Two users; one task for each; the first user's task was started from a chat. */
async function seed() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "one@example.com", eligible: true });
    const otherId = await ctx.db.insert("users", { email: "two@example.com", eligible: true });
    const task = async (owner: typeof userId, key: string) => {
      const draftId = await ctx.db.insert("drafts", { userId: owner, productInput: "plumber", product: { name: "Plumber" }, cards: [], comments: "", shops: [], expiresAt: Date.now() + 60000 });
      return ctx.db.insert("tasks", { userId: owner, draftId, title: "Plumber", type: "shop_calls", detailsVersion: 1, product: { name: "Plumber" }, cards: [], comments: "", status: "running", approvedAt: Date.now(), idempotencyKey: key });
    };
    const chatTask = await task(userId, "a");
    const plainTask = await task(userId, "b");
    const otherTask = await task(otherId, "c");
    const now = Date.now();
    const chatId = await ctx.db.insert("chats", { userId, title: "Plumber", createdAt: now, updatedAt: now, lastTaskId: chatTask });
    await ctx.db.insert("chatMessages", { chatId, userId, role: "assistant", kind: "calls", text: "Plumber", payload: { taskId: chatTask } });
    // Another user's chat that (wrongly) points at the first user's plain task must never be returned.
    const otherChat = await ctx.db.insert("chats", { userId: otherId, title: "x", createdAt: now, updatedAt: now });
    await ctx.db.insert("chatMessages", { chatId: otherChat, userId: otherId, role: "assistant", kind: "calls", text: "x", payload: { taskId: plainTask } });
    return { userId, otherId, chatTask, plainTask, otherTask, chatId };
  });
  return { t, ...ids };
}

it("chat.forTask returns the caller's chat for a chat task, and null otherwise", async () => {
  const s = await seed();
  const me = s.t.withIdentity({ subject: `${s.userId}|session` });
  expect(await me.query(api.chat.forTask, { taskId: s.chatTask })).toBe(s.chatId);
  expect(await me.query(api.chat.forTask, { taskId: s.plainTask })).toBeNull();
  expect(await me.query(api.chat.forTask, { taskId: s.otherTask })).toBeNull();
  expect(await me.query(api.chat.forTask, { taskId: "not-an-id" })).toBeNull();
  // The other user cannot learn the first user's chat from the task id.
  const other = s.t.withIdentity({ subject: `${s.otherId}|session` });
  expect(await other.query(api.chat.forTask, { taskId: s.chatTask })).toBeNull();
  await expect(s.t.query(api.chat.forTask, { taskId: s.chatTask })).rejects.toThrow();
});

it("emails link to the chat when the task has one, else to the task page", async () => {
  const s = await seed();
  vi.stubEnv("SITE_URL", "https://app.example.com");
  const withChat = await s.t.mutation(internal.notifications.claim, { taskId: s.chatTask, type: "completed" });
  expect(withChat.payload.text).toContain(`https://app.example.com/app?chat=${s.chatId}`);
  expect(withChat.payload.text).not.toContain("/status?task=");
  const without = await s.t.mutation(internal.notifications.claim, { taskId: s.plainTask, type: "completed" });
  expect(without.payload.text).toContain(`https://app.example.com/status?task=${s.plainTask}`);
});
