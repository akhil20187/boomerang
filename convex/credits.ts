import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
export function configuredPrice() {
  const raw = process.env.ANSWER_PRICE_CENTS;
  if (
    !raw ||
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(Number(raw)) ||
    Number(raw) <= 0
  )
    throw new ConvexError(
      "Calling price is not configured yet. Your account has not been charged.",
    );
  return Number(raw);
}
export async function balances(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const account = await ctx.db
    .query("creditAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (account)
    return {
      balanceCents: account.balanceCents,
      reservedCents: account.reservedCents,
      availableCents: account.balanceCents - account.reservedCents,
    };
  const entries = await ctx.db
    .query("creditEntries")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(10001);
  if (entries.length > 10000)
    throw new ConvexError(
      "Your credit history needs reconciliation before calls can start.",
    );
  const balanceCents = entries
    .filter((e) => !["reservation", "release"].includes(e.type))
    .reduce((sum, e) => sum + (e.amountCents ?? Math.round(e.amount * 100)), 0);
  return { balanceCents, reservedCents: 0, availableCents: balanceCents };
}
async function accountForWrite(ctx: MutationCtx, userId: Id<"users">) {
  let account = await ctx.db
    .query("creditAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!account) {
    const balance = await balances(ctx, userId);
    const id = await ctx.db.insert("creditAccounts", {
      userId,
      balanceCents: balance.balanceCents,
      reservedCents: 0,
    });
    account = (await ctx.db.get(id))!;
  }
  return account;
}
export async function reserve(
  ctx: MutationCtx,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  shopJobIds: Id<"shopJobs">[],
  price: number,
) {
  const account = await accountForWrite(ctx, userId);
  const total = price * shopJobIds.length;
  if (
    !Number.isSafeInteger(total) ||
    account.balanceCents - account.reservedCents < total
  )
    throw new ConvexError(
      "Your available credit cannot cover these shops. Add credit or pick fewer shops.",
    );
  await ctx.db.patch(account._id, {
    reservedCents: account.reservedCents + total,
  });
  for (const shopJobId of shopJobIds) {
    await ctx.db.insert("creditReservations", {
      userId,
      taskId,
      shopJobId,
      amountCents: price,
      state: "reserved",
    });
    await ctx.db.insert("creditEntries", {
      userId,
      taskId,
      shopJobId,
      amount: 0,
      amountCents: price,
      currency: "USD",
      type: "reservation",
      reason: "Credit held for one final shop answer",
      operationId: `reserve:${shopJobId}`,
    });
    await ctx.db.patch(shopJobId, { billingState: "reserved" });
  }
}
export async function settle(
  ctx: MutationCtx,
  shopJobId: Id<"shopJobs">,
  chargeable: boolean,
) {
  const job = await ctx.db.get(shopJobId);
  if (!job) return;
  const task = await ctx.db.get(job.taskId);
  if (task?.verification) return;
  const reservation = await ctx.db
    .query("creditReservations")
    .withIndex("by_shop", (q) => q.eq("shopJobId", shopJobId))
    .unique();
  if (!reservation || reservation.state !== "reserved") return;
  const account = await accountForWrite(ctx, reservation.userId);
  const price = reservation.amountCents;
  if (
    account.reservedCents < price ||
    (chargeable && account.balanceCents < price)
  )
    throw new Error("Credit account needs reconciliation");
  const state = chargeable ? "charged" : "released";
  await ctx.db.patch(account._id, {
    reservedCents: account.reservedCents - price,
    balanceCents: account.balanceCents - (chargeable ? price : 0),
  });
  await ctx.db.patch(reservation._id, { state });
  await ctx.db.patch(shopJobId, { billingState: state });
  await ctx.db.insert("creditEntries", {
    userId: reservation.userId,
    taskId: reservation.taskId,
    shopJobId,
    amount: chargeable ? -price / 100 : 0,
    amountCents: chargeable ? -price : price,
    currency: "USD",
    type: chargeable ? "charge" : "release",
    reason: chargeable
      ? "Final caller answer supplied; notes-only evidence is accepted"
      : "No chargeable final answer; held credit released",
    operationId: `settle:${shopJobId}`,
  });
}
export async function addGrantToAccount(
  ctx: MutationCtx,
  userId: Id<"users">,
  amountCents: number,
) {
  const account = await ctx.db
    .query("creditAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (account)
    await ctx.db.patch(account._id, {
      balanceCents: account.balanceCents + amountCents,
    });
}
export const refund = internalMutation({
  args: { shopJobId: v.id("shopJobs"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.reason.trim())
      throw new Error("An approved refund reason is required.");
    const r = await ctx.db
      .query("creditReservations")
      .withIndex("by_shop", (q) => q.eq("shopJobId", args.shopJobId))
      .unique();
    if (r?.state === "refunded") return null;
    if (!r || r.state !== "charged")
      throw new Error(
        "Only a charged shop answer is eligible for an approved refund.",
      );
    const account = await accountForWrite(ctx, r.userId);
    await ctx.db.patch(account._id, {
      balanceCents: account.balanceCents + r.amountCents,
    });
    await ctx.db.patch(r._id, { state: "refunded" });
    await ctx.db.patch(args.shopJobId, { billingState: "refunded" });
    await ctx.db.insert("creditEntries", {
      userId: r.userId,
      taskId: r.taskId,
      shopJobId: r.shopJobId,
      amount: r.amountCents / 100,
      amountCents: r.amountCents,
      currency: "USD",
      type: "refund",
      reason: args.reason,
      operationId: `refund:${r.shopJobId}`,
    });
    return null;
  },
});
