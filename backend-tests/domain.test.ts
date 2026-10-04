import { describe, it, expect } from "vitest";
import {
  rankShops,
  nextOutcome,
  validateSelection,
  isRetailCandidate,
} from "../convex/domain";
describe("shop calling rules", () => {
  it("excludes repair-only listings while retaining mixed sales and service shops", () => {
    expect(
      isRetailCandidate({
        name: "Apple Premium Service Center",
        primaryType: "electronics_store",
      }),
    ).toBe(false);
    expect(isRetailCandidate({ name: "iCare Apple Premium Solutions" })).toBe(
      false,
    );
    expect(
      isRetailCandidate({
        name: "City Mobile Repair",
        primaryType: "repair_service",
      }),
    ).toBe(false);
    expect(
      isRetailCandidate({ name: "City Mobile Sales and Service Center" }),
    ).toBe(true);
    expect(isRetailCandidate({ name: "Aptronix Apple Premium Reseller" })).toBe(
      true,
    );
  });
  it("keeps highly rated shops with sufficient reviews first and hides low evidence shops", () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      placeId: String(i),
      rating: 4 + i / 10,
      ratingCount: 100,
    }));
    expect(
      rankShops([...rows, { placeId: "few", rating: 5, ratingCount: 3 }]).map(
        (x) => x.placeId,
      ),
    ).toEqual(["5", "4", "3", "2", "1", "0"]);
  });
  it("fills five shops when too few have enough reviews", () => {
    expect(
      rankShops([
        { placeId: "a", rating: 4, ratingCount: 100 },
        { placeId: "b", rating: 5, ratingCount: 2 },
      ]).map((x) => x.placeId),
    ).toEqual(["a", "b"]);
  });
  it("retries only first unanswered AI call and never answered disconnects", () => {
    expect(nextOutcome("unanswered", 1)).toBe("retry_scheduled");
    expect(nextOutcome("unanswered", 2)).toBe("unreachable");
    expect(nextOutcome("disconnected", 1)).toBe("personal_call_needed");
    expect(nextOutcome("refused", 1)).toBe("personal_call_needed");
    expect(nextOutcome("completed", 1)).toBe("answered");
  });
  it("rejects empty, duplicate and unapproved shop selection", () => {
    expect(() => validateSelection([], ["a"])).toThrow();
    expect(() => validateSelection(["a", "a"], ["a"])).toThrow();
    expect(() => validateSelection(["b"], ["a"])).toThrow();
    expect(validateSelection(["a"], ["a"])).toEqual(["a"]);
  });
});
