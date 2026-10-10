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

// Why a shop's held credit was returned. Same wording as web/src/taskPresentation.ts.
export function notChargedReason(state?: string) {
  return state === 'unreachable' ? 'shop didn’t answer' : state === 'personal_call_needed' ? 'shop prefers a personal call' : state === 'technical_error' || state === 'failed' ? 'call didn’t finish' : 'didn’t answer what you asked';
}

export type BriefItem = { id: string; text: string; kind: "must_confirm" | "deciding" | "nice_to_have" };
export type ItemResult = BriefItem & { status: "answered" | "conditional" | "not_answered"; answer?: string; quote?: string };

/** Questions the call must answer, from the brief. Ids: m1.., d, n1.. */
export function briefItems(brief?: {
  expected_outcome: { must_confirm: string[]; nice_to_have: string[]; deciding_question: string | null };
}): BriefItem[] {
  if (!brief) return [];
  const clean = (t: string) => t.trim().slice(0, 300);
  const items: BriefItem[] = brief.expected_outcome.must_confirm
    .filter((t) => t.trim())
    .slice(0, 6)
    .map((t, i) => ({ id: `m${i + 1}`, text: clean(t), kind: "must_confirm" }));
  const d = brief.expected_outcome.deciding_question;
  if (d && d.trim()) items.push({ id: "d", text: clean(d), kind: "deciding" });
  brief.expected_outcome.nice_to_have
    .filter((t) => t.trim())
    .slice(0, 3)
    .forEach((t, i) => items.push({ id: `n${i + 1}`, text: clean(t), kind: "nice_to_have" }));
  return items;
}

const covered = (i: ItemResult) => i.status !== "not_answered";
const counted = (items: ItemResult[]) => items.filter((i) => i.kind !== "nice_to_have");

/** D150: done when the deciding question or at least one must-confirm item is answered or conditional. */
export function objectiveMet(items: ItemResult[]) {
  return counted(items).some(covered);
}
/** Every counted item has an answer or a condition. */
export function objectiveComplete(items: ItemResult[]) {
  const c = counted(items);
  return c.length > 0 && c.every(covered);
}
/**
 * Whether a finished call is charged. With brief items (D150), the objective rule applies.
 * Without them, the original rule: any confirmed product field or notes (D18, C09).
 */
export function isChargeable(
  state: string,
  answer: { stock: string; finalPrice?: number; notes?: string; offers?: string; items?: ItemResult[] } | undefined,
  hasItems: boolean,
) {
  if (state !== "answered" && state !== "incomplete_answer") return false;
  if (!answer) return false;
  if (hasItems) return objectiveMet(answer.items ?? []);
  return answer.stock !== "unconfirmed" || answer.finalPrice !== undefined || !!answer.notes?.trim() || !!answer.offers?.trim();
}
