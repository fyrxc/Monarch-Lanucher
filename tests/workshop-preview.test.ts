import { expect, it } from "vitest";
import { isDefaultWorkshopPreviewHash } from "../lib/workshop-preview";

it("recognizes the default DayZ Workshop preview image hash", () => {
  expect(isDefaultWorkshopPreviewHash("377770033e0d0f46")).toBe(true);
  expect(isDefaultWorkshopPreviewHash("377770033e0d0f47")).toBe(true);
  expect(isDefaultWorkshopPreviewHash("0123456789abcdef")).toBe(false);
});
