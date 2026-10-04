import { v } from "convex/values";
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
  address: v.string(),
  area: v.optional(v.string()),
  phone: v.optional(v.string()),
  rating: v.optional(v.number()),
  ratingCount: v.number(),
  distanceKm: v.number(),
  hours: v.optional(v.string()),
  mapsUrl: v.string(),
  fewRatings: v.boolean(),
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
