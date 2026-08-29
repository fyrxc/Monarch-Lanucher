import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ModPreview } from "../components/mod-preview";
import { MONARCH_M_LOGO_DATA_URL } from "../lib/branding";
import { isDefaultDayzWorkshopPreview } from "../lib/workshop-preview";

vi.mock("../lib/workshop-preview", () => ({
  isDefaultDayzWorkshopPreview: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(isDefaultDayzWorkshopPreview).mockReset();
});

it("replaces the generic DayZ Workshop preview with the Monarch M", () => {
  vi.mocked(isDefaultDayzWorkshopPreview).mockReturnValue(true);
  render(
    <ModPreview
      previewUrl="https://steam.example/default-workshop.jpg"
      imageClassName="preview-image"
      fallbackClassName="preview-fallback"
    />,
  );

  const workshopImage = screen.getByTestId("workshop-preview");
  fireEvent.load(workshopImage);

  expect(screen.queryByTestId("workshop-preview")).not.toBeInTheDocument();
  const fallback = screen.getByRole("img", { name: "Monarch logo fallback" });
  expect(fallback.querySelector("img")).toHaveAttribute("src", MONARCH_M_LOGO_DATA_URL);
});

it("keeps a custom Workshop preview", () => {
  vi.mocked(isDefaultDayzWorkshopPreview).mockReturnValue(false);
  render(
    <ModPreview
      previewUrl="https://steam.example/custom.jpg"
      imageClassName="preview-image"
      fallbackClassName="preview-fallback"
    />,
  );

  const workshopImage = screen.getByTestId("workshop-preview");
  fireEvent.load(workshopImage);

  expect(workshopImage).toHaveAttribute("src", "https://steam.example/custom.jpg");
  expect(screen.queryByRole("img", { name: "Monarch logo fallback" })).not.toBeInTheDocument();
});
