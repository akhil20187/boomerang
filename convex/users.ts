import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, hashToken } from "./access";
import { balances, configuredPrice, formatINR } from "./credits";
export const updateProfile = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx),
      name = args.name.trim();
    if (!name || name.length > 80)
      throw new Error("Enter your name using up to 80 characters.");
    await ctx.db.patch(userId, { name });
    return null;
  },
});
export const me = query({
  args: { accessToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await requireUser(ctx, args.accessToken);
    } catch {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const approved =
      process.env.APPROVED_EMAILS?.split(",").map((x) =>
        x.trim().toLowerCase(),
      ) ?? [];
    const credit = await balances(ctx, userId);
    let answerPriceCents: number | null = null;
    try {
      answerPriceCents = configuredPrice();
    } catch {}
    return {
      id: userId,
      email: user.email,
      name: user.name,
      eligible:
        !!user.eligible || approved.includes(user.email?.toLowerCase() ?? ""),
      creditBalance: credit.balanceCents / 100,
      availableBalance: credit.availableCents / 100,
      reservedBalance: credit.reservedCents / 100,
      balanceCents: credit.balanceCents,
      availableCents: credit.availableCents,
      reservedCents: credit.reservedCents,
      currency: "INR",
      answerPriceCents,
      answerPriceLabel: answerPriceCents === null ? null : formatINR(answerPriceCents),
      pricingConfigured: answerPriceCents !== null,
      callingEnabled: process.env.LIVE_CALLS_ENABLED === "true",
      emailConfigured:
        !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL,
    };
  },
});
export const createAccessToken = mutation({
  args: { name: v.string() },
  returns: v.object({ token: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const token = `hmcp_${crypto.randomUUID()}${crypto.randomUUID()}`;
    const expiresAt = Date.now() + 90 * 86400000;
    await ctx.db.insert("accessTokens", {
      userId,
      name: args.name.slice(0, 80),
      hash: await hashToken(token),
      expiresAt,
    });
    return { token, expiresAt };
  },
});
export const revokeAccessToken = mutation({
  args: { tokenId: v.id("accessTokens") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const token = await ctx.db.get(args.tokenId);
    if (!token || token.userId !== userId) throw new Error("Token not found.");
    await ctx.db.patch(token._id, { revokedAt: Date.now() });
    return null;
  },
});
export const tokenList = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return (
      await ctx.db
        .query("accessTokens")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(100)
    ).map(({ hash, ...token }) => token);
  },
});
export const resolve = internalQuery({
  args: {
    accessToken: v.optional(v.string()),
    requiredScope: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) =>
    requireUser(ctx, args.accessToken, args.requiredScope),
});
