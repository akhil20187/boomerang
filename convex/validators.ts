import { v } from "convex/values";
export const contactV = v.object({
  name: v.string(),
  phone: v.string(),
  source: v.union(v.literal("customer"), v.literal("assistant")),
  sourceUrl: v.optional(v.string()),
  website: v.optional(v.string()),
  address: v.optional(v.string()),
  area: v.optional(v.string()),
  context: v.optional(v.string()),
});
export const recipientSourceV = v.union(v.literal("google"), v.literal("supplied"));
export const productV = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  fetchedAt: v.optional(v.number()),
});
export const shopV = v.object({
  placeId: v.string(),
  name: v.string(),
  address: v.optional(v.string()),
  area: v.optional(v.string()),
  phone: v.optional(v.string()),
  rating: v.optional(v.number()),
  ratingCount: v.optional(v.number()),
  distanceKm: v.optional(v.number()),
  hours: v.optional(v.string()),
  mapsUrl: v.optional(v.string()),
  fewRatings: v.optional(v.boolean()),
  source: v.optional(v.union(v.literal("customer"), v.literal("assistant"))),
  sourceUrl: v.optional(v.string()),
  website: v.optional(v.string()),
  context: v.optional(v.string()),
});
export const itemKindV = v.union(v.literal("must_confirm"), v.literal("deciding"), v.literal("nice_to_have"));
/** A question from the brief that the call had to answer. */
export const briefItemV = v.object({ id: v.string(), text: v.string(), kind: itemKindV });
/** What the shop said for one brief item. */
export const itemResultV = v.object({
  id: v.string(),
  text: v.string(),
  kind: itemKindV,
  status: v.union(v.literal("answered"), v.literal("conditional"), v.literal("not_answered")),
  answer: v.optional(v.string()),
  quote: v.optional(v.string()),
});
export const answerV = v.object({
  stock: v.union(
    v.literal("available"),
    v.literal("unavailable"),
    v.literal("unconfirmed"),
  ),
  finalPrice: v.optional(v.number()),
  currency: v.optional(v.string()),
  offers: v.optional(v.string()),
  notes: v.optional(v.string()),
  variantMatch: v.optional(
    v.union(v.literal("yes"), v.literal("no"), v.literal("unconfirmed")),
  ),
  items: v.optional(v.array(itemResultV)),
});
export const jobStateV = v.union(
  ...[
    "reconciling",
    "waiting",
    "calling",
    "retry_scheduled",
    "answered",
    "unreachable",
    "personal_call_needed",
    "incomplete_answer",
    "technical_error",
  ].map((x) => v.literal(x)),
);
export const terminalStates = new Set([
  "answered",
  "unreachable",
  "personal_call_needed",
  "incomplete_answer",
  "technical_error",
]);
export const briefV = v.object({
  task_type: v.string(),
  task_context: v.object({
    summary: v.string(),
    known: v.array(v.object({ fact: v.string(), value: v.string() })),
    unknown: v.array(v.object({ fact: v.string(), fallback: v.string() })),
    share_only_if_asked: v.array(v.string()),
  }),
  call_purpose: v.string(),
  expected_outcome: v.object({
    must_confirm: v.array(v.string()),
    nice_to_have: v.array(v.string()),
    deciding_question: v.union(v.string(), v.null()),
  }),
  representing: v.object({
    name: v.string(),
    kind: v.union(v.literal("personal"), v.literal("organisation")),
    caller_name: v.string(),
  }),
  authority: v.object({
    enquiry_only: v.literal(true),
    may_share_customer_contact: v.literal(false),
    may_schedule: v.literal(false),
    follow_up: v.string(),
  }),
  in_call_rules: v.array(v.string()),
  deadline: v.object({
    date: v.union(v.string(), v.null()),
    start_assumption: v.union(v.string(), v.null()),
  }),
  // D159 (optional, older briefs have none): area said on the call; building name only if the business asks.
  location: v.optional(
    v.object({
      home_visit: v.boolean(),
      area: v.union(v.string(), v.null()),
      building_if_asked: v.union(v.string(), v.null()),
    }),
  ),
});
