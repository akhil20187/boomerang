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
describe("saved backend behaviour", () => {
  it('paginates only the signed-in customers tasks with settled charges and outcomes',async()=>{
    const t=setup(),s=await seed(t);await t.run(async ctx=>{await ctx.db.patch(s.taskId,{status:'finished'});await ctx.db.patch(s.shopJobId,{state:'answered',answer:{stock:'available',variantMatch:'yes',finalPrice:1200,currency:'INR'}});await ctx.db.insert('creditReservations',{userId:s.userId,taskId:s.taskId,shopJobId:s.shopJobId,amountCents:10,state:'charged'});await ctx.db.insert('tasks',{userId:s.otherId,draftId:s.draftId,title:'Private other task',type:'shop_calls',detailsVersion:1,product:{name:'Private'},pincode:'500037',cards:[],comments:'',status:'running',approvedAt:Date.now(),idempotencyKey:'other'});});
    const page=await t.withIdentity({subject:s.userId}).query(api.tasks.history,{paginationOpts:{numItems:1,cursor:null}});expect(page.page).toHaveLength(1);expect(page.page[0]._id).toBe(s.taskId);expect(page.page[0].summary).toMatchObject({shopCount:1,resolvedCount:1,availableCount:1,chargedCents:10,active:false});expect(page.isDone).toBe(true);
    await expect(t.withIdentity({subject:s.otherId}).query(api.tasks.get,{taskId:s.taskId})).rejects.toThrow('Task not found');
  });
  it('returns ordered per-attempt private transcripts without exposing recording URLs',async()=>{
    const t=setup(),s=await seed(t);await t.run(async ctx=>{await ctx.db.insert('transcriptSegments',{attemptId:s.attemptId,sequence:1,speaker:'caller',text:'It costs 1200.',timestamp:Date.now()});await ctx.db.insert('transcriptSegments',{attemptId:s.attemptId,sequence:0,speaker:'agent',text:'Is it available?',timestamp:Date.now()});});const result=await t.withIdentity({subject:s.userId}).query(api.tasks.get,{taskId:s.taskId});expect(result.shops[0].attempts).toHaveLength(1);expect(result.shops[0].attempts[0].transcript.map(x=>x.text)).toEqual(['Is it available?','It costs 1200.']);expect(result.shops[0].attempts[0].recordingAvailable).toBe(false);expect(result.shops[0].attempts[0].recordingUrl).toBeUndefined();
  });
  it('retries a temporary private recording download failure without losing evidence',async()=>{
    vi.useFakeTimers();const t=setup(),s=await seed(t);vi.stubEnv('RECORDING_ALLOWED_HOSTS','media.vobiz.ai');vi.stubEnv('CALL_BRIDGE_URL','https://bridge.example.com');vi.stubEnv('CALL_BRIDGE_SECRET','bridge-secret');let count=0;vi.stubGlobal('fetch',vi.fn(async()=>++count===1?new Response('starting',{status:503}):new Response('audio',{headers:{'content-type':'audio/mpeg'}})));
    await t.action(internal.recordings.ingest,{attemptId:s.attemptId,taskId:s.taskId,shopJobId:s.shopJobId,eventId:'retry-recording',url:'https://media.vobiz.ai/v1/Account/a/Recording/rec.mp3'});
    await t.finishAllScheduledFunctions(()=>vi.runAllTimers());expect(count).toBe(2);expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.recordingStatus).toBe('ready');
  });
  it('downloads authenticated Vobiz media through the private bridge without provider keys in Convex',async()=>{
    const t=setup(),s=await seed(t);vi.stubEnv('RECORDING_ALLOWED_HOSTS','media.vobiz.ai');vi.stubEnv('CALL_BRIDGE_URL','https://bridge.example.com');vi.stubEnv('CALL_BRIDGE_SECRET','bridge-secret');
    const request=vi.fn(async(url,options)=>{expect(String(url)).toBe(`https://bridge.example.com/attempts/${s.attemptId}/recording`);expect(options.headers.Authorization).toBe('Bearer bridge-secret');expect(options.redirect).toBe('error');return new Response('private audio',{headers:{'content-type':'audio/mpeg'}});});vi.stubGlobal('fetch',request);
    await t.action(internal.recordings.ingest,{attemptId:s.attemptId,taskId:s.taskId,shopJobId:s.shopJobId,eventId:'vobiz-recording',url:'https://media.vobiz.ai/v1/Account/a/Recording/rec.mp3'});expect(request).toHaveBeenCalledTimes(1);expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.recordingStatus).toBe('ready');
  });
  it('reconciles the bridge journal response through authenticated read-only lookup without dispatching again',async()=>{
    const t=setup(),s=await seed(t);
    vi.stubEnv('CALL_BRIDGE_URL','https://bridge.example.com/');vi.stubEnv('CALL_BRIDGE_SECRET','test-secret');
    const request=vi.fn(async(url,options)=>{
      expect(String(url)).toBe(`https://bridge.example.com/attempts/${s.attemptId}`);
      expect(options.headers.Authorization).toBe('Bearer test-secret');
      expect(options.method).toBeUndefined();
      return Response.json({attemptId:s.attemptId,status:'completed',result:{providerCallId:'provider-call',transportStatus:'completed',transcript:[{speaker:'caller',text:'Yes, we have the exact printer.'}],answer:{stock:'available',variantMatch:'confirmed',finalPrice:null,currency:'INR',offers:null,notes:'Exact printer confirmed.',personalCallNeeded:false,evidenceQuotes:['Yes, we have the exact printer.']}},reconciliation:{source:'provider_cdr',checkedAt:Date.now()}});
    });
    vi.stubGlobal('fetch',request);
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    await t.action(internal.calls.checkAbandoned,{attemptId:s.attemptId});
    expect(request).toHaveBeenCalledTimes(1);
    const job=await t.run(ctx=>ctx.db.get(s.shopJobId));
    expect(job?.state).toBe('answered');expect(job?.answer?.stock).toBe('available');expect(job?.attemptCount).toBe(1);
  });
  it('downloads recording evidence only from an explicitly allowed HTTPS provider host',async()=>{
    const t=setup(),s=await seed(t);vi.stubEnv('RECORDING_ALLOWED_HOSTS','recordings.example.com');
    const request=vi.fn(async(_url:any,_options:any)=>new Response(new Blob(['synthetic audio'],{type:'audio/mpeg'})));vi.stubGlobal('fetch',request);
    const ids={attemptId:s.attemptId,taskId:s.taskId,shopJobId:s.shopJobId,eventId:'provider-recording'};
    for(const url of ['http://recordings.example.com/call.mp3','https://recordings.example.com.attacker.test/call.mp3','https://user:password@recordings.example.com/call.mp3'])
      await expect(t.action(internal.recordings.ingest,{...ids,url})).rejects.toThrow('Recording host is not approved');
    expect(request).not.toHaveBeenCalled();
    await t.action(internal.recordings.ingest,{...ids,url:'https://recordings.example.com/call.mp3'});
    await t.action(internal.recordings.ingest,{...ids,url:'https://recordings.example.com/call.mp3'});
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].redirect).toBe('error');
    expect((await t.run(ctx=>ctx.db.get(s.attemptId)))?.recordingStatus).toBe('ready');
  });
  it("uses international shop numbers and excludes listings outside the exact radius", async () => {
    const t = setup(),
      s = await seed(t);
    vi.stubEnv("GOOGLEPLACES_API_KEY", "test-key");
    vi.stubEnv("OPENAI_API_KEY", "");
    const calls: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, options) => {
        calls.push({ url, options });
        if (String(url).includes("geocode"))
          return Response.json({
            status: "OK",
            results: [{ geometry: { location: { lat: 17, lng: 78 } } }],
          });
        return Response.json({
          places: [
            {
              id: "inside",
              displayName: { text: "Shop" },
              formattedAddress: "Road",
              location: { latitude: 17.01, longitude: 78 },
              internationalPhoneNumber: "+91 40 1234 5678",
              rating: 4.5,
              userRatingCount: 100,
              businessStatus: "OPERATIONAL",
            },
            {
              id: "outside",
              displayName: { text: "Too far" },
              location: { latitude: 17.0902, longitude: 78 },
              rating: 5,
              userRatingCount: 1000,
            },
          ],
        });
      }),
    );
    const result = await t
      .withIdentity({ subject: `${s.userId}|session` })
      .action(api.discovery.search, {
        productInput: "blue phone",
        pincode: "500037",
      });
    expect(result.shops.map((x: any) => x.placeId)).toEqual(["inside"]);
    expect(result.shops[0].phone).toBe("+914012345678");
    expect(calls[1].options.headers["X-Goog-FieldMask"]).toContain(
      "places.internationalPhoneNumber",
    );
    expect(
      (await t.run((ctx) => ctx.db.get(result.draftId))).product.name,
    ).toBe("blue phone");
  });
  it("leases notification attempts and retries a failed send with the same payload", async () => {
    const t = setup(),
      s = await seed(t);
    vi.stubEnv("RESEND_FROM_EMAIL", "hello@example.com");
    const first = await t.mutation(internal.notifications.claim, {
      taskId: s.taskId,
      type: "started",
    });
    expect(first.payload.to).toBe("one@example.com");
    expect(
      await t.mutation(internal.notifications.claim, {
        taskId: s.taskId,
        type: "started",
      }),
    ).toBeNull();
    await t.mutation(internal.notifications.result, {
      notificationId: first.notificationId,
      status: "error",
      error: "temporary",
    });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10 * 60000);
    const second = await t.mutation(internal.notifications.claim, {
      taskId: s.taskId,
      type: "started",
    });
    expect(second.notificationId).toBe(first.notificationId);
    expect(second.payload).toEqual(first.payload);
    await t.mutation(internal.notifications.result, {
      notificationId: first.notificationId,
      status: "sent",
      providerId: "email-1",
    });
    expect(
      await t.mutation(internal.notifications.claim, {
        taskId: s.taskId,
        type: "started",
      }),
    ).toBeNull();
  });
  it("saves approval once and freezes the requested product before dispatch", async () => {
    vi.stubEnv("LIVE_CALLS_ENABLED", "true");
    vi.stubEnv("ANSWER_PRICE_CENTS", "100");
    vi.stubEnv("CALL_BRIDGE_URL", "https://test.invalid");
    vi.stubEnv("CALL_BRIDGE_SECRET", "test-only");
    const t = setup(),
      s = await seed(t),
      user = t.withIdentity({ subject: `${s.userId}|session` });
    const args = {
      draftId: s.draftId,
      selectedPlaceIds: ["p1"],
      idempotencyKey: "new-real-start",
      expectedAnswerPriceCents: 100,
    };
    const first = await user.mutation(api.tasks.start, args),
      second = await user.mutation(api.tasks.start, args);
    expect(first).toEqual(second);
    await t.run((ctx) =>
      ctx.db.patch(s.draftId, { product: { name: "changed product" } }),
    );
    const saved = await user.query(api.tasks.get, { taskId: first.taskId });
    expect(saved.product.name).toBe("phone blue");
    expect(saved.shops).toHaveLength(1);
    expect(saved.shops[0].attemptCount).toBe(0);
    const entries = await t.run((ctx) =>
      ctx.db
        .query("creditEntries")
        .withIndex("by_user", (q) => q.eq("userId", s.userId))
        .take(10),
    );
    expect(entries.filter((entry) => entry.type === "charge")).toHaveLength(0);
    expect(
      entries.filter((entry) => entry.type === "reservation"),
    ).toHaveLength(1);
  });
  it("rejects another account task and draft reads", async () => {
    const t = setup(),
      s = await seed(t);
    const other = t.withIdentity({ subject: `${s.otherId}|session` });
    await expect(
      other.query(api.tasks.get, { taskId: s.taskId }),
    ).rejects.toThrow("Task not found");
    await expect(
      other.query(api.drafts.get, { draftId: s.draftId }),
    ).rejects.toThrow("Search not found");
    expect(
      (
        await t
          .withIdentity({ subject: `${s.userId}|session` })
          .query(api.tasks.get, { taskId: s.taskId })
      ).shops,
    ).toHaveLength(1);
  });
  it("blocks signed-out and disabled live calls without saving a task", async () => {
    vi.stubEnv("ANSWER_PRICE_CENTS", "100");
    const t = setup(),
      s = await seed(t);
    await expect(
      t.mutation(api.tasks.start, {
        draftId: s.draftId,
        selectedPlaceIds: ["p1"],
        idempotencyKey: "new-request",
      }),
    ).rejects.toThrow("Sign in");
    await expect(
      t
        .withIdentity({ subject: `${s.userId}|session` })
        .mutation(api.tasks.start, {
          draftId: s.draftId,
          selectedPlaceIds: ["p1"],
          idempotencyKey: "new-request",
          expectedAnswerPriceCents: 100,
        }),
    ).rejects.toThrow("Live calling is not enabled");
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("tasks")
          .withIndex("by_user", (q) => q.eq("userId", s.userId))
          .take(10),
      ),
    ).toHaveLength(1);
  });
  it("returns same task for duplicate operation but rejects changed selection", async () => {
    const t = setup(),
      s = await seed(t),
      user = t.withIdentity({ subject: `${s.userId}|session` });
    expect(
      await user.mutation(api.tasks.start, {
        draftId: s.draftId,
        selectedPlaceIds: ["p1"],
        idempotencyKey: "seed-task",
      }),
    ).toEqual({ taskId: s.taskId });
    await expect(
      user.mutation(api.tasks.start, {
        draftId: s.draftId,
        selectedPlaceIds: [],
        idempotencyKey: "seed-task",
      }),
    ).rejects.toThrow("different shop selection");
  });
  it("stores one callback, preserves notes and completes no-stock jobs", async () => {
    const t = setup(),
      s = await seed(t);
    const callback = {
      eventId: "evt-one",
      attemptId: s.attemptId,
      taskId: s.taskId,
      shopJobId: s.shopJobId,
      status: "completed",
      transportStatus: "completed",
      answer: {
        stock: "unavailable",
        variantMatch: "unconfirmed",
        finalPrice: null,
        offers: null,
        notes: "Expected Friday",
      },
      transcript: [{ speaker: "caller", text: "Not in stock." }],
    };
    expect(await t.mutation(internal.calls.receive, callback)).toEqual({
      duplicate: false,
    });
    expect(await t.mutation(internal.calls.receive, callback)).toEqual({
      duplicate: true,
    });
    await t.mutation(internal.calls.receive, {
      ...callback,
      eventId: "late-answer",
      status: "answered",
    });
    const result = await t
      .withIdentity({ subject: `${s.userId}|session` })
      .query(api.tasks.get, { taskId: s.taskId });
    expect(result.task.status).toBe("finished");
    expect(result.shops[0].state).toBe("answered");
    expect(result.shops[0].answer.stock).toBe("unavailable");
    expect(result.shops[0].answer.finalPrice).toBeUndefined();
    expect(
      result.events.filter((x: any) => x.eventId === "evt-one"),
    ).toHaveLength(1);
  });
  it("unanswered schedules exactly one retry while answered disconnect does not", async () => {
    const t = setup(),
      s = await seed(t);
    await t.mutation(internal.calls.receive, {
      eventId: "noanswer",
      attemptId: s.attemptId,
      taskId: s.taskId,
      shopJobId: s.shopJobId,
      status: "failed",
      transportStatus: "no-answer",
    });
    const retry = await t.run((ctx) => ctx.db.get(s.shopJobId));
    expect(retry?.state).toBe("retry_scheduled");
    expect(retry?.retryAt).toBeGreaterThan(Date.now() + 290000);
    const t2 = setup(),
      s2 = await seed(t2);
    await t2.mutation(internal.calls.receive, {
      eventId: "picked",
      attemptId: s2.attemptId,
      taskId: s2.taskId,
      shopJobId: s2.shopJobId,
      status: "answered",
    });
    await t2.mutation(internal.calls.receive, {
      eventId: "hungup",
      attemptId: s2.attemptId,
      taskId: s2.taskId,
      shopJobId: s2.shopJobId,
      status: "failed",
      transportStatus: "completed",
    });
    const job = await t2.run((ctx) => ctx.db.get(s2.shopJobId));
    expect(job?.state).toBe("personal_call_needed");
    expect(job?.retryAt).toBeUndefined();
  });
  it("rejects callback cross-task identifiers and invalid prices atomically", async () => {
    const t = setup(),
      s = await seed(t);
    await expect(
      t.mutation(internal.calls.receive, {
        eventId: "bad-price",
        attemptId: s.attemptId,
        taskId: s.taskId,
        shopJobId: s.shopJobId,
        status: "completed",
        answer: { stock: "available", finalPrice: -1 },
      }),
    ).rejects.toThrow("Invalid final price");
    expect(
      (await t.run((ctx) => ctx.db.get(s.attemptId)))?.endedAt,
    ).toBeUndefined();
  });
  it("rejects unauthenticated bridge callbacks", async () => {
    const t = setup();
    vi.stubEnv("CALL_BRIDGE_SECRET", "test-secret");
    const response = await t.fetch("/api/call-event", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status).toBe(401);
  });
  it("finalizes a completed callback even when it also carries recording evidence", async () => {
    const t = setup(),
      s = await seed(t);
    vi.stubEnv("CALL_BRIDGE_SECRET", "test-secret");
    vi.stubEnv("RECORDING_ALLOWED_HOSTS", "audio.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Blob(["audio"], { type: "audio/mpeg" }), {
            status: 200,
          }),
      ),
    );
    const ids = {
      attemptId: s.attemptId,
      taskId: s.taskId,
      shopJobId: s.shopJobId,
    };
    const early = await t.fetch("/api/call-event", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...ids,
        eventId: "early-recording",
        status: "recording_ready",
        recording: {
          url: "https://audio.example.com/call.mp3",
          durationSeconds: 10,
        },
      }),
    });
    expect(early.status).toBe(200);
    const response = await t.fetch("/api/call-event", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...ids,
        eventId: "completed-with-audio",
        status: "completed",
        answer: { stock: "available" },
        recording: {
          url: "https://audio.example.com/call.mp3",
          durationSeconds: 10,
        },
      }),
    });
    expect(response.status).toBe(200);
    const result = await t.run((ctx) => ctx.db.get(s.shopJobId));
    expect(result?.state).toBe("answered");
    expect(result?.answer?.stock).toBe("available");
    vi.unstubAllGlobals();
  });
  it("accepts confirmed final facts after uncertain provider reconciliation", async () => {
    const t = setup(),
      s = await seed(t);
    const ids = {
      attemptId: s.attemptId,
      taskId: s.taskId,
      shopJobId: s.shopJobId,
    };
    await t.mutation(internal.calls.receive, {
      ...ids,
      eventId: "uncertain",
      status: "reconciliation_required",
      transportStatus: "request_unknown",
    });
    expect(
      (await t.run((ctx) => ctx.db.get(s.attemptId)))?.endedAt,
    ).toBeUndefined();
    await t.mutation(internal.calls.receive, {
      ...ids,
      eventId: "confirmed-final",
      status: "completed",
      answer: { stock: "available", finalPrice: 100 },
    });
    expect((await t.run((ctx) => ctx.db.get(s.shopJobId)))?.answer?.stock).toBe(
      "available",
    );
  });
  it("keeps recording access private and playback grants expire", async () => {
    const t = setup(),
      s = await seed(t);
    const recordingId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["audio"], { type: "audio/mpeg" })),
    );
    await t.run((ctx) =>
      ctx.db.patch(s.attemptId, { recordingId, recordingStatus: "ready" }),
    );
    const owner = t.withIdentity({ subject: `${s.userId}|session` }),
      other = t.withIdentity({ subject: `${s.otherId}|session` });
    const result = await owner.query(api.tasks.get, { taskId: s.taskId });
    expect(result.shops[0].recordingUrl).toBeNull();
    expect(result.shops[0].recordingAvailable).toBe(true);
    await expect(
      other.mutation(api.recordings.playback, { attemptId: s.attemptId }),
    ).rejects.toThrow("not found");
    vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
    const grant = await owner.mutation(api.recordings.playback, {
      attemptId: s.attemptId,
    });
    const token = new URL(grant.url).searchParams.get("token")!;
    expect(
      await t.query(internal.recordings.resolvePlayback, { token }),
    ).toBeTruthy();
    expect(
      await t.query(internal.recordings.resolvePlayback, { token: "wrong" }),
    ).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(grant.expiresAt + 1);
    expect(
      await t.query(internal.recordings.resolvePlayback, { token }),
    ).toBeNull();
  });
});
