import type { Id } from "./_generated/dataModel";
import { notChargedReason } from "./domain";
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireUser, requireEligible } from "./access";
import { validateSelection } from "./domain";
import { workflow } from "./workflows";
import { configuredPrice, reserve, balances, formatINR } from "./credits";
import { paginationOptsValidator } from "convex/server";
import { terminalStates } from "./validators";
export const start = mutation({
  args: {
    draftId: v.id("drafts"),
    selectedPlaceIds: v.array(v.string()),
    idempotencyKey: v.string(),
    accessToken: v.optional(v.string()),
    expectedAnswerPriceCents: v.optional(v.number()),
    briefId: v.optional(v.id("briefs")),
  },
  returns: v.object({ taskId: v.id("tasks") }),
  handler: async (ctx, args): Promise<{ taskId: any }> => {
    const userId = await requireUser(ctx, args.accessToken, "calls:write");
    if (args.idempotencyKey.length < 8 || args.idempotencyKey.length > 200)
      throw new ConvexError("A valid request identifier is required.");
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_user_operation", (q) =>
        q.eq("userId", userId).eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (existing.draftId !== args.draftId)
        throw new ConvexError(
          "This request identifier belongs to another search.",
        );
      const jobs = await ctx.db
        .query("shopJobs")
        .withIndex("by_task", (q) => q.eq("taskId", existing._id))
        .take(21);
      if (
        jobs
          .map((j) => j.shop.placeId)
          .sort()
          .join(",") !== [...args.selectedPlaceIds].sort().join(",")
      )
        throw new ConvexError(
          "This request identifier belongs to a different shop selection.",
        );
      return { taskId: existing._id };
    }
    const draft = await ctx.db.get(args.draftId);
    if (!draft || draft.userId !== userId)
      throw new ConvexError("Search not found.");
    if (draft.expiresAt < Date.now())
      throw new ConvexError("This search has expired. Find shops again.");
    if (draft.shops.some(shop => shop.placeId === 'personal-test'))
      throw new ConvexError('Use the personal test-call form for this request.');
    validateSelection(
      args.selectedPlaceIds,
      draft.shops.map((s) => s.placeId),
    );
    const answerPriceCents = configuredPrice();
    if (args.expectedAnswerPriceCents !== answerPriceCents)
      throw new ConvexError(
        `The price changed to ${formatINR(answerPriceCents)} per answer. Check and press Call again. No calls started and no credit was charged.`,
      );
    let brief: Doc<"briefs"> | null = null;
    if (args.briefId) {
      brief = await ctx.db.get(args.briefId);
      if (!brief || brief.userId !== userId) throw new ConvexError("Brief not found.");
      if (brief.expiresAt < Date.now()) throw new ConvexError("This brief has expired. Start again.");
      if (brief.status !== "ready" || !brief.brief) throw new ConvexError("Finish the brief first.");
    }
    const customer = await requireEligible(ctx, userId);
    if (!(customer as any).name?.trim())
      throw new ConvexError(
        "Add your name to your account before we call shops on your behalf.",
      );
    if (
      process.env.LIVE_CALLS_ENABLED !== "true" ||
      !process.env.CALL_BRIDGE_URL ||
      !process.env.CALL_BRIDGE_SECRET
    )
      throw new ConvexError(
        "Live calling is not enabled yet. Your account has not been charged.",
      );
    const selected = draft.shops.filter((s) =>
      args.selectedPlaceIds.includes(s.placeId),
    );
    if (selected.some((s) => !s.phone))
      throw new ConvexError(
        "A selected shop has no listed phone number. Pick shops with a phone number.",
      );
    const taskId = await ctx.db.insert("tasks", {
      userId,
      draftId: draft._id,
      title: brief?.summary?.trim() || draft.product.name,
      type: "shop_calls",
      ...(brief ? { briefId: brief._id, brief: brief.brief } : {}),
      detailsVersion: 1,
      product: draft.product,
      pincode: draft.pincode,
      cards: draft.cards,
      comments: draft.comments,
      status: "queued",
      approvedAt: Date.now(),
      idempotencyKey: args.idempotencyKey,
      answerPriceCents,
      currency: "INR",
    });
    const shopJobIds = [];
    for (const shop of selected)
      shopJobIds.push(
        await ctx.db.insert("shopJobs", {
          taskId,
          shop,
          state: "waiting",
          attemptCount: 0,
          executor: "AI",
          billingState: "not_assessed",
        }),
      );
    await reserve(ctx, userId, taskId, shopJobIds, answerPriceCents);
    await ctx.db.insert("taskEvents", {
      taskId,
      eventId: `${taskId}:approved`,
      type: "approved",
      text: `${selected.length} shops picked`,
      timestamp: Date.now(),
    });
    const workflowId = await workflow.start(ctx, internal.workflows.runTask, {
      taskId,
    });
    await ctx.db.patch(taskId, { workflowId: String(workflowId) });
    return { taskId };
  },
});
export const get = query({
  args: { taskId: v.id("tasks"), accessToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken),
      task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId)
      throw new ConvexError("Task not found.");
    const jobs = await ctx.db
      .query("shopJobs")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .take(21);
    const events = await ctx.db
      .query("taskEvents")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .take(300);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_task_type", (q) => q.eq("taskId", task._id))
      .take(2);
    const reservations=await ctx.db.query('creditReservations').withIndex('by_task',q=>q.eq('taskId',task._id)).take(21);
    const shops = await Promise.all(
      jobs.map(async (j) => {
        const attempt = j.latestAttemptId
          ? await ctx.db.get(j.latestAttemptId)
          : null;
        const savedAttempts=await ctx.db.query('callAttempts').withIndex('by_job',q=>q.eq('shopJobId',j._id)).order('asc').take(10);
        const attempts=await Promise.all(savedAttempts.map(async a=>{
          const transcript=await ctx.db.query('transcriptSegments').withIndex('by_attempt_sequence',q=>q.eq('attemptId',a._id)).take(501);
          return {_id:a._id,number:a.number,status:a.status,state:a.status,executor:a.executor,startedAt:a.startedAt,answeredAt:a.answeredAt,endedAt:a.endedAt,durationSeconds:a.durationSeconds,answer:a.answer,failureReason:a.endReason,recordingAvailable:!!a.recordingId,recordingStatus:a.recordingId?'ready':a.recordingStatus==='processing'||!!a.answeredAt&&(!a.endedAt||Date.now()-a.endedAt<120000)?'processing':'unavailable',transcript:transcript.slice(0,500),transcriptTruncated:transcript.length>500};
        }));
        return {
          ...j,
          ...j.shop,
          timeline: events
            .filter((e) => e.shopJobId === j._id)
            .map((e) => ({ text: e.text, time: e.timestamp })),
          durationSeconds: attempt?.durationSeconds,
          recordingUrl: null,
          recordingAvailable: !!attempt?.recordingId,
          calledAt: attempt?.startedAt,
          recordingStatus:attempts.find(a=>a._id===j.latestAttemptId)?.recordingStatus??'unavailable',
          chargedCents:reservations.filter(r=>r.shopJobId===j._id&&r.state==='charged').reduce((n,r)=>n+r.amountCents,0),
          chargeNote:chargeNote(task,j.state,reservations.find(r=>r.shopJobId===j._id)),
          attempts,
        };
      }),
    );
    return {
      task:{...task,currency:task.currency??'USD',...billingTotals(reservations)},
      credit: await balances(ctx, userId),
      product: task.product,
      shops,
      events,
      pincode: task.pincode,
      emailSent: notifications.some((n) => n.status === "sent"),
      statusUrl: `${process.env.SITE_URL ?? "http://localhost:5173"}/status?task=${task._id}`,
    };
  },
});
export const list = query({
  args: { accessToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken);
    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});
export const history=query({
  args:{paginationOpts:paginationOptsValidator,accessToken:v.optional(v.string())},
  returns:v.any(),
  handler:async(ctx,args)=>{
    const userId=await requireUser(ctx,args.accessToken);
    const result=await ctx.db.query('tasks').withIndex('by_user',q=>q.eq('userId',userId)).order('desc').paginate(args.paginationOpts);
    const page=await Promise.all(result.page.map(async task=>{
      const jobs=await ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',task._id)).take(21);
      const reservations=await ctx.db.query('creditReservations').withIndex('by_task',q=>q.eq('taskId',task._id)).take(21);
      return {...task,summary:{shopCount:jobs.length,resolvedCount:jobs.filter(j=>terminalStates.has(j.state)).length,availableCount:jobs.filter(j=>j.answer?.stock==='available').length,unreachableCount:jobs.filter(j=>j.state==='unreachable').length,unconfirmedCount:jobs.filter(j=>j.state==='incomplete_answer'||j.answer?.stock==='unconfirmed').length,...billingTotals(reservations),notChargedCount:reservations.filter(r=>r.state==='released').length,currency:'INR',active:task.status==='queued'||task.status==='running'}};
    }));
    return {...result,page};
  }
});
export const context = internalQuery({
  args: { taskId: v.id("tasks") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const user = await ctx.db.get(task.userId);
    return {
      task,
      user,
      jobs: await ctx.db
        .query("shopJobs")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .take(21),
    };
  },
});
export const markRunning = internalMutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "running",
      startedAt: Date.now(),
    });
    return null;
  },
});

type Reservation={shopJobId:Id<'shopJobs'>;amountCents:number;state:'reserved'|'charged'|'released'|'refunded'};
const sumCents=(rows:Reservation[],state?:Reservation['state'])=>rows.filter(r=>!state||r.state===state).reduce((n,r)=>n+r.amountCents,0);
function billingTotals(rows:Reservation[]){return {chargedCents:sumCents(rows,'charged'),heldCents:sumCents(rows,'reserved'),releasedCents:sumCents(rows,'released'),refundedCents:sumCents(rows,'refunded'),maxCents:sumCents(rows)}}
function chargeNote(task:{selfTest?:boolean;verification?:boolean},state:string,r?:Reservation){
  if(task.selfTest||task.verification)return {kind:'free',amountCents:0};
  if(!r)return null;
  if(r.state==='released')return {kind:'not_charged',amountCents:r.amountCents,reason:notChargedReason(state)};
  return {kind:r.state==='reserved'?'held':r.state,amountCents:r.amountCents};
}
