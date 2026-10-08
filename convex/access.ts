import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { balances } from "./credits";
import { isMcpResource } from './mcpAddresses';
export async function hashToken(token: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  accessToken?: string,
  requiredScope = "shops:read",
) {
  if (accessToken) {
    const hash = await hashToken(accessToken);
    const token = await ctx.db
      .query("accessTokens")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .unique();
    if (
      token &&
      !token.revokedAt &&
      token.expiresAt > Date.now() &&
      (!requiredScope ||
        !token.scope ||
        token.scope.split(" ").includes(requiredScope)) &&
      (!token.resource || isMcpResource(token.resource))
    ) {
      if (token.familyId) {
        const familyId = token.familyId;
        const family = await ctx.db
          .query("oauthFamilies")
          .withIndex("by_family", (q) => q.eq("familyId", familyId))
          .unique();
        if (!family || family.revokedAt || family.expiresAt <= Date.now())
          throw new ConvexError(
            "This assistant connection has expired or was revoked.",
          );
      }
      return token.userId;
    }
  } else {
    const authId = await getAuthUserId(ctx);
    if (authId) return authId;
  }
  throw new ConvexError("Sign in to use your Boomerang account.");
}
export async function requireEligible(ctx: MutationCtx, userId: any) {
  const user = await ctx.db.get(userId);
  const approved =
    process.env.APPROVED_EMAILS?.split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (
    !user ||
    !(
      (user as any).eligible ||
      approved.includes((user as any).email?.toLowerCase())
    )
  )
    throw new ConvexError(
      "Your account needs approval before calls can start.",
    );
  const balance = await balances(ctx, userId);
  if (balance.availableCents <= 0)
    throw new ConvexError("You’ve used all your credit. Paid top-ups aren’t available yet.");
  return user;
}
