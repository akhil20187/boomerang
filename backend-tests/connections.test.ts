import { it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);

async function setup() {
  const t = convexTest(schema, modules);
  const [alice, bob] = await t.run(async (ctx) => [
    await ctx.db.insert("users", { email: "alice@example.com" }),
    await ctx.db.insert("users", { email: "bob@example.com" }),
  ]);
  await t.run((ctx) => ctx.db.insert("oauthClients", { clientId: "c-chatgpt", name: "ChatGPT", redirectUris: [] }));
  const connect = (userId: typeof alice, familyId: string, family: { expiresAt?: number; revokedAt?: number } = {}) =>
    t.run(async (ctx) => {
      await ctx.db.insert("oauthFamilies", { familyId, userId, expiresAt: family.expiresAt ?? Date.now() + 86_400_000, ...(family.revokedAt ? { revokedAt: family.revokedAt } : {}) });
      await ctx.db.insert("accessTokens", { userId, name: "Connected assistant", hash: `hash-${familyId}`, expiresAt: Date.now() + 3_600_000, clientId: "c-chatgpt", familyId, scope: "shops:read", resource: "https://example.com/mcp" });
    });
  return {
    t, alice, bob, connect,
    as: (id: typeof alice) => t.withIdentity({ subject: `${id}|session` }),
  };
}

it("is false with no connection, or only a manual access key", async () => {
  const s = await setup();
  expect(await s.as(s.alice).query(api.connections.status, {})).toEqual({ connected: false, clients: [] });
  await s.t.run((ctx) => ctx.db.insert("accessTokens", { userId: s.alice, name: "Manual key", hash: "manual", expiresAt: Date.now() + 3_600_000 }));
  expect((await s.as(s.alice).query(api.connections.status, {})).connected).toBe(false);
});

it("is true for an active OAuth family and returns only the client name and last use", async () => {
  const s = await setup();
  await s.connect(s.alice, "fam-1");
  const out = await s.as(s.alice).query(api.connections.status, {});
  expect(out.connected).toBe(true);
  expect(out.clients).toHaveLength(1);
  expect(out.clients[0].name).toBe("ChatGPT");
  expect(typeof out.clients[0].lastUsedAt).toBe("number");
  expect(Object.keys(out.clients[0]).sort()).toEqual(["lastUsedAt", "name"]);
  expect(JSON.stringify(out)).not.toContain("hash-fam-1");
  // Bob does not see Alice's connection.
  expect((await s.as(s.bob).query(api.connections.status, {})).connected).toBe(false);
});

it("is false when the family is revoked or expired", async () => {
  const s = await setup();
  await s.connect(s.alice, "fam-revoked", { revokedAt: Date.now() - 1000 });
  await s.connect(s.alice, "fam-expired", { expiresAt: Date.now() - 1000 });
  expect(await s.as(s.alice).query(api.connections.status, {})).toEqual({ connected: false, clients: [] });
});

it("requires sign-in", async () => {
  const s = await setup();
  await expect(s.t.query(api.connections.status, {})).rejects.toThrow("Sign in");
});
