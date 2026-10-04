export function rankShops<
  T extends { placeId: string; rating?: number; ratingCount: number },
>(shops: T[]): T[] {
  const unique = [...new Map(shops.map((s) => [s.placeId, s])).values()];
  const sort = (a: T, b: T) =>
    (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount;
  const strong = unique.filter((s) => s.ratingCount >= 50).sort(sort);
  return strong.length >= 5
    ? strong
    : [
        ...strong,
        ...unique
          .filter((s) => s.ratingCount < 50)
          .sort(sort)
          .slice(0, 5 - strong.length),
      ];
}
export function isRetailCandidate(shop: {
  name: string;
  primaryType?: string;
}) {
  const retail =
    /\b(sales|retail|reseller|store|shop|dealer|showroom|mart)\b/i.test(
      shop.name,
    );
  const repairOnly =
    /\brepair|service\s*(centre|center)|\biCare\b.*\bApple Premium Solutions\b/i.test(
      shop.name,
    ) || /repair|service_center/.test(shop.primaryType ?? "");
  return !repairOnly || retail;
}
export function nextOutcome(status: string, attempt: number) {
  if (status === "unanswered")
    return attempt === 1 ? "retry_scheduled" : "unreachable";
  if (status === "disconnected" || status === "refused")
    return "personal_call_needed";
  if (status === "completed") return "answered";
  if (status === "incomplete") return "incomplete_answer";
  return "technical_error";
}
export function validateSelection(selected: string[], allowed: string[]) {
  if (!selected.length) throw new Error("Pick at least one shop.");
  if (selected.length > 20)
    throw new Error("Pick up to 20 shops for one request.");
  if (new Set(selected).size !== selected.length)
    throw new Error("Duplicate shops are not allowed.");
  if (selected.some((x) => !allowed.includes(x)))
    throw new Error("A selected shop does not belong to this search.");
  return selected;
}
