/**
 * Whether the signed-in user has an active ChatGPT/Claude (OAuth) connection (D153).
 * Reads existing tables only. oauthFamilies has no user index and the product owner ruled out
 * schema/index changes, so active families are found through the user's newest access tokens
 * (accessTokens.by_user). Every token refresh issues a new access token in the family, so a
 * connection in use always has a recent token. Never returns tokens, hashes or secrets.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./access";

/** Bound on tokens scanned; a family whose newest token is older than this many of the user's tokens is missed. */
export const MAX_TOKENS_SCANNED = 200;

export const status = query({
  args: { accessToken: v.optional(v.string()) },
  returns: v.object({
    connected: v.boolean(),
    clients: v.array(v.object({ name: v.optional(v.string()), lastUsedAt: v.optional(v.number()) })),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken);
    const tokens = await ctx.db
      .query("accessTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(MAX_TOKENS_SCANNED);
    const families = new Map<string, { clientId?: string; lastUsedAt: number }>();
    for (const t of tokens)
      if (t.familyId && !families.has(t.familyId))
        families.set(t.familyId, { clientId: t.clientId, lastUsedAt: t._creationTime });
    const now = Date.now();
    const clients: { name?: string; lastUsedAt?: number }[] = [];
    for (const [familyId, info] of families) {
      const family = await ctx.db
        .query("oauthFamilies")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .unique();
      if (!family || family.userId !== userId || family.revokedAt || family.expiresAt <= now) continue;
      const client = info.clientId
        ? await ctx.db
            .query("oauthClients")
            .withIndex("by_client", (q) => q.eq("clientId", info.clientId!))
            .unique()
        : null;
      clients.push({ ...(client?.name ? { name: client.name } : {}), lastUsedAt: info.lastUsedAt });
    }
    return { connected: clients.length > 0, clients };
  },
});
