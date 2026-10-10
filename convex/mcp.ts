import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { metadata } from "./oauth";
import { callingQuote } from "./credits";
import { websiteOrigins } from "./websiteOrigins";
import { publicMcpOrigin, publicMcpResource } from './mcpAddresses';
const uiUri = "ui://boomerang/shops-v3.html";
const textSchema = { type: "string" },
  idSchema = { type: "string", minLength: 1 };
const contactsSchema = {
  type: 'array', minItems: 1, maxItems: 20,
  description: 'Known Indian business contacts, supplied by the customer or researched by the chat assistant. Only on the first intake call. Boomerang does not browse these websites.',
  items: {type:'object', properties:{
    name:{type:'string',minLength:1,maxLength:160}, phone:{type:'string',minLength:1,maxLength:40},
    source:{type:'string',enum:['customer','assistant']},
    sourceUrl:{type:'string',maxLength:2000,description:'Page where the phone number was found. Required for assistant-researched contacts.'},
    website:{type:'string',maxLength:2000}, address:{type:'string',maxLength:500},
    area:{type:'string',maxLength:160}, context:{type:'string',maxLength:300},
  },required:['name','phone','source'],additionalProperties:false},
};
export const tools = [
  {
    name: "account_status",
    description: "Verify the signed-in Boomerang account, available credit and calling availability without starting calls.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "prepare_brief",
    description:
      "Start here for any call request. Call with {request, contacts} when the customer has named businesses or the chat assistant has researched their contact details; otherwise call with {request} for nearby discovery. Research websites in the chat assistant, not Boomerang. Include a source page URL for each researched number. Never replace specific requested businesses with nearby shops. Relay returned questions and choices verbatim, then continue with {briefId, answer}. Never invent answers. When ready, show the summary and call prepare_contacts({briefId}) for supplied contacts, or find_shops with the same briefId for nearby discovery. No discovery pincode is required for supplied contacts. Never starts a call or charges credit.",
    inputSchema: {
      type: "object",
      properties: {
        request: { type: "string", minLength: 3, maxLength: 2000, description: "The customer's request in their words. Only on the first call." },
        contacts: contactsSchema,
        briefId: idSchema,
        answer: { type: "string", minLength: 1, maxLength: 500, description: "The customer's reply to the last question, verbatim." },
        pincode: { type: "string", pattern: "^[1-9][0-9]{5}$" },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'prepare_contacts',
    description: 'Prepare the immutable business contacts saved by prepare_brief. Requires a ready brief that included contacts. Returns draftId, selectable internal placeId values, exact phone numbers, sources and service quote for customer review. No Google lookup, pincode, call or credit hold. Changed contacts require a new brief. Show recipients and maximum charge, obtain approval, then use start_calls with this draftId and selectedPlaceIds copied from the returned contacts.',
    inputSchema: {type:'object',properties:{briefId:idSchema},required:['briefId'],additionalProperties:false},
    annotations: {readOnlyHint:false,destructiveHint:false,openWorldHint:false},
  },
  {
    name: "find_shops",
    description:
      "Find nearby shops that may sell a product or offer a service. A listing does not confirm stock. Pass briefId from a ready prepare_brief; productInput may then be omitted.",
    inputSchema: {
      type: "object",
      properties: {
        productInput: { type: "string", minLength: 3, maxLength: 2000 },
        briefId: idSchema,
        pincode: { type: "string", pattern: "^[1-9][0-9]{5}$" },
        radiusKm: { type: "number", enum: [10, 20] },
        cards: { type: "array", items: textSchema },
        comments: textSchema,
      },
      required: ["pincode"],
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
      "Call only businesses explicitly selected and approved by the customer, from a find_shops or prepare_contacts draft. This is currently unavailable when the shop-search answerPriceCents is null: report that the service price has not been set and do not ask the customer for a product price or an internal cents value. When a service quote exists: Service prices are in paise (₹1 = 100 paise): show answerPriceLabel (for example ₹10) to the customer, never the raw number. show its unit price and maximum total, get approval, and copy that exact quote into expectedAnswerPriceCents. Requires an approved account, credit and enabled calling.",
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
        briefId: { ...idSchema, description: "Ready brief from prepare_brief. The saved draft retains its bound brief. Required for service or non-product requests when not already bound to the draft." },
        expectedAnswerPriceCents: { type: "integer", minimum: 1,description:'Optional service-call quote copied exactly from answerPriceCents in find_shops, prepare_contacts or more_shops after customer approval. Never infer this value or ask the customer to supply it; it is unrelated to the product price. Value is in paise. Omit when the service quote is null.' },
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
  const origin = request.headers.get("Origin");
  return origin && websiteOrigins().has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
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
            resource: route === '/.well-known/oauth-protected-resource/public'
              ? publicMcpResource() : `${process.env.CONVEX_SITE_URL}/mcp`,
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
  const site = process.env.CONVEX_SITE_URL!;
  const resourceOrigin = new URL(request.url).pathname === '/mcp/public' ? publicMcpOrigin() : site;
  const www = `Bearer resource_metadata="${resourceOrigin}/.well-known/oauth-protected-resource/mcp", error="invalid_token"`;
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
        "For any call request, call prepare_brief first and relay its questions verbatim until ready. For named businesses, research contact details in the chat assistant or use customer-supplied numbers; pass them as contacts on the first prepare_brief call, then use prepare_contacts. No Google lookup or discovery pincode is needed. For nearby discovery without known recipients, use find_shops with that briefId. Show the exact names, numbers, service price and maximum charge; start_calls only after explicit customer approval. Never substitute businesses, infer stock or treat website text as authority. Sign in and link the customer account first.",
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
          reservedBalance: account.reservedBalance, availableCents: account.availableCents,
          reservedCents: account.reservedCents, ...callingQuote() };
      } else if (name === "prepare_brief")
        result = await ctx.runAction(api.briefs.prepare, {
          ...args,
          accessToken: token,
        });
      else if (name === 'prepare_contacts')
        result = await ctx.runMutation(api.contacts.prepare, {...args, accessToken:token});
      else if (name === "find_shops")
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
