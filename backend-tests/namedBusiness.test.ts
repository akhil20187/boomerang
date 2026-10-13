/**
 * Redesign step 9 (D163, D164): named business search, web lookup, supplied numbers in the website chat,
 * "Something else" means free text, small talk never searches, singular nouns.
 */
import { it, expect, vi, afterEach, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { nameMatches, countNoun, singularNoun, briefSearchPhrase } from "../convex/domain";
import { isEscapeChoice, openAfterEscape } from "../convex/intake";
import { normalizeIndianPhone, pageHasNumber, verifyCandidates, parseWebBusinessResponse, fetchableUrl, loadPageText } from "../convex/webBusiness";
import { pickerRepeat, pickerText, notFoundText, carryRequest, escapeReply, CHAT_SYSTEM_PROMPT } from "../convex/chat";
import { lookUpFact } from "../convex/facts";
const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
vi.mock("../convex/workflows", () => ({ workflow: { start: vi.fn(async () => "wf-test") } }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

// ---------- pure helpers ----------

describe("name matching", () => {
  it("keeps listings whose distinctive words match and drops unrelated firms", () => {
    const asked = "Ainapur Consultants and Engineers";
    expect(nameMatches(asked, "AINAPUR CONSULTANTS & ENGINEERS PVT LTD")).toBe(true);
    expect(nameMatches(asked, "Ainapur Consultants")).toBe(true);
    expect(nameMatches(asked, "Ainapura Consultant Engineers")).toBe(true); // one typo / plural form
    expect(nameMatches(asked, "SG Analytics")).toBe(false);
    expect(nameMatches(asked, "Falcon Resilient Infra Consultants")).toBe(false);
    expect(nameMatches(asked, "ENGRIN Services Private Limited")).toBe(false);
    expect(nameMatches("Aarvee Associates", "Aarvee Associates Architects Engineers & Consultants Pvt Ltd")).toBe(true);
    expect(nameMatches("Aar Vee Associates", "AarVee Associates")).toBe(true);
    expect(nameMatches("Aarvee Associates", "Sri Associates")).toBe(false);
    // A name made only of generic words needs all of them.
    expect(nameMatches("Consultants and Engineers", "Falcon Consultants")).toBe(false);
    expect(nameMatches("Consultants and Engineers", "Consultants & Engineers Hyderabad")).toBe(true);
    expect(nameMatches("", "Anything")).toBe(false);
  });
});

describe("nouns", () => {
  it("says 1 office, 1 shop, 1 institute, 1 business, 2 offices", () => {
    expect(countNoun(1, "offices")).toBe("1 office");
    expect(countNoun(1, "shops")).toBe("1 shop");
    expect(countNoun(1, "institutes")).toBe("1 institute");
    expect(countNoun(1, "businesses")).toBe("1 business");
    expect(countNoun(1, "clinics")).toBe("1 clinic");
    expect(countNoun(2, "offices")).toBe("2 offices");
    expect(countNoun(0, "offices")).toBe("0 offices");
    expect(singularNoun("branches")).toBe("branch");
    expect(singularNoun("agencies")).toBe("agency");
    expect(singularNoun("glass")).toBe("glass");
  });
  it("picker titles use the right number and name", () => {
    expect(pickerText({ count: 1, noun: "offices", place: "Miyapur" })).toBe("1 office near Miyapur");
    expect(pickerText({ count: 3, noun: "offices", place: "Miyapur", businessName: "Ainapur Consultants and Engineers" })).toBe("Matches for “Ainapur Consultants and Engineers” near Miyapur");
    expect(pickerText({ count: 1, noun: "businesses", supplied: "customer" })).toBe("1 business you sent");
    expect(pickerText({ count: 2, noun: "offices", supplied: "web", businessName: "X" })).toBe("Web results for “X”");
  });
});

describe("short search phrase", () => {
  it("uses the kind of task, never the long summary sentence", () => {
    const brief = { task_type: "Enquiry about ESG and Sustainability services", task_context: { summary: "The customer wants information about ESG and Sustainability services from Ainapur Consultants and Engineers in Miyapur." } };
    expect(briefSearchPhrase(brief)).toBe("ESG and Sustainability services");
    expect(briefSearchPhrase({ task_type: "plumbing_repair" })).toBe("plumbing repair");
    expect(briefSearchPhrase({ task_type: "a very long task type with many many words in it", task_context: { summary: "x" } }, "offices")).toBe("offices");
  });
});

describe("Something else", () => {
  it("recognises escape choices", () => {
    for (const t of ["Something else", "something else.", "Other", "Others", "None of these", "not listed"]) expect(isEscapeChoice(t)).toBe(true);
    for (const t of ["Ask about ESG services", "Today", "Otherwise fine", ""]) expect(isEscapeChoice(t)).toBe(false);
  });
  it("the question after an escape answer has no choices", () => {
    const turns = [{ question: "What do you want to ask?", choices: ["Fees", "Something else"], answer: "Something else" }];
    expect(openAfterEscape(turns, { status: "question", question: "What exactly?", choices: ["Project", "Other"] }).choices).toEqual([]);
    expect(openAfterEscape([{ ...turns[0], answer: "Fees" }], { status: "question", question: "Q", choices: ["a", "b"] }).choices).toEqual(["a", "b"]);
    expect(escapeReply("What do you want to ask Ainapur Consultants and Engineers?")).toBe("Sure. Type what you’d like us to ask, in your own words.");
    expect(escapeReply("What do you want to enquire about with Ainapur Consultants and Engineers?")).toBe("Sure. Type what you’d like us to ask, in your own words.");
    expect(escapeReply("Which area?")).toBe("Sure. Type your answer in your own words.");
  });
});

describe("phone numbers and web results", () => {
  it("normalises Indian numbers and rejects the rest", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("040-2345 6789")).toBe("+914023456789");
    expect(normalizeIndianPhone("(040) 23456789")).toBe("+914023456789");
    expect(normalizeIndianPhone("+91 (0)40 2345 6789")).toBe("+914023456789");
    for (const bad of ["12345", "1800 123 4567", "+1 415 555 0100", "9999999999", "call me", "0123456789"]) expect(normalizeIndianPhone(bad)).toBeNull();
  });
  it("finds a number printed on a page with any separators", () => {
    expect(pageHasNumber("Call us: 040 - 2345 6789 (office)", "+914023456789")).toBe(true);
    expect(pageHasNumber("Mobile +91 98765-43210", "+919876543210")).toBe(true);
    expect(pageHasNumber("Mobile +91 98765-43211", "+919876543210")).toBe(false);
  });
  it("a number inside a longer run of digits does not count", () => {
    expect(pageHasNumber("Ref 919876543210123", "+919876543210")).toBe(false);
    expect(pageHasNumber("ID 19876543210", "+919876543210")).toBe(false);
    expect(pageHasNumber("Call 919876543210.", "+919876543210")).toBe(true);
    expect(pageHasNumber("Call 09876543210", "+919876543210")).toBe(true);
  });
  it("refuses IPv6 literals, IPv4 in any notation, non-default ports and trailing-dot hosts", () => {
    for (const bad of ["http://[::1]/", "https://[2001:db8::1]/x", "https://example.com:8080/", "https://example.com:443x/", "https://example.com./", "http://0x7f.0.0.1/", "http://2130706433/", "http://169.254.169.254/latest", "http://metadata.google.internal/"]) expect(fetchableUrl(bad)).toBeNull();
    expect(fetchableUrl("https://example.com:443/ok")?.href).toBe("https://example.com/ok"); // the default port is fine
  });
  it("follows redirects by hand: a hop to a private address is refused before it is requested; at most 3 hops", async () => {
    const calls: string[] = [];
    const routes: Record<string, Response | (() => Response)> = {
      "https://public.example.com/a": () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }),
      "https://public.example.com/b": () => new Response(null, { status: 301, headers: { location: "/c" } }),
      "https://public.example.com/c": () => new Response("Call 040 2345 6789", { status: 200, headers: { "content-type": "text/html" } }),
      "https://loop.example.com/1": () => new Response(null, { status: 302, headers: { location: "https://loop.example.com/2" } }),
      "https://loop.example.com/2": () => new Response(null, { status: 302, headers: { location: "https://loop.example.com/3" } }),
      "https://loop.example.com/3": () => new Response(null, { status: 302, headers: { location: "https://loop.example.com/4" } }),
      "https://loop.example.com/4": () => new Response(null, { status: 302, headers: { location: "https://loop.example.com/5" } }),
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
      calls.push(url);
      expect(init?.redirect).toBe("manual");
      const r = routes[url];
      if (!r) throw new Error(`unexpected fetch ${url}`);
      return typeof r === "function" ? r() : r;
    }));
    expect(await loadPageText(new URL("https://public.example.com/a"))).toBeNull();
    expect(calls).toEqual(["https://public.example.com/a"]); // the metadata address was never requested
    expect(await loadPageText(new URL("https://public.example.com/b"))).toContain("040 2345 6789");
    calls.length = 0;
    expect(await loadPageText(new URL("https://loop.example.com/1"))).toBeNull();
    expect(calls).toHaveLength(4); // the first request plus 3 redirect hops, then it stops
    expect(await loadPageText(new URL("http://127.0.0.1/"))).toBeNull();
  });
  it("only public http(s) pages are fetched", () => {
    expect(fetchableUrl("https://ainapur.example.in/contact")?.hostname).toBe("ainapur.example.in");
    for (const bad of ["http://localhost/x", "http://127.0.0.1/", "file:///etc/passwd", "https://intranet/", "https://u:p@site.com/", "https://x.internal/"]) expect(fetchableUrl(bad)).toBeNull();
  });
  it("keeps a result only when the name matches and the number is printed on its source page", async () => {
    const pages: Record<string, string> = {
      "https://ainapur.example.in/contact?utm_source=openai": "<p>Ainapur Consultants &amp; Engineers</p><a href=\"tel:+914023456789\">Call</a>",
      "https://dir.example.com/a": "Ainapur Consultants. Phone: 98765 43210",
    };
    const out = await verifyCandidates(
      "Ainapur Consultants and Engineers",
      [
        { name: "Ainapur Consultants & Engineers", phones: ["040 2345 6789"], sourceUrl: "https://ainapur.example.in/contact" },
        { name: "Ainapur Consultants", phones: ["98765 00000"], sourceUrl: "https://dir.example.com/a" }, // not on the page: invented
        { name: "SG Analytics", phones: ["040 1111 2222"], sourceUrl: "https://sg.example.com" }, // wrong business
        { name: "Ainapur Consultants", phones: ["12345"], sourceUrl: "https://dir.example.com/a" }, // not a valid number
        { name: "Ainapur Consultants", phones: ["98765 43210"], sourceUrl: "https://blocked.example.com" }, // page unreadable
        { name: "Ainapur Consultants", phones: ["040 2345 6789"], sourceUrl: "https://attacker.example.net/x" }, // model-written, not cited
      ],
      ["https://ainapur.example.in/contact?utm_source=openai", "https://dir.example.com/a", "https://sg.example.com", "https://blocked.example.com/"],
      async (url) => pages[url.href] ?? null,
    );
    expect(out.contacts).toEqual([
      { name: "Ainapur Consultants & Engineers", phone: "+914023456789", source: "assistant", sourceUrl: "https://ainapur.example.in/contact?utm_source=openai", context: "Number found on ainapur.example.in; it may be out of date." },
    ]);
    expect(out.dropped.map((d) => d.reason)).toEqual(["number not printed on the source page", "name does not match", "no valid Indian phone number", "source page could not be read to check the number", "source not from the web search"]);
  });
  it("reads the model's JSON even inside prose, with cited URLs", () => {
    const parsed = parseWebBusinessResponse({ output: [{ type: "message", content: [{ type: "output_text", text: "Here:\n```json\n{\"results\":[{\"name\":\"A\",\"phones\":[\"9876543210\"],\"address\":\"\",\"source_url\":\"https://a.example.com\"}]}\n```", annotations: [{ type: "url_citation", url: "https://a.example.com" }] }] }] });
    expect(parsed.candidates).toEqual([{ name: "A", phones: ["9876543210"], address: undefined, sourceUrl: "https://a.example.com" }]);
    expect(parsed.cited).toEqual(["https://a.example.com"]);
    const withSources = parseWebBusinessResponse({ output: [{ type: "web_search_call", action: { sources: [{ type: "url", url: "https://b.example.com/p" }] } }, { type: "message", content: [{ type: "output_text", text: "{\"results\":[]}" }] }] });
    expect(withSources.cited).toEqual(["https://b.example.com/p"]);
    expect(parseWebBusinessResponse({ output_text: "nothing" }).candidates).toEqual([]);
  });
});

describe("chat helpers", () => {
  it("not-found wording asks for the number and offers a category search", () => {
    expect(notFoundText("Ainapur Consultants and Engineers", "Miyapur", "offices", true)).toBe(
      "I couldn’t find Ainapur Consultants and Engineers on Google or the web near Miyapur. If you have their phone number, send it and I’ll set up the call. Or I can look for other offices nearby.",
    );
    expect(notFoundText("X", "Miyapur", "businesses", false)).toContain("on Google near Miyapur");
  });
  it("a contacts brief carries the earlier request and answers, without escape answers", () => {
    const open = { request: "I want you to call Ainapur", turns: [{ question: "What do you want to ask?", answer: "Something else" }, { question: "What do you want to ask?", answer: "ESG services" }, { question: "Which area?", answer: "Miyapur" }] };
    expect(carryRequest(open)).toBe("I want you to call Ainapur\nAlready answered: What do you want to ask? ESG services; Which area? Miyapur");
    expect(carryRequest(open, "Ask if they are open")).toBe("Ask if they are open");
  });
  it("pickerRepeat: pincode and area of the same brief are one place; a new business name searches anew", () => {
    const latest = { messageId: "m1" as any, briefId: "b1" as any, pincode: "500049", radiusKm: 10, expired: false };
    const same = { samePlaces: ["500049", "Miyapur"] };
    expect(pickerRepeat(latest, "b1" as any, { area: "Miyapur, Hyderabad" }, 10, same)).toBe("duplicate");
    expect(pickerRepeat(latest, "b1" as any, { area: "Miyapur" }, 10, same)).toBe("duplicate");
    expect(pickerRepeat(latest, "b1" as any, { area: "Miyapur" }, 10)).toBe("new"); // no alias known
    expect(pickerRepeat(latest, "b1" as any, { area: "Miyapur" }, 10, { ...same, businessName: "Ainapur Consultants" })).toBe("new");
    const named = { ...latest, businessName: "Ainapur Consultants" };
    expect(pickerRepeat(named, "b1" as any, { pincode: "500049" }, 10, { businessName: "ainapur consultants" })).toBe("duplicate");
    expect(pickerRepeat(named, "b1" as any, { pincode: "500049" }, 10, { businessName: "Aarvee Associates" })).toBe("new");
    expect(pickerRepeat(named, "b1" as any, { pincode: "500049" }, 10)).toBe("new");
    expect(pickerRepeat({ ...latest, supplied: true }, "b1" as any, { pincode: "500049" }, 10)).toBe("new");
  });
  it("look_up_fact still refuses business lookups but points to the named-business path", async () => {
    const out = await lookUpFact("phone number of Ainapur Consultants");
    expect(out.status).toBe("refused");
    expect((out as any).error).toContain("business_name and search_web true");
    expect(CHAT_SYSTEM_PROMPT).toContain("A NAMED BUSINESS");
  });
});

// ---------- chat engine with mocked fetch ----------

const esgBrief = {
  task_type: "Enquiry about ESG and Sustainability services",
  task_context: { summary: "The customer wants information about ESG and Sustainability services from Ainapur Consultants and Engineers in Miyapur.", known: [{ fact: "area", value: "Miyapur" }], unknown: [], share_only_if_asked: [] },
  call_purpose: "Find out if ESG and Sustainability services are provided.",
  expected_outcome: { must_confirm: ["Do you offer ESG and Sustainability services?"], nice_to_have: [], deciding_question: null },
  representing: { name: "the customer", kind: "personal", caller_name: "Gayatri" },
  authority: { enquiry_only: true, may_share_customer_contact: false, may_schedule: false, follow_up: "customer will follow up" },
  in_call_rules: [],
  deadline: { date: null, start_assumption: null },
  location: { home_visit: false, area: "Miyapur", building_if_asked: null },
};
const json = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status });
const say = (content: string) => ({ choices: [{ message: { role: "assistant", content } }] });
const tool = (name: string, args: unknown) => ({ choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: `c_${name}_${Math.random().toString(36).slice(2, 7)}`, type: "function", function: { name, arguments: JSON.stringify(args) } }] } }] });
const place = (id: string, name: string) => ({ id, displayName: { text: name }, formattedAddress: "Miyapur, Hyderabad", location: { latitude: 17.49, longitude: 78.35 }, internationalPhoneNumber: "+91 40 2345 0000", rating: 4.5, userRatingCount: 12 });

type Opts = { chat: unknown[]; intake?: unknown[]; places?: unknown[][]; web?: unknown[]; pages?: Record<string, string> };
async function setup(o: Opts) {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("GOOGLEPLACES_API_KEY", "test-places");
  const t = convexTest(schema, modules);
  const id = await t.run((ctx) => ctx.db.insert("users", { email: "named@example.com", name: "Akhil", eligible: true }));
  const placesBodies: any[] = [];
  const chatRequests: any[] = [];
  const webRequests: any[] = [];
  const pageUrls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(init.body) : undefined;
    if (u.includes("api.openai.com/v1/responses")) {
      webRequests.push(body);
      const next = o.web?.shift();
      if (next === undefined) throw new Error("unexpected web lookup");
      return json(next);
    }
    if (u.includes("api.openai.com")) {
      if (body.tools) {
        chatRequests.push(body);
        const next = o.chat.shift();
        if (next === undefined) throw new Error("unexpected chat model call");
        return json(next);
      }
      if (body.response_format?.type === "json_object") {
        const next = o.intake?.shift();
        if (next === undefined) throw new Error("unexpected intake call");
        return json({ choices: [{ message: { content: JSON.stringify(next) } }] });
      }
      return json({ choices: [{ message: { content: '{"kind":"service","query":"ESG consultants"}' } }] });
    }
    if (u.includes("geocode")) return json({ status: "OK", results: [{ types: ["sublocality"], address_components: [{ long_name: "Hyderabad", short_name: "Hyderabad", types: ["locality"] }, { short_name: "IN", types: ["country", "political"] }], geometry: { location: { lat: 17.49, lng: 78.35 } } }] });
    if (u.includes("places:searchText")) {
      placesBodies.push(body);
      return json({ places: o.places?.shift() ?? [] });
    }
    if (o.pages && u in o.pages) {
      pageUrls.push(u);
      return new Response(o.pages[u], { status: 200, headers: { "content-type": "text/html" } });
    }
    throw new Error(`unexpected fetch ${u}`);
  }));
  return { t, user: t.withIdentity({ subject: id }), placesBodies, chatRequests, webRequests, pageUrls };
}
const webReply = (results: unknown[], cite = "https://ainapur.example.in/contact") => ({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ results }), annotations: [{ type: "url_citation", url: cite }] }] }] });

it("'Something else' gets one open follow-up with no choices and no model call; the typed answer goes to the brief", async () => {
  const { t, user, chatRequests } = await setup({
    chat: [tool("ask_brief", { request: "I want you to call ainapur consultants and engineers" }), tool("ask_brief", { answer: "Ask about ESG and Sustainability services" })],
    intake: [
      { status: "question", question: "What do you want to ask Ainapur Consultants and Engineers?", choices: ["Ask about services offered", "Ask about consultation fees", "Something else"] },
      { status: "question", question: "Which area are you in?", choices: [] },
    ],
  });
  const first = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers" });
  const before = chatRequests.length;
  const escape = await user.action(api.chat.send, { chatId: first.chatId, text: "Something else" });
  expect(escape.messages.map((m: any) => [m.kind, m.text])).toEqual([["text", "Sure. Type what you’d like us to ask, in your own words."]]);
  expect(chatRequests.length).toBe(before); // no model call, no new choice list
  const typed = await user.action(api.chat.send, { chatId: first.chatId, text: "Ask about ESG and Sustainability services" });
  expect(typed.messages[0]).toMatchObject({ kind: "question", text: "Which area are you in?" });
  const brief = (await t.run((ctx) => ctx.db.query("briefs").collect()))[0];
  expect(brief.turns.map((x) => x.answer)).toEqual(["Ask about ESG and Sustainability services", undefined]);
});

it("ask_brief refuses an escape answer the model passes on, so no second choice list is made", async () => {
  const { user, chatRequests } = await setup({
    chat: [tool("ask_brief", { request: "call ainapur" }), tool("ask_brief", { answer: "Other" }), say("Sure, type it in your own words.")],
    intake: [{ status: "question", question: "Which service?", choices: ["Audit", "Design"] }],
  });
  const first = await user.action(api.chat.send, { text: "call ainapur" });
  // Typed (not tapped) "other": goes through the model, whose ask_brief call is refused before any intake call.
  const out = await user.action(api.chat.send, { chatId: first.chatId, text: "other please" });
  expect(out.messages.map((m: any) => m.kind)).toEqual(["text"]);
  expect(JSON.parse(chatRequests.at(-1).messages.at(-1).content).error).toContain("type it in their own words");
});

async function readyEsgChat(o: Omit<Opts, "chat" | "intake"> & { chat: unknown[] }) {
  const ready = { status: "ready", summary: "Ask Ainapur Consultants and Engineers about ESG services.", brief: esgBrief };
  // The second reply is for the contacts brief a web result starts (D148 path).
  const env = await setup({ ...o, chat: [tool("ask_brief", { request: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" }), ...o.chat], intake: [ready, ready] });
  return env;
}

it("find_businesses passes business_name to Google and shows only matching listings, titled with the name", async () => {
  const { user, placesBodies, t } = await readyEsgChat({
    chat: [tool("find_businesses", { business_name: "Ainapur Consultants and Engineers", location: "500049" })],
    places: [[place("p1", "AINAPUR CONSULTANTS & ENGINEERS"), place("p2", "SG Analytics")]],
  });
  const out = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" });
  const picker = out.messages.find((m: any) => m.kind === "picker");
  expect(picker.text).toBe("Matches for “Ainapur Consultants and Engineers” near Miyapur");
  expect(picker.payload.businessName).toBe("Ainapur Consultants and Engineers");
  expect(placesBodies[0].textQuery).toBe("Ainapur Consultants and Engineers");
  const draft = await user.query(api.drafts.get, { draftId: picker.payload.draftId });
  expect(draft.shops.map((s: any) => s.name)).toEqual(["AINAPUR CONSULTANTS & ENGINEERS"]);
  expect(await t.run((ctx) => ctx.db.query("tasks").collect())).toHaveLength(0);
});

it("a generic search uses a short phrase, never the summary sentence, when the classifier fails", async () => {
  const { user, placesBodies } = await readyEsgChat({ chat: [tool("find_businesses", { location: "500049" })], places: [[place("p1", "Green ESG Advisors")]] });
  vi.stubEnv("OPENAI_SEARCH_MODEL", "x");
  // Classifier reply unusable → offline fallback.
  const realFetch = globalThis.fetch as any;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    if (String(url).includes("api.openai.com/v1/chat") && body && !body.tools && !body.response_format) return json({ choices: [{ message: { content: 42 } }] });
    return realFetch(url, init);
  }));
  const out = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" });
  expect(out.messages.find((m: any) => m.kind === "picker").text).toBe("1 office near 500049");
  expect(placesBodies[0].textQuery).toBe("ESG and Sustainability services near me");
});

it("not on Google: the web lookup's uncited number is dropped and Luna asks for the phone number; no unrelated card", async () => {
  const { user, placesBodies, webRequests, t } = await readyEsgChat({
    chat: [tool("find_businesses", { business_name: "Ainapur Consultants and Engineers" })],
    places: [[place("p2", "SG Analytics")], [place("p3", "Falcon Resilient Infra Consultants")]],
    web: [webReply([{ name: "Ainapur Consultants and Engineers", phones: ["98765 43210"], address: "", source_url: "https://ainapur.example.in/contact" }])],
    pages: { "https://ainapur.example.in/contact": "<p>Ainapur Consultants and Engineers. Call 040 2345 6789</p>" },
  });
  const out = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" });
  expect(out.messages.map((m: any) => m.kind)).toEqual(["brief", "text"]);
  expect(out.messages[1].text).toBe("I couldn’t find Ainapur Consultants and Engineers on Google or the web near Miyapur. If you have their phone number, send it and I’ll set up the call. Or I can look for other offices nearby.");
  expect(placesBodies.map((b) => b.textQuery)).toEqual(["Ainapur Consultants and Engineers", "Ainapur Consultants and Engineers Hyderabad"]);
  expect(webRequests[0].tools).toEqual([{ type: "web_search", search_context_size: "medium" }]);
  expect(await t.run((ctx) => ctx.db.query("drafts").collect())).toHaveLength(0);
});

it("not on Google, found on the web with the number on the page: a supplied-contacts card through contacts.prepare", async () => {
  const { user, t, pageUrls } = await readyEsgChat({
    chat: [tool("find_businesses", { business_name: "Ainapur Consultants and Engineers" })],
    places: [[], []],
    web: [webReply([{ name: "Ainapur Consultants & Engineers", phones: ["040-2345 6789"], address: "Miyapur, Hyderabad", source_url: "https://ainapur.example.in/contact" }])],
    pages: { "https://ainapur.example.in/contact": "<p>Ainapur Consultants &amp; Engineers</p><p>Phone: 040 2345 6789</p>" },
  });
  const out = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" });
  const picker = out.messages.find((m: any) => m.kind === "picker");
  expect(picker.text).toBe("Web results for “Ainapur Consultants and Engineers”");
  expect(pageUrls).toEqual(["https://ainapur.example.in/contact"]);
  const draft = await user.query(api.drafts.get, { draftId: picker.payload.draftId });
  expect(draft.source).toBe("supplied");
  expect(draft.attribution).toBeUndefined();
  expect(draft.shops).toMatchObject([{ name: "Ainapur Consultants & Engineers", phone: "+914023456789", source: "assistant", sourceUrl: "https://ainapur.example.in/contact" }]);
  // The D148 path: a new brief holding the contacts, carrying the earlier request.
  const briefs = await t.run((ctx) => ctx.db.query("briefs").collect());
  expect(briefs).toHaveLength(2);
  expect(briefs[1].contacts?.[0]).toMatchObject({ phone: "+914023456789", source: "assistant" });
  expect(await t.run((ctx) => ctx.db.query("tasks").collect())).toHaveLength(0);
});

it("search_web skips Google and goes straight to the web", async () => {
  const { user, placesBodies, webRequests } = await readyEsgChat({
    chat: [tool("find_businesses", { business_name: "Ainapur Consultants and Engineers", search_web: true })],
    web: [webReply([])],
  });
  const out = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" });
  expect(out.messages.at(-1).text).toContain("on Google or the web near Miyapur");
  expect(placesBodies).toHaveLength(0);
  expect(webRequests).toHaveLength(1);
});

it("small talk after a ready card never searches", async () => {
  const { user, placesBodies, chatRequests } = await readyEsgChat({
    chat: [tool("find_businesses", { location: "500049" }), tool("find_businesses", { location: "Miyapur" }), say("Hi! Pick from the list above when you're ready.")],
    places: [[place("p1", "Green ESG Advisors")]],
  });
  const first = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" });
  const searches = placesBodies.length;
  const hi = await user.action(api.chat.send, { chatId: first.chatId, text: "hi" });
  expect(hi.messages.map((m: any) => m.kind)).toEqual(["text"]);
  expect(placesBodies.length).toBe(searches);
  expect(JSON.parse(chatRequests.at(-1).messages.at(-1).content).error).toContain("small talk");
});

it("a customer's list of names and numbers becomes a brief with contacts and a card to pick from; invented numbers are refused", async () => {
  const text = "call these and ask if they do ESG audits: Ainapur Consultants 98765 43210, Green Labs 040-2345 6789";
  const { user, t, chatRequests } = await setup({
    chat: [
      tool("use_contacts", { contacts: [{ name: "Ainapur Consultants", phone: "98765 43210" }, { name: "Green Labs", phone: "9123456789" }], request: "Ask if they do ESG audits" }),
      tool("use_contacts", { contacts: [{ name: "Ainapur Consultants", phone: "98765 43210" }, { name: "Green Labs", phone: "040-2345 6789" }], request: "Ask if they do ESG audits" }),
    ],
    intake: [{ status: "ready", summary: "Ask if they do ESG audits.", brief: { ...esgBrief, task_type: "ESG audit enquiry" } }],
  });
  const out = await user.action(api.chat.send, { text });
  expect(JSON.parse(chatRequests[1].messages.at(-1).content).error).toContain("not in the customer's messages");
  expect(out.messages.map((m: any) => m.kind)).toEqual(["brief", "picker"]);
  const picker = out.messages[1];
  expect(picker.text).toBe("2 businesses you sent");
  const draft = await user.query(api.drafts.get, { draftId: picker.payload.draftId });
  expect(draft.source).toBe("supplied");
  expect(draft.shops.map((s: any) => [s.name, s.phone, s.source])).toEqual([["Ainapur Consultants", "+919876543210", "customer"], ["Green Labs", "+914023456789", "customer"]]);
  expect(await t.run((ctx) => ctx.db.query("tasks").collect())).toHaveLength(0);
});

it("a phone number after not-found continues the same request with that contact", async () => {
  const { user, t } = await setup({
    chat: [
      tool("ask_brief", { request: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" }),
      tool("find_businesses", { business_name: "Ainapur Consultants and Engineers" }),
      tool("use_contacts", { contacts: [{ name: "Ainapur Consultants and Engineers", phone: "9876543210" }] }),
    ],
    intake: [
      { status: "ready", summary: "Ask Ainapur about ESG services.", brief: esgBrief },
      { status: "ready", summary: "Ask Ainapur about ESG services.", brief: esgBrief },
    ],
    places: [[], []],
    web: [webReply([])],
  });
  const first = await user.action(api.chat.send, { text: "I want you to call ainapur consultants and engineers, ask about ESG services, I am in Miyapur 500049" });
  expect(first.messages.at(-1).text).toContain("send it and I’ll set up the call");
  const out = await user.action(api.chat.send, { chatId: first.chatId, text: "their number is 9876543210" });
  expect(out.messages.map((m: any) => m.kind)).toEqual(["brief", "picker"]);
  expect(out.messages[1].text).toBe("1 office you sent");
  const briefs = await t.run((ctx) => ctx.db.query("briefs").collect());
  expect(briefs[1].request).toContain("I want you to call ainapur consultants and engineers");
  expect(await t.run((ctx) => ctx.db.query("tasks").collect())).toHaveLength(0);
});
