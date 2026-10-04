import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal, api } from "../convex/_generated/api";
const modules = import.meta.glob([
  "../convex/**/*.{ts,js}",
  "!../convex/**/*.d.ts",
]);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("serves OAuth discovery and stateless MCP tools behind account bearer authentication", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://app.convex.site");
  vi.stubEnv("SITE_URL", "https://app.convex.site");
  const t = convexTest(schema, modules);
  const discovery = await t.fetch("/.well-known/oauth-authorization-server");
  expect((await discovery.json()).grant_types_supported).toContain(
    "refresh_token",
  );
  expect(
    (
      await t.fetch("/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      })
    ).status,
  ).toBe(401);
  const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "test@example.com" }),
    ),
    user = t.withIdentity({ subject: `${userId}|session` });
  const token = await user.mutation(api.users.createAccessToken, {
    name: "Test MCP",
  });
  const response = await t.fetch("/mcp", {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  });
  const result = await response.json();
  expect(result.result.tools.map((x: any) => x.name)).toEqual([
    "find_shops",
    "more_shops",
    "start_calls",
    "task_status",
    "get_recording",
  ]);
  const bad = await t.fetch("/mcp", {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}` },
    body: "[]",
  });
  expect(bad.status).toBe(400);
  const rpc = async (method: string, params: any) => {
    const response = await t.fetch("/mcp", {
      method: "POST",
      headers: { Authorization: `Bearer ${token.token}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method, params }),
    });
    return response.json();
  };
  expect((await rpc("resources/read", { uri: "ui://wrong" })).error.code).toBe(
    -32002,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
        ),
    ),
  );
  expect(
    (await rpc("resources/read", { uri: "ui://human-mcp/shops-v1.html" }))
      .result.contents[0].mimeType,
  ).toBe("text/html;profile=mcp-app");
  const invalid = await rpc("tools/call", {
    name: "task_status",
    arguments: { taskId: "invalid" },
  });
  expect(invalid.result.isError).toBe(true);
  expect(invalid.result.content[0].text).toBe(
    "This request could not be completed. Try again.",
  );
});
it("binds approval to account, resource, redirect and PKCE, consumes codes, rotates refresh and revokes replay", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://app.convex.site");
  vi.stubEnv("SITE_URL", "https://app.convex.site");
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { email: "owner@example.com" }),
  );
  const user = t.withIdentity({ subject: `${userId}|session` });
  const call = (op: string, data: any) =>
    t.mutation(internal.oauth.operate, { op, data });
  const registered = await call("register", {
    redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
    client_name: "Test assistant",
  });
  expect(registered.status).toBe(201);
  const clientId = registered.body.client_id;
  const verifier = "a".repeat(43);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = Buffer.from(digest).toString("base64url");
  const request = await call("authorize", {
    client_id: clientId,
    redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: "https://app.convex.site/mcp",
    scope: "shops:read",
    state: "client-state",
  });
  const requestId = new URL(request.body.redirectUrl).searchParams.get(
    "oauth_request",
  )!;
  expect((await call("approve", { requestId, approved: true })).status).toBe(
    401,
  );
  const approved = await user.mutation(internal.oauth.operate, {
    op: "approve",
    data: { requestId, approved: true },
  });
  const redirect = new URL(approved.body.redirectUrl);
  expect(redirect.searchParams.get("state")).toBe("client-state");
  const code = redirect.searchParams.get("code");
  const exchange = {
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
    resource: "https://app.convex.site/mcp",
    code,
    code_verifier: verifier,
  };
  expect(
    (await call("token", { ...exchange, code_verifier: "b".repeat(43) }))
      .status,
  ).toBe(400);
  const token = await call("token", exchange);
  expect(token.status).toBe(200);
  expect(token.body.scope).toBe("shops:read");
  await expect(
    t.query(internal.users.resolve, {
      accessToken: token.body.access_token,
      requiredScope: "calls:write",
    }),
  ).rejects.toThrow("Sign in");
  expect((await call("token", exchange)).status).toBe(400);
  expect(
    (await t.query(api.users.me, { accessToken: token.body.access_token }))
      .email,
  ).toBe("owner@example.com");
  const refresh = {
    grant_type: "refresh_token",
    client_id: clientId,
    resource: "https://app.convex.site/mcp",
    refresh_token: token.body.refresh_token,
  };
  expect(
    (await call("token", { ...refresh, scope: "shops:read calls:write" }))
      .status,
  ).toBe(400);
  const rotated = await call("token", refresh);
  expect(rotated.status).toBe(200);
  expect((await call("token", refresh)).status).toBe(400);
  expect(
    await t.query(api.users.me, { accessToken: rotated.body.access_token }),
  ).toBeNull();
});
