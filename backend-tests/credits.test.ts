import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { approveWithWelcomeCredit } from '../convex/onboarding';
const modules = import.meta.glob([
  "../convex/**/*.{ts,js}",
  "!../convex/**/*.d.ts",
]);
afterEach(() => vi.unstubAllEnvs());
it("welcome credit is exactly one dollar and repeated approval cannot duplicate it", async () => {
  const t = convexTest(schema, modules);
  const email = "welcome-test@example.com";
  const userId = await t.run(ctx => ctx.db.insert("users", { email }));
  const user = t.withIdentity({ subject: `${userId}|session` });
  expect((await user.query(api.users.me, {})).availableBalance).toBe(0);
  for (let i = 0; i < 2; i++)
    await t.mutation(internal.admin.approve, { email, grantWelcomeCredit: true });
  const account = await user.query(api.users.me, {});
  expect(account.eligible).toBe(true);
  expect(account.creditBalance).toBe(1);
  expect(account.availableBalance).toBe(1);
  expect(account.reservedBalance).toBe(0);
  const grants = await t.run(ctx => ctx.db.query("creditEntries").collect());
  expect(grants.filter(entry => entry.type === "grant")).toHaveLength(1);
});
it('verified signup onboarding approves and grants once, preserving existing welcome grants', async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(ctx => ctx.db.insert('users', {email:'signup@example.com'}));
  await t.run(ctx => approveWithWelcomeCredit(ctx, userId));
  await t.run(ctx => approveWithWelcomeCredit(ctx, userId));
  const account = await t.withIdentity({subject:`${userId}|session`}).query(api.users.me, {});
  expect(account.eligible).toBe(true);
  expect(account.availableBalance).toBe(1);
  const existing = await t.run(async ctx => {
    const id = await ctx.db.insert('users', {email:'legacy@example.com'});
    await ctx.db.insert('creditEntries', {userId:id,amount:5,currency:'USD',type:'grant',reason:'Legacy welcome credit',operationId:`welcome:${id}`});
    return id;
  });
  await t.run(ctx => approveWithWelcomeCredit(ctx, existing));
  expect((await t.withIdentity({subject:`${existing}|session`}).query(api.users.me, {})).creditBalance).toBe(5);
});
async function setup(price = "300") {
  vi.stubEnv("ANSWER_PRICE_CENTS", price);
  vi.stubEnv("LIVE_CALLS_ENABLED", "true");
  vi.stubEnv("CALL_BRIDGE_URL", "https://test.invalid");
  vi.stubEnv("CALL_BRIDGE_SECRET", "test-only");
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "credit@example.com",
      name: "Test",
      eligible: true,
    });
    await ctx.db.insert("creditEntries", {
      userId,
      amount: 5,
      currency: "USD",
      type: "grant",
      reason: "test",
      operationId: "grant",
    });
    const shop = {
      placeId: "p1",
      name: "Shop",
      address: "Road",
      phone: "+919999999999",
      ratingCount: 100,
      distanceKm: 1,
      mapsUrl: "https://maps.google.com",
      fewRatings: false,
    };
    const draftId = await ctx.db.insert("drafts", {
      userId,
      productInput: "phone",
      product: { name: "phone" },
      pincode: "500037",
      cards: [],
      comments: "",
      radiusKm: 10,
      shops: [shop],
      expiresAt: Date.now() + 60000,
    });
    return { userId, draftId };
  });
  return {
    t,
    user: t.withIdentity({ subject: `${ids.userId}|session` }),
    ...ids,
  };
}
it("blocks real starts with an unset or invalid price without creating reservations", async () => {
  for (const price of ["", "0", "1.5", "-1", "bad"]) {
    const s = await setup(price);
    await expect(
      s.user.mutation(api.tasks.start, {
        draftId: s.draftId,
        selectedPlaceIds: ["p1"],
        idempotencyKey: "no-price-request",
      }),
    ).rejects.toThrow("price");
    expect((await s.user.query(api.users.me, {})).reservedBalance).toBe(0);
  }
});
it("reserves atomically, prevents concurrent overspend and freezes price", async () => {
  const s = await setup();
  const attempts = await Promise.allSettled(
    ["one-request", "two-request"].map((idempotencyKey) =>
      s.user.mutation(api.tasks.start, {
        draftId: s.draftId,
        selectedPlaceIds: ["p1"],
        idempotencyKey,
        expectedAnswerPriceCents: 300,
      }),
    ),
  );
  expect(attempts.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  const winner = attempts.find(
    (x) => x.status === "fulfilled",
  ) as PromiseFulfilledResult<any>;
  const task = await s.user.query(api.tasks.get, {
    taskId: winner.value.taskId,
  });
  expect(task.task.answerPriceCents).toBe(300);
  const balance = await s.user.query(api.users.me, {});
  expect(balance.creditBalance).toBe(5);
  expect(balance.availableBalance).toBe(2);
  expect(balance.reservedBalance).toBe(3);
  const operation = task.task.idempotencyKey;
  vi.stubEnv("ANSWER_PRICE_CENTS", "400");
  expect(
    await s.user.mutation(api.tasks.start, {
      draftId: s.draftId,
      selectedPlaceIds: ["p1"],
      idempotencyKey: operation,
      expectedAnswerPriceCents: 300,
    }),
  ).toEqual(winner.value);
  expect((await s.user.query(api.users.me, {})).reservedBalance).toBe(3);
});
it("rejects a changed or missing customer quote before saving any task or held credit", async () => {
  const s = await setup("200");
  for (const expectedAnswerPriceCents of [undefined, 100])
    await expect(
      s.user.mutation(api.tasks.start, {
        draftId: s.draftId,
        selectedPlaceIds: ["p1"],
        idempotencyKey: "price-review",
        expectedAnswerPriceCents,
      }),
    ).rejects.toThrow("service-call price");
  const balance = await s.user.query(api.users.me, {});
  expect(balance.reservedBalance).toBe(0);
  expect(balance.availableBalance).toBe(5);
  expect(await s.user.query(api.tasks.list, {})).toHaveLength(0);
});
it("charges a notes-only terminal answer once at the frozen price, refunds at most once", async () => {
  const s = await setup("100");
  const { taskId } = await s.user.mutation(api.tasks.start, {
    draftId: s.draftId,
    selectedPlaceIds: ["p1"],
    idempotencyKey: "charge-once",
    expectedAnswerPriceCents: 100,
  });
  const task = await s.user.query(api.tasks.get, { taskId });
  const prepared = await s.t.mutation(internal.calls.prepare, {
    shopJobId: task.shops[0]._id,
  });
  vi.stubEnv("ANSWER_PRICE_CENTS", "200");
  const callback = {
    ...prepared,
    eventId: "answer-charge",
    status: "completed",
    answer: { stock: "available", notes: "Caller confirmed availability." },
  };
  delete callback.to;
  delete callback.businessName;
  delete callback.customerName;
  delete callback.productDescription;
  delete callback.instructions;
  await s.t.mutation(internal.calls.receive, callback);
  await s.t.mutation(internal.calls.receive, callback);
  const account = await s.user.query(api.users.me, {});
  expect(account.creditBalance).toBe(4);
  expect(account.reservedBalance).toBe(0);
  expect(
    (await s.user.query(api.tasks.get, { taskId })).shops[0].billingState,
  ).toBe("charged");
  await s.t.mutation(internal.credits.refund, {
    shopJobId: task.shops[0]._id,
    reason: "Approved test refund",
  });
  await s.t.mutation(internal.credits.refund, {
    shopJobId: task.shops[0]._id,
    reason: "Approved test refund",
  });
  expect((await s.user.query(api.users.me, {})).creditBalance).toBe(5);
});
it("keeps credit held for retry and releases it when a shop prefers a person", async () => {
  const s = await setup("100");
  const { taskId } = await s.user.mutation(api.tasks.start, {
    draftId: s.draftId,
    selectedPlaceIds: ["p1"],
    idempotencyKey: "retry-hold",
    expectedAnswerPriceCents: 100,
  });
  const task = await s.user.query(api.tasks.get, { taskId });
  const prepared = await s.t.mutation(internal.calls.prepare, {
    shopJobId: task.shops[0]._id,
  });
  await s.t.mutation(internal.calls.receive, {
    attemptId: prepared.attemptId,
    taskId,
    shopJobId: task.shops[0]._id,
    eventId: "unanswered-hold",
    status: "failed",
    transportStatus: "no-answer",
  });
  expect((await s.user.query(api.users.me, {})).reservedBalance).toBe(1);
  await s.t.run((ctx) =>
    ctx.db.patch(task.shops[0]._id, { retryAt: Date.now() - 1 }),
  );
  const second = await s.t.mutation(internal.calls.prepare, {
    shopJobId: task.shops[0]._id,
  });
  await s.t.mutation(internal.calls.receive, {
    attemptId: second.attemptId,
    taskId,
    shopJobId: task.shops[0]._id,
    eventId: "personal-release",
    status: "completed",
    answer: { stock: "unconfirmed", personalCallNeeded: true },
  });
  const account = await s.user.query(api.users.me, {});
  expect(account.creditBalance).toBe(5);
  expect(account.reservedBalance).toBe(0);
  await expect(
    s.t.mutation(internal.credits.refund, {
      shopJobId: task.shops[0]._id,
      reason: "Bad refund",
    }),
  ).rejects.toThrow("charged");
});
it("does not charge a provider transport failure mislabeled as a completed callback", async () => {
  const s = await setup("100");
  const { taskId } = await s.user.mutation(api.tasks.start, {
    draftId: s.draftId,
    selectedPlaceIds: ["p1"],
    idempotencyKey: "provider-failed",
    expectedAnswerPriceCents: 100,
  });
  const task = await s.user.query(api.tasks.get, { taskId }),
    job = task.shops[0];
  const a = await s.t.mutation(internal.calls.prepare, { shopJobId: job._id });
  await s.t.mutation(internal.calls.receive, {
    taskId,
    shopJobId: job._id,
    attemptId: a.attemptId,
    eventId: "provider-failure",
    status: "completed",
    transportStatus: "failed",
    answer: { stock: "unconfirmed", notes: "No shop conversation occurred." },
  });
  expect((await s.user.query(api.users.me, {})).creditBalance).toBe(5);
  expect(
    (await s.user.query(api.tasks.get, { taskId })).shops[0].billingState,
  ).toBe("released");
});
it("releases held credit for absent or wholly unconfirmed empty answers", async () => {
  for (const answer of [
    undefined,
    {
      stock: "unconfirmed",
      variantMatch: "unconfirmed",
      finalPrice: null,
      notes: null,
      offers: null,
    },
  ]) {
    const s = await setup("100");
    const { taskId } = await s.user.mutation(api.tasks.start, {
      draftId: s.draftId,
      selectedPlaceIds: ["p1"],
      idempotencyKey: "empty-answer",
      expectedAnswerPriceCents: 100,
    });
    const task = await s.user.query(api.tasks.get, { taskId }),
      job = task.shops[0];
    const a = await s.t.mutation(internal.calls.prepare, {
      shopJobId: job._id,
    });
    await s.t.mutation(internal.calls.receive, {
      taskId,
      shopJobId: job._id,
      attemptId: a.attemptId,
      eventId: "empty-result",
      status: "completed",
      ...(answer ? { answer } : {}),
    });
    const account = await s.user.query(api.users.me, {});
    expect(account.creditBalance).toBe(5);
    expect(account.reservedBalance).toBe(0);
    expect(
      (await s.user.query(api.tasks.get, { taskId })).shops[0].billingState,
    ).toBe("released");
  }
});
it("can charge substantive caller notes without a recording or final price", async () => {
  const s = await setup("100");
  const { taskId } = await s.user.mutation(api.tasks.start, {
    draftId: s.draftId,
    selectedPlaceIds: ["p1"],
    idempotencyKey: "notes-only",
    expectedAnswerPriceCents: 100,
  });
  const task = await s.user.query(api.tasks.get, { taskId }),
    job = task.shops[0];
  const a = await s.t.mutation(internal.calls.prepare, { shopJobId: job._id });
  await s.t.mutation(internal.calls.receive, {
    taskId,
    shopJobId: job._id,
    attemptId: a.attemptId,
    eventId: "notes-result",
    status: "completed",
    answer: {
      stock: "unconfirmed",
      notes:
        "Shop says their product deliveries resume Friday; they cannot confirm this variant yet.",
    },
  });
  expect((await s.user.query(api.users.me, {})).creditBalance).toBe(4);
  expect(
    (await s.user.query(api.tasks.get, { taskId })).shops[0].billingState,
  ).toBe("charged");
});
