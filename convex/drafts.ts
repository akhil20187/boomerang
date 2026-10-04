import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./access";
import { productV, shopV } from "./validators";
export const save = internalMutation({
  args: {
    userId: v.id("users"),
    productInput: v.string(),
    product: productV,
    pincode: v.string(),
    cards: v.array(v.string()),
    comments: v.string(),
    radiusKm: v.number(),
    shops: v.array(shopV),
  },
  returns: v.id("drafts"),
  handler: async (ctx, args) =>
    ctx.db.insert("drafts", {
      ...args,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }),
});
export const get = query({
  args: { draftId: v.id("drafts"), accessToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken);
    const draft = await ctx.db.get(args.draftId);
    if (!draft || draft.userId !== userId) throw new Error("Search not found.");
    if (draft.expiresAt < Date.now())
      throw new Error(
        "This shop search has expired. Search again for current listings.",
      );
    return draft;
  },
});
