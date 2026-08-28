import { render, screen } from "@testing-library/react";
import Page from "../app/page";

it("starts on Servers", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: "Servers" })).toBeInTheDocument();
});
