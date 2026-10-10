import { it, expect, vi, afterEach, describe } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { briefItems, isChargeable, objectiveComplete, objectiveMet, type ItemResult } from "../convex/domain";
import type { Brief } from "../convex/intake";

const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
afterEach(() => vi.unstubAllEnvs());

const brief: Brief = {
  task_type: "distribution_enquiry",
  task_context: { summary: "Customer wants to know if they offer distribution partnerships.", known: [], unknown: [], share_only_if_asked: [] },
  call_purpose: "Find out whether they offer distribution partnerships.",
  expected_outcome: {
    must_confirm: ["offers distribution partnerships: yes/no", "minimum order"],
    nice_to_have: ["margin"],
    deciding_question: "Who should the customer contact about it?",
  },
  representing: { name: "the customer", kind: "personal", caller_name: "Gayatri" },
  authority: { enquiry_only: true, may_share_customer_contact: false, may_schedule: false, follow_up: "customer will follow up" },
  in_call_rules: [],
  deadline: { date: null, start_assumption: null },
};
const item = (id: string, kind: ItemResult["kind"], status: ItemResult["status"]): ItemResult => ({ id, text: id, kind, status });

describe("objective rule (D150)", () => {
  it("builds ids from the brief", () => {
    expect(briefItems(brief).map((i) => [i.id, i.kind])).toEqual([
      ["m1", "must_confirm"], ["m2", "must_confirm"], ["d", "deciding"], ["n1", "nice_to_have"],
    ]);
    expect(briefItems(undefined)).toEqual([]);
  });
  it("one answered or conditional must-confirm item, or the deciding question, is enough", () => {
    expect(objectiveMet([item("m1", "must_confirm", "answered"), item("d", "deciding", "not_answered")])).toBe(true);
    expect(objectiveMet([item("m1", "must_confirm", "conditional")])).toBe(true);
    expect(objectiveMet([item("m1", "must_confirm", "not_answered"), item("d", "deciding", "answered")])).toBe(true);
  });
  it("nice-to-have alone never counts", () => {
    expect(objectiveMet([item("m1", "must_confirm", "not_answered"), item("n1", "nice_to_have", "answered")])).toBe(false);
  });
  it("complete needs every counted item covered", () => {
    expect(objectiveComplete([item("m1", "must_confirm", "answered"), item("d", "deciding", "conditional"), item("n1", "nice_to_have", "not_answered")])).toBe(true);
    expect(objectiveComplete([item("m1", "must_confirm", "answered"), item("d", "deciding", "not_answered")])).toBe(false);
  });
  it("refusal and unreachable are never charged; product tasks keep the old rule", () => {
    const met = { stock: "unconfirmed", items: [item("m1", "must_confirm", "answered")] };
    expect(isChargeable("personal_call_needed", met, true)).toBe(false);
    expect(isChargeable("unreachable", met, true)).toBe(false);
    expect(isChargeable("answered", { stock: "unconfirmed", notes: "they said something" }, true)).toBe(false);
    expect(isChargeable("incomplete_answer", { stock: "unconfirmed", notes: "they said something" }, false)).toBe(true);
    expect(isChargeable("incomplete_answer", { stock: "unconfirmed" }, false)).toBe(false);
  });
});

async function briefTask() {
  vi.stubEnv("ANSWER_PRICE_CENTS", "1000");
  vi.stubEnv("LIVE_CALLS_ENABLED", "true");
  vi.stubEnv("CALL_BRIDGE_URL", "https://test.invalid");
  vi.stubEnv("CALL_BRIDGE_SECRET", "test-only");
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  const { userId, draftId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "objective@example.com", name: "Test", eligible: true });
    await ctx.db.insert("creditEntries", { userId, amount: 100, amountCents: 10000, currency: "INR", type: "grant", reason: "test", operationId: "grant" });
    const shop = { placeId: "p1", name: "Distributor", address: "Road", phone: "+919999999999", ratingCount: 100, distanceKm: 1, mapsUrl: "https://maps.google.com", fewRatings: false };
    const draftId = await ctx.db.insert("drafts", { userId, productInput: "partnership", product: { name: "partnership" }, pincode: "500037", cards: [], comments: "", radiusKm: 10, shops: [shop], expiresAt: Date.now() + 60000 });
    return { userId, draftId };
  });
  const user = t.withIdentity({ subject: `${userId}|session` });
  const { taskId } = await user.mutation(api.tasks.start, { draftId, selectedPlaceIds: ["p1"], idempotencyKey: `k${Math.random()}`, expectedAnswerPriceCents: 1000 });
  await t.run((ctx) => ctx.db.patch(taskId, { brief }));
  const job = (await user.query(api.tasks.get, { taskId })).shops[0];
  const request = await t.mutation(internal.calls.prepare, { shopJobId: job._id });
  return { t, user, taskId, job, request };
}

describe("receive with a brief", () => {
  it("sends the brief items to the bridge and stores them on the attempt", async () => {
    const { t, request } = await briefTask();
    expect(request.items.map((i: any) => i.id)).toEqual(["m1", "m2", "d", "n1"]);
    const attempt = await t.run((ctx) => ctx.db.get(request.attemptId));
    expect(attempt?.items?.length).toBe(4);
  });

  it("charges a clear no to a yes/no enquiry and keeps the rest visibly open", async () => {
    const { t, user, taskId, job, request } = await briefTask();
    await t.mutation(internal.calls.receive, {
      taskId, shopJobId: job._id, attemptId: request.attemptId, eventId: "no-answer-is-an-answer", status: "completed",
      answer: { stock: "unconfirmed", currency: "INR", notes: "They do not offer partnerships.",
        items: [{ id: "m1", status: "answered", answer: "No", quote: "No, we don't." }, { id: "m1", status: "not_answered" }, { id: "x9", status: "answered", answer: "spoof", quote: "spoof" }] },
    });
    const shop = (await user.query(api.tasks.get, { taskId })).shops[0];
    expect(shop.billingState).toBe("charged");
    expect(shop.state).toBe("incomplete_answer");
    expect(shop.answer.items.map((i: any) => [i.id, i.status])).toEqual([["m1", "answered"], ["m2", "not_answered"], ["d", "not_answered"], ["n1", "not_answered"]]);
    expect(shop.answer.items[0].text).toBe("offers distribution partnerships: yes/no");
  });

  it("marks answered when every counted item is covered", async () => {
    const { t, user, taskId, job, request } = await briefTask();
    await t.mutation(internal.calls.receive, {
      taskId, shopJobId: job._id, attemptId: request.attemptId, eventId: "all-covered", status: "completed",
      answer: { stock: "unconfirmed", items: [
        { id: "m1", status: "answered", answer: "Yes", quote: "Yes" },
        { id: "m2", status: "conditional", answer: "Depends on region", quote: "depends" },
        { id: "d", status: "answered", answer: "Email the sales head", quote: "email sales" },
      ] },
    });
    const shop = (await user.query(api.tasks.get, { taskId })).shops[0];
    expect(shop.state).toBe("answered");
    expect(shop.billingState).toBe("charged");
  });

  it("releases credit when the shop talked but answered none of the questions, even with notes", async () => {
    const { t, user, taskId, job, request } = await briefTask();
    await t.mutation(internal.calls.receive, {
      taskId, shopJobId: job._id, attemptId: request.attemptId, eventId: "none", status: "completed",
      answer: { stock: "unconfirmed", notes: "Shop said the owner is out.", items: [{ id: "n1", status: "answered", answer: "10%", quote: "ten percent" }] },
    });
    const shop = (await user.query(api.tasks.get, { taskId })).shops[0];
    expect(shop.state).toBe("incomplete_answer");
    expect(shop.billingState).toBe("released");
    expect(shop.chargeNote.reason).toBe("didn’t answer what you asked");
  });
});
