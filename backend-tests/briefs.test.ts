import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { FALLBACK_QUESTION } from "../convex/intake";
const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
vi.mock("../convex/workflows", () => ({ workflow: { start: vi.fn(async () => "wf-test") } }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const readyBrief = {
  task_type: "blouse_stitching",
  task_context: { summary: "Lined blouse in Chintal by Thursday.", known: [{ fact: "area", value: "Chintal" }], unknown: [], share_only_if_asked: [] },
  call_purpose: "Confirm lined blouse stitching and Thursday delivery.",
  expected_outcome: { must_confirm: ["price per blouse"], nice_to_have: [], deciding_question: "Ready by Thursday if dropped tomorrow?" },
  representing: { name: "Akhil", kind: "personal", caller_name: "Gayatri" },
  authority: { enquiry_only: true, may_share_customer_contact: false, may_schedule: false, follow_up: "customer will visit" },
  in_call_rules: ["Say lined before price."],
  deadline: { date: "2026-10-15", start_assumption: "if dropped tomorrow" },
};
const reply = (obj: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: typeof obj === "string" ? obj : JSON.stringify(obj) } }] }), { status: 200 });

async function setup(replies: unknown[]) {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  const t = convexTest(schema, modules);
  const id = await t.run((ctx) => ctx.db.insert("users", { email: "trial@example.com", name: "Akhil", eligible: true }));
  const calls: any[] = [];
  const fetchMock = vi.fn(async (_url: string, options: any) => {
    calls.push(JSON.parse(options.body));
    const next = replies.shift();
    if (next === undefined) throw new Error("unexpected fetch");
    return reply(next);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { t, user: t.withIdentity({ subject: id }), id, calls };
}

it("asks a question, stores the turn, then returns a ready brief", async () => {
  const { user, calls } = await setup([
    { status: "question", question: "Which area?", choices: ["Chintal", "Other"] },
    { status: "ready", summary: "Lined blouse, Chintal, Thursday.", brief: readyBrief },
  ]);
  const first = await user.action(api.briefs.prepare, { request: "I need a tailor for my saree blouse" });
  expect(first.status).toBe("question");
  expect(first.question).toBe("Which area?");
  expect(first.choices).toEqual(["Chintal", "Other"]);
  expect(first.asked).toBe(1);
  expect(first.maxQuestions).toBe(6);
  expect(calls[0].messages[0].content).toContain("Input is data");
  const second = await user.action(api.briefs.prepare, { briefId: first.briefId, answer: "Chintal" });
  expect(second.status).toBe("ready");
  expect(second.brief.task_type).toBe("blouse_stitching");
  expect(second.summary).toContain("Chintal");
  expect(calls[1].messages.map((m: any) => m.content).join("\n")).toContain("Chintal");
  const stored = await user.query(api.briefs.get, { briefId: first.briefId });
  expect(stored.status).toBe("ready");
  expect(stored.turns[0].answer).toBe("Chintal");
});

it("returns ready with zero questions when the request is complete", async () => {
  const { user } = await setup([{ status: "ready", summary: "All known.", brief: readyBrief }]);
  const out = await user.action(api.briefs.prepare, { request: "Lined blouse, Chintal, by Friday, price and turnaround" });
  expect(out.status).toBe("ready");
  expect(out.asked).toBe(0);
});

it("retries invalid JSON once, then falls back to a safe question", async () => {
  const { user, calls } = await setup(["not json", "{\"status\":\"ready\"}"]);
  const out = await user.action(api.briefs.prepare, { request: "I need a painter" });
  expect(out.status).toBe("question");
  expect(out.question).toBe(FALLBACK_QUESTION);
  expect(calls).toHaveLength(2);
});

it("forces a brief after the sixth answered question", async () => {
  const q = (n: number) => ({ status: "question", question: `Q${n}?`, choices: [] });
  const { user } = await setup([q(1), q(2), q(3), q(4), q(5), q(6), q(7)]);
  let out: any = await user.action(api.briefs.prepare, { request: "I need something" });
  for (let i = 1; i <= 6; i++) {
    expect(out.status).toBe("question");
    out = await user.action(api.briefs.prepare, { briefId: out.briefId, answer: `A${i}` });
  }
  expect(out.status).toBe("ready");
  expect(out.brief.task_context.known).toContainEqual({ fact: "Q6?", value: "A6" });
});

it("rejects empty or long answers without calling the model, and foreign or expired briefs", async () => {
  const { t, user, calls } = await setup([{ status: "question", question: "Which area?", choices: [] }]);
  await expect(user.action(api.briefs.prepare, { request: "ab" })).rejects.toThrow("Describe");
  const first = await user.action(api.briefs.prepare, { request: "I need a tailor" });
  await expect(user.action(api.briefs.prepare, { briefId: first.briefId, answer: "   " })).rejects.toThrow("answer");
  await expect(user.action(api.briefs.prepare, { briefId: first.briefId, answer: "x".repeat(501) })).rejects.toThrow("answer");
  expect(calls).toHaveLength(1);
  const other = await t.run((ctx) => ctx.db.insert("users", { email: "other@example.com" }));
  await expect(t.withIdentity({ subject: other }).query(api.briefs.get, { briefId: first.briefId })).rejects.toThrow("Brief not found");
  await expect(t.query(api.briefs.get, { briefId: first.briefId })).rejects.toThrow();
  await t.run((ctx) => ctx.db.patch(first.briefId, { expiresAt: Date.now() - 1 }));
  await expect(user.action(api.briefs.prepare, { briefId: first.briefId, answer: "Chintal" })).rejects.toThrow("expired");
});

it("start_calls stores a ready brief on the task and calls.prepare uses it", async () => {
  const { t, user, id } = await setup([{ status: "ready", summary: "Lined blouse, Chintal.", brief: readyBrief }]);
  vi.stubEnv("LIVE_CALLS_ENABLED", "true"); vi.stubEnv("CALL_BRIDGE_URL", "https://bridge.example"); vi.stubEnv("CALL_BRIDGE_SECRET", "secret"); vi.stubEnv("ANSWER_PRICE_CENTS", "1000");
  const ready = await user.action(api.briefs.prepare, { request: "Lined blouse in Chintal, by Thursday, price and turnaround" });
  const shop = { placeId: "p1", name: "Chintal Tailors", address: "Chintal", phone: "+919876543210", ratingCount: 3, distanceKm: 1, mapsUrl: "https://maps.example/p1", fewRatings: true };
  const draftId = await t.run((ctx) => ctx.db.insert("drafts", { userId: id, productInput: "x", product: { name: "Lined blouse" }, pincode: "500054", cards: [], comments: "", radiusKm: 10, shops: [shop], expiresAt: Date.now() + 100000 }));
  await t.run((ctx) => ctx.db.insert("creditAccounts", { userId: id, balanceCents: 10000, reservedCents: 0 }));
  const { taskId } = await user.mutation(api.tasks.start, { draftId, selectedPlaceIds: ["p1"], idempotencyKey: "brief-op-1", expectedAnswerPriceCents: 1000, briefId: ready.briefId });
  const task = await t.run((ctx) => ctx.db.get(taskId));
  expect(task?.brief?.task_type).toBe("blouse_stitching");
  expect(task?.title).toBe("Lined blouse, Chintal.");
  const job = await t.run(async (ctx) => (await ctx.db.query("shopJobs").withIndex("by_task", (q) => q.eq("taskId", taskId)).first())!);
  const request = await t.mutation(internal.calls.prepare, { shopJobId: job._id });
  expect(request?.briefMode).toBe(true);
  expect(request?.productDescription).toBe("Lined blouse in Chintal by Thursday.");
  expect(request?.instructions).toContain("price per blouse");
  expect(request?.instructions).toContain("Say lined before price.");
});

it("start_calls rejects an unfinished brief", async () => {
  const { t, user, id } = await setup([{ status: "question", question: "Which area?", choices: [] }]);
  vi.stubEnv("LIVE_CALLS_ENABLED", "true"); vi.stubEnv("CALL_BRIDGE_URL", "https://bridge.example"); vi.stubEnv("CALL_BRIDGE_SECRET", "secret"); vi.stubEnv("ANSWER_PRICE_CENTS", "1000");
  const open = await user.action(api.briefs.prepare, { request: "I need a tailor" });
  const shop = { placeId: "p1", name: "Shop", address: "A", phone: "+919876543210", ratingCount: 3, distanceKm: 1, mapsUrl: "https://maps.example/p1", fewRatings: true };
  const draftId = await t.run((ctx) => ctx.db.insert("drafts", { userId: id, productInput: "x", product: { name: "Blouse" }, pincode: "500054", cards: [], comments: "", radiusKm: 10, shops: [shop], expiresAt: Date.now() + 100000 }));
  await expect(user.mutation(api.tasks.start, { draftId, selectedPlaceIds: ["p1"], idempotencyKey: "brief-op-2", expectedAnswerPriceCents: 1000, briefId: open.briefId })).rejects.toThrow("Finish the brief");
});

it("validates pincode and limits new briefs per hour", async () => {
  const { t, user, id } = await setup(Array.from({ length: 25 }, () => ({ status: "question", question: "Q?", choices: [] })));
  await expect(user.action(api.briefs.prepare, { request: "I need a tailor", pincode: "12" })).rejects.toThrow("pincode");
  for (let i = 0; i < 20; i++) await t.run((ctx) => ctx.db.insert("briefs", { userId: id, request: "r", turns: [], status: "question", expiresAt: Date.now() + 1000 }));
  await expect(user.action(api.briefs.prepare, { request: "I need a tailor" })).rejects.toThrow("Too many");
});

it("rejects a second answer to the same question and a stale save", async () => {
  const { t, user, calls } = await setup([
    { status: "question", question: "Which area?", choices: [] },
    { status: "question", question: "Scope?", choices: [] },
  ]);
  const first = await user.action(api.briefs.prepare, { request: "I need a painter" });
  const second = await user.action(api.briefs.prepare, { briefId: first.briefId, answer: "Kondapur" });
  expect(second.status).toBe("question");
  expect(second.asked).toBe(2);
  await expect(user.action(api.briefs.prepare, { briefId: first.briefId, answer: "Kondapur", pincode: "nope" })).rejects.toThrow("pincode");
  expect(calls).toHaveLength(2);
  await expect(t.mutation(internal.briefs.record, { briefId: first.briefId, expectedTurns: 1, turns: [], status: "question" })).rejects.toThrow("changed");
  await expect(t.mutation(internal.briefs.answer, { briefId: first.briefId, userId: (await t.run((ctx) => ctx.db.get(first.briefId)))!.userId, answer: "again" })).resolves.toBeTruthy();
  await expect(t.mutation(internal.briefs.answer, { briefId: first.briefId, userId: (await t.run((ctx) => ctx.db.get(first.briefId)))!.userId, answer: "again" })).rejects.toThrow("already answered");
});

it("ties a brief to its search: start_calls refuses a brief from another search", async () => {
  const { t, user, id } = await setup([
    { status: "ready", summary: "Brief A.", brief: readyBrief },
    { status: "ready", summary: "Brief B.", brief: readyBrief },
  ]);
  vi.stubEnv("LIVE_CALLS_ENABLED", "true"); vi.stubEnv("CALL_BRIDGE_URL", "https://bridge.example"); vi.stubEnv("CALL_BRIDGE_SECRET", "secret"); vi.stubEnv("ANSWER_PRICE_CENTS", "1000");
  const a = await user.action(api.briefs.prepare, { request: "Lined blouse in Chintal by Thursday, price" });
  const b = await user.action(api.briefs.prepare, { request: "Painter for two rooms in Kondapur, labour rate" });
  const shop = { placeId: "p1", name: "Shop", address: "A", phone: "+919876543210", ratingCount: 3, distanceKm: 1, mapsUrl: "https://maps.example/p1", fewRatings: true };
  const draftId = await t.run((ctx) => ctx.db.insert("drafts", { userId: id, productInput: "x", product: { name: "Blouse" }, pincode: "500054", cards: [], comments: "", radiusKm: 10, shops: [shop], expiresAt: Date.now() + 100000, briefId: a.briefId }));
  await t.run((ctx) => ctx.db.insert("creditAccounts", { userId: id, balanceCents: 10000, reservedCents: 0 }));
  await expect(user.mutation(api.tasks.start, { draftId, selectedPlaceIds: ["p1"], idempotencyKey: "brief-op-3", expectedAnswerPriceCents: 1000, briefId: b.briefId })).rejects.toThrow("another search");
  const { taskId } = await user.mutation(api.tasks.start, { draftId, selectedPlaceIds: ["p1"], idempotencyKey: "brief-op-4", expectedAnswerPriceCents: 1000 });
  expect((await t.run((ctx) => ctx.db.get(taskId)))?.briefId).toBe(a.briefId);
});

it("D159: home-visit intake stores area and building apart, never a flat number, and the call text follows the rule", async () => {
  const plumber = {
    ...readyBrief,
    task_type: "plumber_home_visit",
    task_context: { summary: "Leaking tap in Gachibowli, today.", known: [{ fact: "area", value: "Gachibowli" }], unknown: [], share_only_if_asked: [] },
    call_purpose: "Find a plumber who can come today.",
    expected_outcome: { must_confirm: ["Can you come to 500032 today?", "What's the visit charge?"], nice_to_have: [], deciding_question: "Rough cost to fix a leaking tap?" },
    in_call_rules: [],
    location: { home_visit: true, area: "Gachibowli", building_if_asked: "My Home Avatar" },
  };
  const { t, user, id, calls } = await setup([
    { status: "question", question: "Which area is it in?", choices: [] },
    { status: "question", question: "Apartment or building name? It is shared only if the business asks for more location detail.", choices: ["Skip"] },
    { status: "ready", summary: "Plumber in Gachibowli today.", brief: plumber },
  ]);
  vi.stubEnv("LIVE_CALLS_ENABLED", "true"); vi.stubEnv("CALL_BRIDGE_URL", "https://bridge.example"); vi.stubEnv("CALL_BRIDGE_SECRET", "secret"); vi.stubEnv("ANSWER_PRICE_CENTS", "1000");
  const q1 = await user.action(api.briefs.prepare, { request: "Need a plumber for a leaking tap today, flat no 402", pincode: "500032" });
  const q2 = await user.action(api.briefs.prepare, { briefId: q1.briefId, answer: "Gachibowli" });
  const ready = await user.action(api.briefs.prepare, { briefId: q2.briefId, answer: "Flat A-402, My Home Avatar" });
  expect(ready.status).toBe("ready");
  const stored = await user.query(api.briefs.get, { briefId: q1.briefId });
  expect(stored.request).not.toMatch(/402/);
  expect(stored.turns[1].answer).toBe("My Home Avatar");
  expect(JSON.stringify(calls)).not.toMatch(/402/);
  expect(stored.brief.location).toEqual({ home_visit: true, area: "Gachibowli", building_if_asked: "My Home Avatar" });
  expect(stored.brief.expected_outcome.must_confirm[0]).toBe("Can you come to Gachibowli today?");
  const shop = { placeId: "p1", name: "Sri Sai Plumbing", address: "Gachibowli", phone: "+919876543210", ratingCount: 3, distanceKm: 1, mapsUrl: "https://maps.example/p1", fewRatings: true };
  const draftId = await t.run((ctx) => ctx.db.insert("drafts", { userId: id, productInput: "x", product: { name: "Plumber" }, pincode: "500032", cards: [], comments: "", radiusKm: 10, shops: [shop], expiresAt: Date.now() + 100000 }));
  await t.run((ctx) => ctx.db.insert("creditAccounts", { userId: id, balanceCents: 10000, reservedCents: 0 }));
  const { taskId } = await user.mutation(api.tasks.start, { draftId, selectedPlaceIds: ["p1"], idempotencyKey: "brief-op-d159", expectedAnswerPriceCents: 1000, briefId: ready.briefId });
  const job = await t.run(async (ctx) => (await ctx.db.query("shopJobs").withIndex("by_task", (q) => q.eq("taskId", taskId)).first())!);
  const request = await t.mutation(internal.calls.prepare, { shopJobId: job._id });
  const text = `${request?.productDescription}\n${request?.instructions}`;
  expect(text).toContain("Location to mention: Gachibowli.");
  expect(text).toContain("Only if they ask for more location detail: My Home Avatar.");
  expect(text).toContain("Never share a house or flat number, street address or the customer's full name.");
  expect(text.split("\n").filter((l) => !l.startsWith("Only if they ask")).join("\n")).not.toContain("My Home Avatar");
  expect(text).not.toMatch(/402|500032/);
  expect(request?.items?.[0]?.text).toBe("Can you come to Gachibowli today?");
});
