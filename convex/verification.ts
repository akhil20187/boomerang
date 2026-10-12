import { internalAction, internalQuery } from "./_generated/server";
import { internalMutation } from "./mutationSafety";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { hashToken } from "./access";
export const create = internalMutation({
  args: { email: v.string(), label: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (
      !process.env.TEST_ACCOUNT_EMAIL ||
      email !== process.env.TEST_ACCOUNT_EMAIL.toLowerCase()
    )
      throw new Error("This verification account is not authorized.");
    const label = args.label.trim().slice(0, 100);
    if (!label) throw new Error("A verification label is required.");
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    const userId = user
      ? user._id
      : await ctx.db.insert("users", { email, name: "Verification account" });
    const operation = `verification:${label}`;
    let task = await ctx.db
      .query("tasks")
      .withIndex("by_user_operation", (q) =>
        q.eq("userId", userId).eq("idempotencyKey", operation),
      )
      .unique();
    let taskId: any, shopJobId: any, attemptId: any;
    if (task) {
      taskId = task._id;
      const job = await ctx.db
        .query("shopJobs")
        .withIndex("by_task", (q) => q.eq("taskId", taskId))
        .first();
      shopJobId = job!._id;
      attemptId = job!.latestAttemptId;
    } else {
      const product = {
          name: `[Verification] ${label}`,
          description: "Synthetic product for testing. No real shop calls.",
        },
        shop = {
          placeId: "verification-shop",
          name: "Test shop · simulated",
          address: "Synthetic test listing",
          ratingCount: 0,
          distanceKm: 0,
          mapsUrl: "https://maps.google.com",
          fewRatings: true,
        };
      const draftId = await ctx.db.insert("drafts", {
        userId,
        productInput: product.name,
        product,
        pincode: "500037",
        cards: [],
        comments: "No real dialing. Controlled verification only.",
        radiusKm: 10,
        shops: [shop],
        expiresAt: Date.now() + 86400000,
      });
      taskId = await ctx.db.insert("tasks", {
        userId,
        draftId,
        title: product.name,
        type: "shop_calls",
        detailsVersion: 1,
        verification: true,
        product,
        pincode: "500037",
        cards: [],
        comments: "No real dialing. Controlled verification only.",
        status: "running",
        approvedAt: Date.now(),
        startedAt: Date.now(),
        idempotencyKey: operation,
      });
      shopJobId = await ctx.db.insert("shopJobs", {
        taskId,
        shop,
        state: "calling",
        attemptCount: 1,
        executor: "AI",
        billingState: "released",
      });
      attemptId = await ctx.db.insert("callAttempts", {
        taskId,
        shopJobId,
        number: 1,
        executor: "AI",
        status: "verification_pending",
        startedAt: Date.now(),
        dispatchState: "accepted",
      });
      await ctx.db.patch(shopJobId, { latestAttemptId: attemptId });
      await ctx.db.insert("taskEvents", {
        taskId,
        shopJobId,
        attemptId,
        eventId: `${attemptId}:verification`,
        type: "verification",
        text: "Test task · no real shop was called",
        timestamp: Date.now(),
      });
    }
    const token = `hmcp_${crypto.randomUUID()}${crypto.randomUUID()}`,
      expiresAt = Date.now() + 3600000;
    const tokenId = await ctx.db.insert("accessTokens", {
      userId,
      name: `Verification: ${label}`,
      hash: await hashToken(token),
      expiresAt,
      scope: "shops:read",
      resource: `${process.env.CONVEX_SITE_URL}/mcp`,
    });
    return { taskId, shopJobId, attemptId, token, tokenId, expiresAt };
  },
});
export const context = internalQuery({
  args: { taskId: v.id("tasks") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task?.verification)
      throw new Error("Only marked verification tasks are allowed.");
    const user = await ctx.db.get(task.userId);
    if (
      user?.email?.toLowerCase() !==
      process.env.TEST_ACCOUNT_EMAIL?.toLowerCase()
    )
      throw new Error("Verification account is not authorized.");
    const job = await ctx.db
      .query("shopJobs")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .first();
    return { task, job };
  },
});
export const run = internalAction({
  args: { taskId: v.id("tasks") },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const { task, job } = await ctx.runQuery(
      internal.verification.context,
      args,
    );
    if (!job?.latestAttemptId) throw new Error("Verification attempt missing.");
    await ctx.runAction(internal.notifications.send, {
      taskId: task._id,
      type: "started",
    });
    const rate = 8000,
      seconds = 2,
      bytes = new Uint8Array(44 + rate * seconds * 2),
      view = new DataView(bytes.buffer);
    const str = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i++)
        bytes[offset + i] = text.charCodeAt(i);
    };
    str(0, "RIFF");
    view.setUint32(4, bytes.length - 8, true);
    str(8, "WAVE");
    str(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    str(36, "data");
    view.setUint32(40, bytes.length - 44, true);
    for (let i = 0; i < rate * seconds; i++)
      view.setInt16(
        44 + i * 2,
        Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 3000),
        true,
      );
    const recordingId = await ctx.storage.store(
      new Blob([bytes], { type: "audio/wav" }),
    );
    await ctx.runMutation(internal.recordings.attach, {
      taskId: task._id,
      shopJobId: job._id,
      attemptId: job.latestAttemptId,
      eventId: `${job.latestAttemptId}:test-audio`,
      recordingId,
      durationSeconds: seconds,
    });
    await ctx.runMutation(internal.calls.receive, {
      taskId: task._id,
      shopJobId: job._id,
      attemptId: job.latestAttemptId,
      eventId: `${job.latestAttemptId}:test-result`,
      status: "completed",
      transportStatus: "completed",
      durationSeconds: seconds,
      answer: {
        stock: "available",
        variantMatch: "confirmed",
        finalPrice: 12345,
        currency: "INR",
        offers: "Simulated offer for verification only.",
        notes:
          "Simulated verification result. No real shop was called. Recording is a synthetic test tone.",
      },
      transcript: [
        {
          speaker: "agent",
          text: "Synthetic verification transcript. No shop conversation occurred.",
        },
      ],
    });
    await ctx.runAction(internal.notifications.send, {
      taskId: task._id,
      type: "completed",
    });
    return { taskId: task._id, verification: true, noRealCalls: true };
  },
});
export const revoke = internalMutation({
  args: { tokenId: v.id("accessTokens") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const token = await ctx.db.get(args.tokenId);
    if (token && !token.name.startsWith("Verification:"))
      throw new Error("Only verification tokens may be revoked here.");
    if (token) await ctx.db.patch(token._id, { revokedAt: Date.now() });
    return null;
  },
});
