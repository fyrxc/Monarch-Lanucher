import { expect, it } from "vitest";
import {
  MONARCH_LOGO_DATA_URL,
  MONARCH_M_LOGO_DATA_URL,
  MONARCH_WORDMARK_DATA_URL,
} from "../lib/branding";

it("uses the transparent Monarch M as the primary launcher and fallback logo", () => {
  expect(MONARCH_M_LOGO_DATA_URL).toMatch(/^data:image\/png;base64,/);
  expect(MONARCH_WORDMARK_DATA_URL).toMatch(/^data:image\/png;base64,/);
  expect(MONARCH_LOGO_DATA_URL).toBe(MONARCH_M_LOGO_DATA_URL);
  expect(MONARCH_M_LOGO_DATA_URL).not.toBe(MONARCH_WORDMARK_DATA_URL);
});
