import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { auth } from "./auth";
import { endpoint, oauthHttp } from "./mcp";
const http = httpRouter();
auth.addHttpRoutes(http);
for (const path of [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
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
