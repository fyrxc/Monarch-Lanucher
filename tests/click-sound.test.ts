import { describe, expect, it } from "vitest";
import {
  isClickableTarget,
  LAUNCHER_CLICK_SOUND_URL,
  LAUNCHER_CLICK_VOLUME,
} from "../lib/click-sound";

describe("launcher click sound", () => {
  it("plays for action controls and nested icon targets but not text entry or disabled controls", () => {
    const button = document.createElement("button");
    const icon = document.createElement("span");
    button.appendChild(icon);
    const link = document.createElement("a");
    link.href = "#mods";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const text = document.createElement("input");
    text.type = "text";
    const disabled = document.createElement("button");
    disabled.disabled = true;
    const plain = document.createElement("div");

    expect(isClickableTarget(button)).toBe(true);
    expect(isClickableTarget(icon)).toBe(true);
    expect(isClickableTarget(link)).toBe(true);
    expect(isClickableTarget(checkbox)).toBe(true);
    expect(isClickableTarget(text)).toBe(false);
    expect(isClickableTarget(disabled)).toBe(false);
    expect(isClickableTarget(plain)).toBe(false);
  });

  it("uses the supplied Header_Click_UI MP4 at full launcher volume", () => {
    expect(LAUNCHER_CLICK_SOUND_URL).toBe("/sounds/Header_Click_UI.mp4");
    expect(LAUNCHER_CLICK_VOLUME).toBe(1);
  });
});
