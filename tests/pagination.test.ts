import { describe, expect, it } from "vitest";
import { paginate } from "../lib/pagination";

describe("paginate", () => {
  it("returns only the requested 100-row page", () => {
    const values = Array.from({ length: 250 }, (_, index) => index + 1);
    const result = paginate(values, 2, 100);

    expect(result.items).toHaveLength(100);
    expect(result.items[0]).toBe(101);
    expect(result.items[99]).toBe(200);
    expect(result.pageCount).toBe(3);
    expect(result.total).toBe(250);
  });

  it("clamps a page that is past the end", () => {
    const result = paginate([1, 2, 3], 9, 100);

    expect(result.page).toBe(1);
    expect(result.items).toEqual([1, 2, 3]);
  });
});
