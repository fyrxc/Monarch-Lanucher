import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { UpdatePanel } from "../components/update-panel";

it("shows Install Update when a newer signed version exists", async () => {
  const api = {
    checkForUpdate: vi.fn().mockResolvedValue({
      available: true,
      currentVersion: "0.4.7",
      latestVersion: "0.4.8",
      notes: "Updater and installer improvements.",
    }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
  };

  render(<UpdatePanel api={api} />);

  fireEvent.click(screen.getByRole("button", { name: /check for updates/i }));

  expect(await screen.findByText("0.4.8")).toBeInTheDocument();
  expect(screen.getByText(/updater and installer improvements/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /install update/i })).toBeInTheDocument();
});
