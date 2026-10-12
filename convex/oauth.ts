import { internalMutation } from "./mutationSafety";
import { v } from "convex/values";
import { hashToken, requireUser } from "./access";
import { isMcpResource } from './mcpAddresses';
const random = () => `${crypto.randomUUID()}${crypto.randomUUID()}`;
const scopeList = ["shops:read", "calls:write"];
function scopes(input: any = "shops:read calls:write") {
  if (typeof input !== "string") throw new OAuthError("invalid_scope");
  const values = [...new Set(input.split(" ").filter(Boolean))];
  if (!values.length || values.some((s) => !scopeList.includes(s)))
    throw new OAuthError("invalid_scope");
  return values.join(" ");
}
class OAuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function origin() {
  return process.env.CONVEX_SITE_URL!;
}
export function metadata() {
  const issuer = origin();
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: scopeList,
    authorization_response_iss_parameter_supported: true,
  };
}
function redirect(request: any, params: Record<string, string>) {
  const url = new URL(request.redirectUri);
  for (const [k, value] of Object.entries({
    ...params,
    ...(request.state ? { state: request.state } : {}),
    iss: origin(),
  }))
    url.searchParams.set(k, value);
  return url.href;
}
async function challenge(verifier: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
async function issue(ctx: any, args: any) {
  const access = `hmcp_${random()}`,
    refresh = random();
  const now = Date.now(),
    accessExpiry = Math.min(now + 3600000, args.expiresAt);
  await ctx.db.insert("accessTokens", {
    userId: args.userId,
    name: args.name ?? "Connected assistant",
    hash: await hashToken(access),
    expiresAt: accessExpiry,
    scope: args.scope,
    resource: args.resource,
    clientId: args.clientId,
    familyId: args.familyId,
  });
  await ctx.db.insert("oauthRefreshTokens", {
    hash: await hashToken(refresh),
    userId: args.userId,
    clientId: args.clientId,
    resource: args.resource,
    scope: args.scope,
    familyId: args.familyId,
    expiresAt: args.expiresAt,
  });
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: "Bearer",
    expires_in: Math.floor((accessExpiry - now) / 1000),
    scope: args.scope,
  };
}
export const operate = internalMutation({
  args: { op: v.string(), data: v.any() },
  returns: v.any(),
  handler: async (ctx, { op, data }): Promise<any> => {
    try {
      const now = Date.now();
      const allowed = (
        process.env.MCP_OAUTH_REDIRECT_URIS ??
        "https://chatgpt.com/connector_platform_oauth_redirect,https://claude.ai/api/mcp/auth_callback"
      )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // Native assistants receive OAuth responses on a local HTTP listener.
      // Match literal hosts and paths, then bind the exact URI to the client.
      const redirectAllowed = (uri: unknown) => {
        if (typeof uri !== "string") return false;
        if (allowed.includes(uri)) return true;
        return /^http:\/\/(?:127\.0\.0\.1|localhost):[1-9][0-9]{0,4}\/(?:callback|oauth\/callback)$/.test(uri)
          && Number(uri.match(/:([0-9]+)\//)?.[1]) <= 65535;
      };
      const clientFor = async (id: string) => {
        if (typeof id !== "string") throw new OAuthError("invalid_client");
        const client = await ctx.db
          .query("oauthClients")
          .withIndex("by_client", (q) => q.eq("clientId", id))
          .unique();
        if (!client) throw new OAuthError("invalid_client");
        return client;
      };
      if (op === "register") {
        if (
          !Array.isArray(data.redirect_uris) ||
          !data.redirect_uris.length ||
          data.redirect_uris.length > 5 ||
          data.redirect_uris.some(
            (s: any) => !redirectAllowed(s),
          )
        )
          throw new OAuthError("invalid_redirect_uri");
        if (
          (data.token_endpoint_auth_method &&
            data.token_endpoint_auth_method !== "none") ||
          (data.grant_types &&
            (!Array.isArray(data.grant_types) ||
              data.grant_types.some(
                (g: string) =>
                  !["authorization_code", "refresh_token"].includes(g),
              )))
        )
          throw new OAuthError("invalid_client_metadata");
        if (
          (await ctx.db.query("oauthClients").withIndex("by_client").take(5001))
            .length >= 5000
        )
          throw new OAuthError("registration_limit", 429);
        const clientId = random(),
          name =
            typeof data.client_name === "string"
              ? data.client_name.slice(0, 80)
              : "Your AI assistant";
        await ctx.db.insert("oauthClients", {
          clientId,
          name,
          redirectUris: data.redirect_uris,
        });
        return {
          status: 201,
          body: {
            client_id: clientId,
            client_name: name,
            redirect_uris: data.redirect_uris,
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            client_id_issued_at: Math.floor(now / 1000),
          },
        };
      }
      if (op === "authorize") {
        const client = await clientFor(data.client_id);
        if (
          data.response_type !== "code" ||
          !client.redirectUris.includes(data.redirect_uri) ||
          !redirectAllowed(data.redirect_uri) ||
          data.code_challenge_method !== "S256" ||
          !/^[-_a-zA-Z0-9]{43}$/.test(data.code_challenge ?? "") ||
          !isMcpResource(data.resource) ||
          (data.state && data.state.length > 2000)
        )
          throw new OAuthError("invalid_request");
        if (
          (
            await ctx.db
              .query("oauthRequests")
              .withIndex("by_expiry", (q) => q.gt("expiresAt", now))
              .take(5001)
          ).length >= 5000
        )
          throw new OAuthError("request_limit", 429);
        const requestId = random();
        await ctx.db.insert("oauthRequests", {
          requestId,
          clientId: client.clientId,
          clientName: client.name,
          redirectUri: data.redirect_uri,
          challenge: data.code_challenge,
          resource: data.resource,
          scope: scopes(data.scope),
          expiresAt: now + 600000,
          status: "pending",
          ...(data.state ? { state: data.state } : {}),
        });
        const url = new URL("/connect", process.env.SITE_URL ?? origin());
        url.searchParams.set("oauth_request", requestId);
        return { status: 302, body: { redirectUrl: url.href } };
      }
      if (op === "request" || op === "approve") {
        const requestId = op === "request" ? data.id : data.requestId;
        if (typeof requestId !== "string")
          throw new OAuthError("invalid_request");
        const request = await ctx.db
          .query("oauthRequests")
          .withIndex("by_request", (q) => q.eq("requestId", requestId))
          .unique();
        if (
          !request ||
          request.expiresAt <= now ||
          request.status !== "pending"
        )
          throw new OAuthError("invalid_request", 404);
        if (op === "request")
          return {
            status: 200,
            body: {
              clientName: request.clientName,
              scope: request.scope,
              resource: request.resource,
            },
          };
        let userId;
        try {
          userId = await requireUser(ctx);
        } catch {
          throw new OAuthError("unauthorized", 401);
        }
        if (data.approved !== true) {
          await ctx.db.patch(request._id, { status: "denied" });
          return {
            status: 200,
            body: {
              redirectUrl: redirect(request, { error: "access_denied" }),
            },
          };
        }
        const code = random();
        await ctx.db.insert("oauthCodes", {
          hash: await hashToken(code),
          userId,
          clientId: request.clientId,
          redirectUri: request.redirectUri,
          challenge: request.challenge,
          resource: request.resource,
          scope: request.scope,
          expiresAt: now + 120000,
        });
        await ctx.db.patch(request._id, { status: "approved" });
        return {
          status: 200,
          body: { redirectUrl: redirect(request, { code }) },
        };
      }
      if (op === "token") {
        await clientFor(data.client_id);
        if (data.grant_type === "authorization_code") {
          const hash = await hashToken(String(data.code ?? ""));
          const code = await ctx.db
            .query("oauthCodes")
            .withIndex("by_hash", (q) => q.eq("hash", hash))
            .unique();
          if (
            !code ||
            code.expiresAt <= now ||
            code.clientId !== data.client_id ||
            code.redirectUri !== data.redirect_uri ||
            !isMcpResource(data.resource) ||
            data.resource !== code.resource ||
            typeof data.code_verifier !== "string" ||
            !/^[-._~a-zA-Z0-9]{43,128}$/.test(data.code_verifier) ||
            (await challenge(data.code_verifier)) !== code.challenge
          )
            throw new OAuthError("invalid_grant");
          await ctx.db.delete(code._id);
          const familyId = random(),
            expiresAt = now + 90 * 86400000;
          await ctx.db.insert("oauthFamilies", {
            familyId,
            userId: code.userId,
            expiresAt,
          });
          return {
            status: 200,
            body: await issue(ctx, { ...code, familyId, expiresAt }),
          };
        }
        if (data.grant_type === "refresh_token") {
          const hash = await hashToken(String(data.refresh_token ?? "")),
            refresh = await ctx.db
              .query("oauthRefreshTokens")
              .withIndex("by_hash", (q) => q.eq("hash", hash))
              .unique();
          if (
            !refresh ||
            refresh.clientId !== data.client_id ||
            refresh.resource !== data.resource ||
            !isMcpResource(data.resource) ||
            refresh.expiresAt <= now ||
            refresh.revokedAt
          )
            throw new OAuthError("invalid_grant");
          const family = await ctx.db
            .query("oauthFamilies")
            .withIndex("by_family", (q) => q.eq("familyId", refresh.familyId))
            .unique();
          if (!family || family.revokedAt || family.expiresAt <= now)
            throw new OAuthError("invalid_grant");
          if (refresh.usedAt) {
            await ctx.db.patch(family._id, { revokedAt: now });
            return { status: 400, body: { error: "invalid_grant" } };
          }
          const scope =
            data.scope === undefined ? refresh.scope : scopes(data.scope);
          if (
            scope.split(" ").some((s) => !refresh.scope.split(" ").includes(s))
          )
            throw new OAuthError("invalid_scope");
          await ctx.db.patch(refresh._id, { usedAt: now });
          return {
            status: 200,
            body: await issue(ctx, {
              ...refresh,
              scope,
              expiresAt: family.expiresAt,
            }),
          };
        }
        throw new OAuthError("unsupported_grant_type");
      }
      if (op === "revoke") {
        await clientFor(data.client_id);
        const hash = await hashToken(String(data.token ?? ""));
        const access = await ctx.db
          .query("accessTokens")
          .withIndex("by_hash", (q) => q.eq("hash", hash))
          .unique();
        const refresh = await ctx.db
          .query("oauthRefreshTokens")
          .withIndex("by_hash", (q) => q.eq("hash", hash))
          .unique();
        const token = access ?? refresh;
        if (token && token.clientId === data.client_id && token.familyId) {
          const familyId = token.familyId;
          const family = await ctx.db
            .query("oauthFamilies")
            .withIndex("by_family", (q) => q.eq("familyId", familyId))
            .unique();
          if (family) await ctx.db.patch(family._id, { revokedAt: now });
        }
        return { status: 200, body: {} };
      }
      throw new OAuthError("invalid_request");
    } catch (e) {
      if (e instanceof OAuthError)
        return { status: e.status, body: { error: e.message } };
      throw e;
    }
  },
});
