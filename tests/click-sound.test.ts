import { describe, expect, it } from "vitest";
import { isClickableTarget } from "../lib/click-sound";

describe("launcher click sound target detection", () => {
  it("plays for controls and nested icon targets but not plain content", () => {
    const button = document.createElement("button");
    const icon = document.createElement("span");
    button.appendChild(icon);
    const link = document.createElement("a");
    link.href = "#mods";
    const plain = document.createElement("div");

    expect(isClickableTarget(button)).toBe(true);
    expect(isClickableTarget(icon)).toBe(true);
    expect(isClickableTarget(link)).toBe(true);
    expect(isClickableTarget(plain)).toBe(false);
  });
});
