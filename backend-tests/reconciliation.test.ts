import { describe, it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob([
  "../convex/**/*.{ts,js}",
  "!../convex/**/*.d.ts",
]);
function setup() {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  return t;
}
async function seed(t: ReturnType<typeof setup>) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "one@example.com",
      name: "Test Customer",
      eligible: true,
    });
    const otherId = await ctx.db.insert("users", {
      email: "two@example.com",
      eligible: true,
    });
    await ctx.db.insert("creditEntries", {
      userId,
      amount: 5,
      currency: "USD",
      type: "grant",
      reason: "test",
      operationId: "seed",
    });
    const shop = {
      placeId: "p1",
      name: "Shop",
      address: "Road",
      phone: "+919999999999",
      rating: 4.6,
      ratingCount: 200,
      distanceKm: 1,
      mapsUrl: "https://maps.google.com",
      fewRatings: false,
    };
    const draftId = await ctx.db.insert("drafts", {
      userId,
      productInput: "phone blue",
      product: { name: "phone blue" },
      pincode: "500037",
      cards: [],
      comments: "",
      radiusKm: 10,
      shops: [shop],
      expiresAt: Date.now() + 60000,
    });
    const taskId = await ctx.db.insert("tasks", {
      userId,
      draftId,
      title: "phone blue",
      type: "shop_calls",
      detailsVersion: 1,
      product: { name: "phone blue" },
      pincode: "500037",
      cards: [],
      comments: "",
      status: "running",
      approvedAt: Date.now(),
      idempotencyKey: "seed-task",
    });
    const shopJobId = await ctx.db.insert("shopJobs", {
      taskId,
      shop,
      state: "calling",
      attemptCount: 1,
      executor: "AI",
      billingState: "not_assessed",
    });
    const attemptId = await ctx.db.insert("callAttempts", {
      taskId,
      shopJobId,
      number: 1,
      executor: "AI",
      status: "calling",
      startedAt: Date.now(),
      dispatchState: "accepted",
    });
    await ctx.db.patch(shopJobId, { latestAttemptId: attemptId });
    return { userId, otherId, draftId, taskId, shopJobId, attemptId };
  });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('bounded call reconciliation', () => {
  async function fixture() {
    vi.useFakeTimers();
    const t = setup(), s = await seed(t);
    vi.stubEnv('CALL_BRIDGE_URL', 'https://bridge.example.com');
    vi.stubEnv('CALL_BRIDGE_SECRET', 'test');
    const request = vi.fn(async () => { throw new Error('bridge unavailable'); });
    vi.stubGlobal('fetch', request);
    return {t, s, request};
  }
  it('bounds bridge failures, coalesces stale jobs and preserves a late paid outcome exactly once', async () => {
    const {t, s, request} = await fixture();
    await t.run(async ctx => {
      await ctx.db.insert('creditAccounts', {userId:s.userId,balanceCents:1000,reservedCents:100});
      await ctx.db.insert('creditReservations', {userId:s.userId,taskId:s.taskId,shopJobId:s.shopJobId,amountCents:100,state:'reserved'});
      await ctx.db.patch(s.shopJobId, {billingState:'reserved'});
    });
    for (let i=0;i<12;i++) {
      await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
      await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
      vi.setSystemTime(Date.now()+5*60000);
    }
    expect(request).toHaveBeenCalledTimes(12);
    const a = await t.run(ctx=>ctx.db.get(s.attemptId));
    expect(a?.manualReconciliationAt).toBeTypeOf('number');
    expect(a?.endedAt).toBeUndefined();
    expect(a?.reconciliationChecks).toBe(12);
    expect(await t.run(ctx=>ctx.db.get(s.shopJobId))).toMatchObject({state:'reconciling',billingState:'reserved',attemptCount:1});
    expect(await t.mutation(internal.calls.prepare,{shopJobId:s.shopJobId})).toBeNull();
    expect((await t.withIdentity({subject:s.userId}).query(api.tasks.get,{taskId:s.taskId})).shops[0].manualReconciliationRequired).toBe(true);
    await t.mutation(internal.calls.receive,{attemptId:s.attemptId,taskId:s.taskId,shopJobId:s.shopJobId,eventId:'unknown-again',status:'reconciliation_required'});
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect(request).toHaveBeenCalledTimes(12);
    const callback = {attemptId:s.attemptId,taskId:s.taskId,shopJobId:s.shopJobId,eventId:'late-completion',status:'completed',answer:{stock:'available',notes:'Confirmed',currency:'INR'}};
    await t.mutation(internal.calls.receive,callback);
    await t.mutation(internal.calls.receive,callback);
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect(await t.run(ctx=>ctx.db.get(s.shopJobId))).toMatchObject({state:'answered',billingState:'charged',attemptCount:1});
    expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.manualReconciliationAt).toBeUndefined();
    expect((await t.withIdentity({subject:s.userId}).query(api.tasks.get,{taskId:s.taskId})).shops[0].manualReconciliationRequired).toBe(false);
    const entries = await t.run(ctx=>ctx.db.query('creditEntries').collect());
    expect(entries.filter(e=>e.type==='charge')).toHaveLength(1);
    expect((await t.run(ctx=>ctx.db.query('taskEvents').collect())).filter(e=>e.type==='manual_reconciliation_required')).toHaveLength(1);
  });
  it('stops legacy attempts at one hour without a bridge request or false failure', async () => {
    const {t,s,request}=await fixture();
    vi.setSystemTime(Date.now()+60*60000);
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect(request).not.toHaveBeenCalled();
    expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.reconciliationNextAt).toBeUndefined();
    expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.endedAt).toBeUndefined();
    expect((await t.run(ctx=>ctx.db.get(s.taskId)))?.status).toBe('running');
  });
  it.each(['missing','ended','rejected','stale','terminal'] as const)('ignores %s attempts before bridge I/O', async kind => {
    const {t,s,request}=await fixture();
    await t.run(async ctx=>{
      if(kind==='missing')await ctx.db.delete(s.attemptId);
      if(kind==='ended')await ctx.db.patch(s.attemptId,{endedAt:Date.now()});
      if(kind==='rejected')await ctx.db.patch(s.attemptId,{dispatchState:'rejected'});
      if(kind==='stale')await ctx.db.patch(s.shopJobId,{latestAttemptId:undefined});
      if(kind==='terminal')await ctx.db.patch(s.shopJobId,{state:'answered'});
    });
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect(request).not.toHaveBeenCalled();
  });
  it('coalesces repeated callbacks and dispatch results into one scheduled check', async () => {
    const {t,s,request}=await fixture();
    for(let i=0;i<3;i++)await t.mutation(internal.calls.dispatchResult,{attemptId:s.attemptId,state:'uncertain',reason:'unknown'});
    for(let i=0;i<3;i++)await t.mutation(internal.calls.receive,{attemptId:s.attemptId,taskId:s.taskId,shopJobId:s.shopJobId,eventId:`unknown-${i}`,status:'reconciliation_required'});
    expect(await t.run(ctx=>ctx.db.system.query('_scheduled_functions').collect())).toHaveLength(1);
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect(request).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now()+60000);
    await Promise.all([t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId}),t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId})]);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not overwrite a terminal callback arriving during bridge I/O', async () => {
    const {t,s}=await fixture();
    vi.stubGlobal('fetch',vi.fn(async()=>{
      await t.mutation(internal.calls.receive,{attemptId:s.attemptId,taskId:s.taskId,shopJobId:s.shopJobId,eventId:'during-check',status:'completed',answer:{stock:'available',currency:'INR'}});
      return new Response('',{status:500});
    }));
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect((await t.run(ctx=>ctx.db.get(s.shopJobId)))?.state).toBe('answered');
    expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.reconciliationNextAt).toBeUndefined();
  });
  it.each([404,500])('retains unknown outcomes on bridge HTTP %s', async status => {
    const {t,s,request}=await fixture();
    request.mockImplementation(async()=>new Response('',{status}) as never);
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.endedAt).toBeUndefined();
    expect((await t.run(ctx=>ctx.db.get(s.shopJobId)))?.state).toBe('reconciling');
  });
});
