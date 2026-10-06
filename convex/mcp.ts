import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { metadata } from "./oauth";
import { callingQuote } from "./credits";
const uiUri = "ui://boomerang/shops-v3.html";
const textSchema = { type: "string" },
  idSchema = { type: "string", minLength: 1 };
export const tools = [
  {
    name: "account_status",
    description: "Verify the signed-in Boomerang account, available credit and calling availability without starting calls.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "find_shops",
    description:
      "Find nearby shops that may sell a product. A listing does not confirm stock.",
    inputSchema: {
      type: "object",
      properties: {
        productInput: { type: "string", minLength: 3, maxLength: 2000 },
        pincode: { type: "string", pattern: "^[1-9][0-9]{5}$" },
        radiusKm: { type: "number", enum: [10, 20] },
        cards: { type: "array", items: textSchema },
        comments: textSchema,
      },
      required: ["productInput", "pincode"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "more_shops",
    description:
      "Read the saved search; preserve the customer selection when showing more shops.",
    inputSchema: {
      type: "object",
      properties: { draftId: idSchema },
      required: ["draftId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "start_calls",
    description:
      "Call only shops explicitly selected and approved by the customer. This is currently unavailable when the shop-search answerPriceCents is null: report that the service price has not been set and do not ask the customer for a product price or an internal cents value. When a service quote exists, show its unit price and maximum total, get approval, and copy that exact quote into expectedAnswerPriceCents. Requires an approved account, credit and enabled calling.",
    inputSchema: {
      type: "object",
      properties: {
        draftId: idSchema,
        selectedPlaceIds: {
          type: "array",
          items: idSchema,
          minItems: 1,
          maxItems: 20,
        },
        idempotencyKey: { type: "string", minLength: 8, maxLength: 200 },
        expectedAnswerPriceCents: { type: "integer", minimum: 1,description:'Optional service-call quote copied exactly from answerPriceCents in find_shops or more_shops after customer approval. Never infer this value or ask the customer to supply it; it is unrelated to the product price. Omit when the service quote is null.' },
      },
      required: [
        "draftId",
        "selectedPlaceIds",
        "idempotencyKey",
      ],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "task_status",
    description:
      "Read the saved call progress, answers and proof. Unknown facts stay unconfirmed.",
    inputSchema: {
      type: "object",
      properties: { taskId: idSchema },
      required: ["taskId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "get_recording",
    description:
      "Get a private playback link that expires in five minutes for an account-owned recording.",
    inputSchema: {
      type: "object",
      properties: { attemptId: idSchema },
      required: ["attemptId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
].map((t) => ({
  ...t,
  _meta: {
    ui: { resourceUri: uiUri },
    "openai/outputTemplate": uiUri,
    "openai/widgetAccessible": true,
  },
  securitySchemes: [
    {
      type: "oauth2",
      scopes: [t.name === "start_calls" ? "calls:write" : "shops:read"],
    },
  ],
}));
const json = (body: any, status = 200, extra?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
function headers(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin"),
    website = new URL(process.env.SITE_URL ?? process.env.CONVEX_SITE_URL!)
      .origin;
  return origin === website
    ? {
        "Access-Control-Allow-Origin": website,
        Vary: "Origin",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      }
    : {};
}
export const oauthHttp = httpAction(async (ctx, request) => {
  const url = new URL(request.url),
    route = url.pathname,
    cors = headers(request);
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: origin && Object.keys(cors).length ? 204 : 403,
      headers: cors,
    });
  if (
    origin &&
    !Object.keys(cors).length &&
    ["/oauth/request", "/oauth/approve"].includes(route)
  )
    return json({ error: "invalid_origin" }, 403);
  if (route.startsWith("/.well-known/"))
    return json(
      route.includes("oauth-authorization-server")
        ? metadata()
        : {
            resource: `${process.env.CONVEX_SITE_URL}/mcp`,
            authorization_servers: [process.env.CONVEX_SITE_URL],
            scopes_supported: ["shops:read", "calls:write"],
            bearer_methods_supported: ["header"],
          },
      200,
      cors,
    );
  try {
    let data: any;
    if (request.method === "GET") data = Object.fromEntries(url.searchParams);
    else {
      const raw = await request.text();
      if (raw.length > 16000)
        return json({ error: "invalid_request" }, 413, cors);
      data = request.headers.get("Content-Type")?.includes("application/json")
        ? JSON.parse(raw)
        : Object.fromEntries(new URLSearchParams(raw));
    }
    const result = await ctx.runMutation(internal.oauth.operate, {
      op: route.split("/").pop()!,
      data,
    });
    if (result.status === 302)
      return new Response(null, {
        status: 302,
        headers: {
          Location: result.body.redirectUrl,
          "Cache-Control": "no-store",
          ...cors,
        },
      });
    return json(result.body, result.status, cors);
  } catch {
    return json({ error: "invalid_request" }, 400, cors);
  }
});
export const endpoint = httpAction(async (ctx, request) => {
  const site = process.env.CONVEX_SITE_URL!,
    www = `Bearer resource_metadata="${site}/.well-known/oauth-protected-resource", error="invalid_token"`;
  const token = /^Bearer\s+(\S+)$/i.exec(
    request.headers.get("Authorization") ?? "",
  )?.[1];
  if (!token)
    return json({ error: "Link your Boomerang account." }, 401, {
      "WWW-Authenticate": www,
    });
  try {
    await ctx.runQuery(internal.users.resolve, {
      accessToken: token,
      requiredScope: "",
    });
  } catch {
    return json(
      { error: "This assistant connection has expired or was revoked." },
      401,
      { "WWW-Authenticate": www },
    );
  }
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  let body: any;
  try {
    const raw = await request.text();
    if (raw.length > 256000) return json({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Invalid JSON" },
      },
      400,
    );
  }
  if (
    !body ||
    Array.isArray(body) ||
    body.jsonrpc !== "2.0" ||
    typeof body.method !== "string"
  )
    return json(
      {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32600, message: "Invalid request" },
      },
      400,
    );
  if (body.id === undefined) return new Response(null, { status: 202 });
  const respond = (result: any) =>
    json({ jsonrpc: "2.0", id: body.id, result });
  if (body.method === "initialize")
    return respond({
      protocolVersion: [
        "2025-11-25",
        "2025-06-18",
        "2025-03-26",
        "2024-11-05",
      ].includes(body.params?.protocolVersion)
        ? body.params.protocolVersion
        : "2025-06-18",
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: "boomerang", version: "1.0.0" },
      instructions:
        "Find potential nearby shops, let the customer confirm the product and select shops, then call only after explicit approval. Never infer stock from a listing. Sign in and link the customer account first.",
    });
  if (body.method === "ping") return respond({});
  if (body.method === "tools/list") return respond({ tools });
  if (body.method === "resources/list")
    return respond({
      resources: [
        {
          uri: uiUri,
          name: "Boomerang shop card",
          mimeType: "text/html;profile=mcp-app",
          description: "Choose shops, follow calls and read each answer.",
        },
      ],
    });
  if (body.method === "resources/read") {
    if (body.params?.uri !== uiUri)
      return json({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32002, message: "Resource not found" },
      });
    try {
      const response = await fetch(`${site}/widget.html`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Widget unavailable");
      const html = await response.text();
      if (!html.includes("root") || !html.includes("<html"))
        throw new Error("Widget unavailable");
      return respond({
        contents: [
          {
            uri: uiUri,
            mimeType: "text/html;profile=mcp-app",
            text: html,
            _meta: {
              ui: {
                csp: {
                  connectDomains: [
                    process.env.CONVEX_URL ?? site.replace(".site", ".cloud"),
                    site,
                  ],
                  resourceDomains: [site],
                },
                permissions: {},
              },
              "openai/widgetDescription":
                "Choose nearby shops, follow calls and see each shop answer.",
            },
          },
        ],
      });
    } catch {
      return json({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32603, message: "The shop card is not available yet." },
      });
    }
  }
  if (body.method === "tools/call") {
    const name = body.params?.name,
      args = body.params?.arguments ?? {};
    if (!tools.some((t) => t.name === name))
      return json({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32602, message: "Unknown tool" },
      });
    try {
      await ctx.runQuery(internal.users.resolve, {
        accessToken: token,
        requiredScope: name === "start_calls" ? "calls:write" : "shops:read",
      });
      let result: any;
      if (name === "account_status") {
        if (Object.keys(args).length) throw new Error("No arguments expected");
        const account = await ctx.runQuery(api.users.me, { accessToken: token });
        if (!account) throw new Error("Sign in required");
        result = { email: account.email, eligible: account.eligible,
          availableBalance: account.availableBalance, creditBalance: account.creditBalance,
          reservedBalance: account.reservedBalance, currency: account.currency,
          ...callingQuote() };
      } else if (name === "find_shops")
        result = await ctx.runAction(api.discovery.search, {
          ...args,
          accessToken: token,
        });
      else if (name === "more_shops") {
        const draft = await ctx.runQuery(api.drafts.get, {
          ...args,
          accessToken: token,
        });
        result = { ...draft, draftId: draft._id };
      } else if (name === "start_calls")
        result = await ctx.runMutation(api.tasks.start, {
          ...args,
          accessToken: token,
        });
      else if (name === "get_recording")
        result = await ctx.runMutation(api.recordings.playback, {
          ...args,
          accessToken: token,
        });
      else
        result = await ctx.runQuery(api.tasks.get, {
          ...args,
          accessToken: token,
        });
      return respond({
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      });
    } catch (error) {
      const detail=error instanceof ConvexError?error.data:null;
      if(detail&&typeof detail==='object'&&!Array.isArray(detail)&&detail.code==='service_unavailable'&&detail.reason==='pricing_not_configured') {
        const message='Shop calling is unavailable because the service price has not been set. No calls started and no credit was charged.';
        return respond({isError:true,content:[{type:'text',text:message}],structuredContent:{code:'service_unavailable',reason:'pricing_not_configured',callingAvailable:false,message}});
      }
      return respond({
        isError: true,
        content: [
          {
            type: "text",
            text:
              error instanceof ConvexError && typeof error.data === "string"
                ? error.data
                : "This request could not be completed. Try again.",
          },
        ],
      });
    }
  }
  return json({
    jsonrpc: "2.0",
    id: body.id,
    error: { code: -32601, message: "Method not found" },
  });
});
