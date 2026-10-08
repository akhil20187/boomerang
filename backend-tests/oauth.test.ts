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
it('advertises the branded MCP resource while retaining the existing sign-in issuer', async () => {
  vi.stubEnv('CONVEX_SITE_URL', 'https://app.convex.site');
  vi.stubEnv('MCP_PUBLIC_URL', 'https://askboomerang.vercel.app');
  const t = convexTest(schema, modules);
  const metadata = await (await t.fetch('/.well-known/oauth-protected-resource/public')).json();
  expect(metadata.resource).toBe('https://askboomerang.vercel.app/mcp');
  expect(metadata.authorization_servers).toEqual(['https://app.convex.site']);
  const response = await t.fetch('/mcp/public', { method: 'POST', body: '{}' });
  expect(response.status).toBe(401);
  expect(response.headers.get('WWW-Authenticate')).toContain('https://askboomerang.vercel.app/.well-known/oauth-protected-resource/mcp');
  const legacy = await (await t.fetch('/.well-known/oauth-protected-resource/mcp')).json();
  expect(legacy.resource).toBe('https://app.convex.site/mcp');
  expect((await t.fetch('/mcp', {method:'POST',body:'{}'})).headers.get('WWW-Authenticate')).toContain('https://app.convex.site/.well-known/oauth-protected-resource/mcp');
});
it("serves the skill as readable text and rejects a missing-asset SPA fallback", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://app.convex.site");
  const t = convexTest(schema, modules);
  const fetchAsset = vi.fn(async () => new Response("---\nname: boomerang\n---\n# Boomerang"));
  vi.stubGlobal("fetch", fetchAsset);
  const response = await t.fetch("/SKILL.md");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  expect(await response.text()).toContain("name: boomerang");
  fetchAsset.mockImplementation(async () => new Response("<html>App fallback</html>"));
  expect((await t.fetch("/SKILL.md")).status).toBe(503);
});
it('saved shop discovery explains unavailable service pricing and disabled calling without guessing a price',async()=>{
  const t=convexTest(schema,modules);
  const {userId,draftId}=await t.run(async ctx=>{
    const userId=await ctx.db.insert('users',{email:'availability@example.com'});
    const draftId=await ctx.db.insert('drafts',{userId,productInput:'Phone',product:{name:'Phone'},pincode:'500037',cards:[],comments:'',radiusKm:10,shops:[],expiresAt:Date.now()+60000});
    return {userId,draftId};
  });
  const user=t.withIdentity({subject:`${userId}|session`});
  vi.stubEnv('ANSWER_PRICE_CENTS','');vi.stubEnv('LIVE_CALLS_ENABLED','false');
  const unpriced=await user.query(api.drafts.get,{draftId});
  expect(unpriced.answerPriceCents).toBeNull();expect(unpriced.callingAvailable).toBe(false);expect(unpriced.callingUnavailableReason).toBe('pricing_not_configured');
  vi.stubEnv('ANSWER_PRICE_CENTS','125');
  const disabled=await user.query(api.drafts.get,{draftId});
  expect(disabled.answerPriceCents).toBe(125);expect(disabled.callingAvailable).toBe(false);expect(disabled.callingUnavailableReason).toBe('calling_disabled');
});
it('allows a start request without internal cents and reports unavailable service pricing instead of asking for product price',async()=>{vi.stubEnv('CONVEX_SITE_URL','https://app.convex.site');vi.stubEnv('SITE_URL','https://app.convex.site');vi.stubEnv('ANSWER_PRICE_CENTS','');const t=convexTest(schema,modules);const ids=await t.run(async ctx=>{const userId=await ctx.db.insert('users',{email:'pricing@example.com'});const draftId=await ctx.db.insert('drafts',{userId,productInput:'Phone',product:{name:'Phone'},pincode:'500037',cards:[],comments:'',radiusKm:10,shops:[{placeId:'shop',name:'Shop',address:'Road',ratingCount:100,distanceKm:1,mapsUrl:'https://maps.google.com',fewRatings:false}],expiresAt:Date.now()+60000});return {userId,draftId};});const user=t.withIdentity({subject:`${ids.userId}|session`}),token=await user.mutation(api.users.createAccessToken,{name:'Pricing test'});const rpc=async(method:string,params?:any)=>{const response=await t.fetch('/mcp',{method:'POST',headers:{Authorization:`Bearer ${token.token}`},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});return response.json();};const list=await rpc('tools/list');const start=list.result.tools.find((x:any)=>x.name==='start_calls');expect(start.inputSchema.required).not.toContain('expectedAnswerPriceCents');const result=await rpc('tools/call',{name:'start_calls',arguments:{draftId:ids.draftId,selectedPlaceIds:['shop'],idempotencyKey:'no-priced-start'}});expect(result.result.isError).toBe(true);expect(result.result.structuredContent.reason).toBe('pricing_not_configured');expect(result.result.content[0].text).toContain('service price');expect(result.result.content[0].text).not.toContain('expectedAnswerPriceCents');expect(await user.query(api.tasks.list,{})).toHaveLength(0);});
it("accepts exact Claude redirect registration and rejects lookalike hosts or callback prefixes", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://app.convex.site");
  const t = convexTest(schema, modules);
  const register = (uri: string) =>
    t.mutation(internal.oauth.operate, {
      op: "register",
      data: { redirect_uris: [uri] },
    });
  expect(
    (await register("https://claude.ai/api/mcp/auth_callback")).status,
  ).toBe(201);
  expect((await register("http://127.0.0.1:54321/callback")).status).toBe(201);
  expect((await register("http://localhost:54321/oauth/callback")).status).toBe(201);
  for (const uri of [
    "https://claude.ai.attacker.example/api/mcp/auth_callback",
    "https://claude.ai/api/mcp/auth_callback/extra",
    "https://claude.ai/api/mcp/auth_callback?next=attacker",
    "https://claude.ai/api/mcp/auth_callback-malicious",
    "http://localhost.attacker.example:54321/callback",
    "http://127.0.0.2:54321/callback",
    "http://127.0.0.1:54321/callback?next=attacker",
    "http://user@localhost:54321/callback",
    "http://localhost:65536/callback",
    "http://localhost:54321/other",
  ])
    expect((await register(uri)).body.error).toBe("invalid_redirect_uri");
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
    "account_status",
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
  const account = await rpc("tools/call", { name: "account_status", arguments: {} });
  expect(account.result.structuredContent.email).toBe("test@example.com");
  expect(account.result.structuredContent.availableBalance).toBe(0);
  expect(account.result.structuredContent.currency).toBe("INR");
  expect(account.result.structuredContent).not.toHaveProperty("id");
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
  const resourceUri = (await rpc('resources/list')).result.resources[0].uri;
  expect(
    (await rpc("resources/read", { uri: resourceUri }))
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
it.each(["https://chatgpt.com/connector_platform_oauth_redirect", "http://127.0.0.1:54321/callback", "http://localhost:54321/oauth/callback"].flatMap(callback => ['https://app.convex.site/mcp', 'https://askboomerang.vercel.app/mcp'].map(resource => ({callback, resource}))))("binds approval and tokens to $callback and $resource, consumes codes, rotates refresh and revokes replay", async ({callback, resource}) => {
  vi.stubEnv("CONVEX_SITE_URL", "https://app.convex.site");
  vi.stubEnv("SITE_URL", "https://app.convex.site");
  vi.stubEnv('MCP_PUBLIC_URL', 'https://askboomerang.vercel.app');
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { email: "owner@example.com" }),
  );
  const user = t.withIdentity({ subject: `${userId}|session` });
  const call = (op: string, data: any) =>
    t.mutation(internal.oauth.operate, { op, data });
  const registered = await call("register", {
    redirect_uris: [callback],
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
    redirect_uri: callback,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource,
    scope: "shops:read",
    state: "client-state",
  });
  expect(request.status).toBe(302);
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
    redirect_uri: callback,
    resource,
    code,
    code_verifier: verifier,
  };
  expect(
    (await call("token", { ...exchange, code_verifier: "b".repeat(43) }))
      .status,
  ).toBe(400);
  const otherResource = resource.includes('convex.site') ? 'https://askboomerang.vercel.app/mcp' : 'https://app.convex.site/mcp';
  expect((await call('token', {...exchange, resource: otherResource})).status).toBe(400);
  const token = await call("token", exchange);
  expect(token.status).toBe(200);
  expect(token.body.scope).toBe("shops:read");
  const initialized = await t.fetch(resource.includes('convex.site') ? '/mcp' : '/mcp/public', {method:'POST', headers:{Authorization:`Bearer ${token.body.access_token}`}, body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}})});
  expect(initialized.status).toBe(200);
  expect((await initialized.json()).result.serverInfo.name).toBe('boomerang');
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
    resource,
    refresh_token: token.body.refresh_token,
  };
  expect(
    (await call("token", { ...refresh, scope: "shops:read calls:write" }))
      .status,
  ).toBe(400);
  expect((await call('token', {...refresh, resource: otherResource})).status).toBe(400);
  const rotated = await call("token", refresh);
  expect(rotated.status).toBe(200);
  expect((await call("token", refresh)).status).toBe(400);
  expect(
    await t.query(api.users.me, { accessToken: rotated.body.access_token }),
  ).toBeNull();
});
