import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal, api } from "../convex/_generated/api";
const modules = import.meta.glob([
  "../convex/**/*.{ts,js}",
  "!../convex/**/*.d.ts",
]);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("verifies saved callbacks, private test audio and exactly two idempotent emails with mocked transport", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://app.convex.site");
  vi.stubEnv("TEST_ACCOUNT_EMAIL", "test@example.com");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  vi.stubEnv("RESEND_FROM_EMAIL", "test@example.com");
  const sent: any[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      expect(String(url)).toBe("https://api.resend.com/emails");
      sent.push(JSON.parse(init.body));
      return Response.json({ id: `email-${sent.length}` });
    }),
  );
  const t = convexTest(schema, modules);
  const fixture = await t.mutation(internal.verification.create, {
    email: "test@example.com",
    label: "Integration test",
  });
  await t.action(internal.verification.run, { taskId: fixture.taskId });
  await t.action(internal.verification.run, { taskId: fixture.taskId });
  expect(sent).toHaveLength(2);
  expect(sent.every((s) => s.to === "test@example.com")).toBe(true);
  const task = await t.query(api.tasks.get, {
    taskId: fixture.taskId,
    accessToken: fixture.token,
  });
  expect(task.task.status).toBe("finished");
  expect(task.emailSent).toBe(true);
  expect(task.shops[0].recordingAvailable).toBe(true);
  expect(task.shops[0].recordingUrl).toBeNull();
  const playback = await t.mutation(api.recordings.playback, {
    attemptId: fixture.attemptId,
    accessToken: fixture.token,
  });
  expect(playback.url).toContain("/api/recording?token=");
  expect(
    (await t.query(api.users.me, { accessToken: fixture.token })).creditBalance,
  ).toBe(0);
  await t.mutation(internal.verification.revoke, { tokenId: fixture.tokenId });
  expect(
    await t.query(api.users.me, { accessToken: fixture.token }),
  ).toBeNull();
});
it("guards fixture identity and labels all simulated evidence without dialing or credit changes", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://app.convex.site");
  vi.stubEnv("TEST_ACCOUNT_EMAIL", "test@example.com");
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(internal.verification.create, {
      email: "other@example.com",
      label: "Test",
    }),
  ).rejects.toThrow("not authorized");
  const result = await t.mutation(internal.verification.create, {
    email: "test@example.com",
    label: "Test",
  });
  const saved = await t.query(api.tasks.get, {
    taskId: result.taskId,
    accessToken: result.token,
  });
  expect(saved.task.verification).toBe(true);
  expect(saved.task.title).toContain("[Verification]");
  expect(saved.shops[0].name).toContain("Test");
  expect(
    (await t.query(api.users.me, { accessToken: result.token })).creditBalance,
  ).toBe(0);
  expect(
    (await t.run((ctx) => ctx.db.get(result.attemptId))).providerCallId,
  ).toBeUndefined();
});
