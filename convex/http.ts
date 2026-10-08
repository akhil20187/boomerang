import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { auth } from "./auth";
import { endpoint, oauthHttp } from "./mcp";
const http = httpRouter();
auth.addHttpRoutes(http);
// Website bookmarks go to the canonical frontend; service endpoints stay here.
function websiteRedirect(request: Request, path: string) {
  const current = new URL(request.url);
  const base = process.env.SITE_URL;
  if (!base || new URL(base).origin === current.origin) return null;
  const target = new URL(path, base);
  target.search = current.search;
  return new Response(null, { status: 302, headers: {
    Location: target.href, 'Cache-Control': 'no-store',
  } });
}
for (const path of ['/app', '/account', '/tasks', '/status', '/connect', '/demo', '/landing.html', '/index.html']) {
  const destination = path === '/landing.html' ? '/' : path === '/index.html' ? '/app' : path;
  http.route({ path, method: 'GET', handler: httpAction(async (_ctx, request) =>
    websiteRedirect(request, destination) ?? new Response('Website address is not configured.', { status: 503 })) });
}
// The shareable skill should open as readable text, not a binary download.
http.route({ path: "/SKILL.md", method: "GET", handler: httpAction(async () => {
  const response = await fetch(`${process.env.CONVEX_SITE_URL}/boomerang-skill.md`,
    { signal: AbortSignal.timeout(15000) });
  const body = await response.text();
  if (!response.ok || !body.startsWith("---\nname: boomerang\n"))
    return new Response("Skill unavailable", { status: 503 });
  return new Response(body, { headers: {
    "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  } });
}) });
// Static hosting stores the landing page's sample calls as generic bytes without range support,
// which Safari refuses for audio. Serve them as audio/mpeg with byte ranges.
for (const name of ["aptronix-sample-call.mp3", "aptronix-sample-call-hi.mp3"])
  http.route({ path: `/audio/${name}`, method: "GET", handler: httpAction(async (_ctx, request) => {
    // The CDN caches /sample-audio/ for a year, so pass the page's ?v= through to fetch each new recording.
    const version = encodeURIComponent(new URL(request.url).searchParams.get("v") ?? "1");
    const source = await fetch(`${process.env.CONVEX_SITE_URL}/sample-audio/${name}?v=${version}`,
      { signal: AbortSignal.timeout(15000) });
    if (!source.ok) return new Response("Audio unavailable", { status: 503 });
    const bytes = new Uint8Array(await source.arrayBuffer());
    const headers: Record<string, string> = {
      "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff",
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("Range") ?? "");
    if (!range || (!range[1] && !range[2]))
      return new Response(bytes, { headers: { ...headers, "Content-Length": String(bytes.length) } });
    const start = range[1] ? Number(range[1]) : Math.max(0, bytes.length - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
    if (start > end || start >= bytes.length)
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
    return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
      ...headers, "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": String(end - start + 1),
    } });
  }) });
// Keep old setup bookmarks from exposing the withdrawn guide.
for (const path of ["/setup", "/setup.html"])
  http.route({ path, method: "GET", handler: httpAction(async () =>
    new Response(null, { status: 302, headers: { Location: "/", "Cache-Control": "no-store" } })) });
for (const path of [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
  "/.well-known/oauth-protected-resource/public",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-authorization-server/mcp",
  "/oauth/authorize",
  "/oauth/request",
])
  http.route({ path, method: "GET", handler: oauthHttp });
for (const path of [
  "/oauth/register",
  "/oauth/approve",
  "/oauth/token",
  "/oauth/revoke",
])
  http.route({ path, method: "POST", handler: oauthHttp });
for (const path of ["/oauth/request", "/oauth/approve"])
  http.route({ path, method: "OPTIONS", handler: oauthHttp });
http.route({ path: "/mcp", method: "POST", handler: endpoint });
http.route({ path: "/mcp", method: "GET", handler: endpoint });
// Vercel forwards its public address here; the explicit path keeps legacy
// resource discovery correct without trusting arbitrary forwarded-host headers.
http.route({ path: "/mcp/public", method: "POST", handler: endpoint });
http.route({ path: "/mcp/public", method: "GET", handler: endpoint });
http.route({
  path: "/api/call-event",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CALL_BRIDGE_SECRET;
    if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`)
      return new Response("Unauthorized", { status: 401 });
    const size = Number(request.headers.get("content-length") ?? 0);
    if (size > 1500000)
      return new Response("Payload too large", { status: 413 });
    try {
      const text = await request.text();
      if (text.length > 1500000)
        return new Response("Payload too large", { status: 413 });
      const data = JSON.parse(text);
      if (!data.eventId || !data.attemptId || !data.taskId || !data.shopJobId)
        return new Response("Missing identifiers", { status: 400 });
      const lifecycle = [
        "calling",
        "answered",
        "completed",
        "failed",
        "reconciliation_required",
      ].includes(data.status);
      if (!lifecycle && !data.recording)
        return new Response("Invalid status", { status: 400 });
      const fields = [
        "eventId",
        "attemptId",
        "taskId",
        "shopJobId",
        "status",
        "providerCallId",
        "providerRequestId",
        "durationSeconds",
        "endReason",
        "transportStatus",
        "transcript",
        "answer",
      ];
      const args = Object.fromEntries(
        fields
          .filter((k) => data[k] !== undefined && data[k] !== null)
          .map((k) => [k, data[k]]),
      );
      const result = lifecycle
        ? await ctx.runMutation(internal.calls.receive, args as any)
        : {};
      if (data.recording) {
        await ctx.scheduler.runAfter(0, internal.recordings.ingest, {
          attemptId: data.attemptId,
          taskId: data.taskId,
          shopJobId: data.shopJobId,
          eventId: `${data.eventId}:recording`,
          url: data.recording.url,
          ...(data.recording.durationSeconds != null
            ? { durationSeconds: data.recording.durationSeconds }
            : {}),
        });
      }
      return Response.json({ ok: true, ...result });
    } catch (e) {
      console.error(
        "Bridge callback validation failed",
        e instanceof Error ? e.message : "invalid payload",
      );
      return new Response("Invalid callback", { status: 400 });
    }
  }),
});
// The landing page owns "/"; the shop-search app lives at /app (SPA fallback).
http.route({
  path: "/",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const redirect = websiteRedirect(request, '/');
    if (redirect) return redirect;
    const response = await fetch(
      `${process.env.CONVEX_SITE_URL}/landing.html`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok)
      return Response.redirect(`${process.env.CONVEX_SITE_URL}/app`, 302);
    return new Response(await response.text(), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }),
});
registerStaticRoutes(http, components.staticHosting);
http.route({
  path: "/api/recording",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token");
    if (!token || token.length > 100)
      return new Response("Unauthorized", { status: 401 });
    const url = await ctx.runQuery(internal.recordings.resolvePlayback, {
      token,
    });
    if (!url) return new Response("Recording link expired", { status: 401 });
    const headers: Record<string, string> = {};
    const range = request.headers.get("Range");
    if (range) headers.Range = range;
    const audio = await fetch(url, { headers });
    const outputHeaders = new Headers({
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Type": audio.headers.get("Content-Type") ?? "audio/mpeg",
    });
    for (const name of ["Content-Length", "Content-Range", "Accept-Ranges"]) {
      const value = audio.headers.get(name);
      if (value) outputHeaders.set(name, value);
    }
    return new Response(audio.body, {
      status: audio.status,
      headers: outputHeaders,
    });
  }),
});
export default http;
