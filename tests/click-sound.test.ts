import { describe, expect, it } from "vitest";
import { isClickableTarget, LAUNCHER_CLICK_SOUND_URL } from "../lib/click-sound";

describe("launcher click sound", () => {
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

  it("uses the supplied Header_Click_UI ogg instead of a generated beep", () => {
    expect(LAUNCHER_CLICK_SOUND_URL).toBe("/sounds/header-click.ogg");
  });
});
