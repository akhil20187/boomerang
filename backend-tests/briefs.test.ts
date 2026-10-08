import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { FALLBACK_QUESTION } from "../convex/intake";
const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const readyBrief = {
  task_type: "blouse_stitching",
  task_context: { summary: "Lined blouse in Chintal by Thursday.", known: { area: "Chintal" }, unknown: [], share_only_if_asked: [] },
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
  expect(out.brief.task_context.known["Q6?"]).toBe("A6");
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
