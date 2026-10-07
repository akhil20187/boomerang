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
      {code:'service_unavailable',reason:'pricing_not_configured',callingAvailable:false,message:'Shop calling is unavailable because the service price has not been set. No calls started and no credit was charged.'},
    );
  return Number(raw);
}
// Amounts are stored in paise (₹1 = 100 paise) in the existing *Cents fields.
export function formatINR(paise: number) {
  const rupees = paise / 100;
  return "₹" + rupees.toLocaleString("en-IN", {minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2, maximumFractionDigits: 2});
}
export function callingQuote() {
  let answerPriceCents: number | null = null;
  try { answerPriceCents = configuredPrice(); } catch {}
  const reason = answerPriceCents === null ? 'pricing_not_configured' :
    process.env.LIVE_CALLS_ENABLED !== 'true' ? 'calling_disabled' :
    !process.env.CALL_BRIDGE_URL || !process.env.CALL_BRIDGE_SECRET ? 'calling_not_ready' : null;
  const message = reason === 'pricing_not_configured' ? 'Shop calling is unavailable because the service price has not been set.' :
    reason ? 'Shop calling is currently unavailable. You can still discover shops.' : null;
  return {answerPriceCents, currency: 'INR' as const, answerPriceLabel: answerPriceCents === null ? null : formatINR(answerPriceCents), callingAvailable: reason === null, callingUnavailableReason: reason, callingUnavailableMessage: message};
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
  const available = account.balanceCents - account.reservedCents;
  if (!Number.isSafeInteger(total) || available < total) {
    const affordable = Math.max(0, Math.floor(available / price));
    throw new ConvexError(
      `You have ${formatINR(Math.max(0, available))}, enough for ${affordable} ${affordable === 1 ? "shop" : "shops"}. Pick fewer shops.`,
    );
  }
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
      currency: "INR",
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
  if (task?.verification || task?.selfTest) return;
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
    currency: "INR",
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
      currency: "INR",
      type: "refund",
      reason: args.reason,
      operationId: `refund:${r.shopJobId}`,
    });
    return null;
  },
});
// One-off move from dollar cents to paise (D135: ₹100 per $1). A user converts
// in one transaction; rows already in INR are never touched again.
export async function convertUserToRupees(ctx: MutationCtx, userId: Id<"users">) {
  const entries = await ctx.db.query("creditEntries").withIndex("by_user", q => q.eq("userId", userId)).take(10001);
  if (entries.length > 10000) return "mismatched" as const;
  const old = entries.filter(e => e.currency === "USD");
  if (!old.length) return "skipped" as const;
  const account = await ctx.db.query("creditAccounts").withIndex("by_user", q => q.eq("userId", userId)).unique();
  const historyCents = entries
    .filter(e => !["reservation", "release"].includes(e.type))
    .reduce((sum, e) => sum + (e.amountCents ?? Math.round(e.amount * 100)), 0);
  if (old.length !== entries.length || (account && account.balanceCents !== historyCents)) return "mismatched" as const;
  for (const e of entries)
    await ctx.db.patch(e._id, {
      amount: e.amount * 100,
      ...(e.amountCents === undefined ? {} : { amountCents: e.amountCents * 100 }),
      currency: "INR",
    });
  if (account)
    await ctx.db.patch(account._id, { balanceCents: account.balanceCents * 100, reservedCents: account.reservedCents * 100 });
  const reservations = await ctx.db.query("creditReservations").withIndex("by_user", q => q.eq("userId", userId)).collect();
  for (const r of reservations) await ctx.db.patch(r._id, { amountCents: r.amountCents * 100 });
  return "converted" as const;
}
