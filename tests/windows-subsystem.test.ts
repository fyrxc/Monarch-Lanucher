import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("builds release launcher as a Windows GUI app without a console window", () => {
  const main = readFileSync("src-tauri/src/main.rs", "utf8");

  expect(main).toContain(
    '#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]',
  );
});

it("runs Steam registry detection without opening a console window", () => {
  const steam = readFileSync("src-tauri/src/steam.rs", "utf8");

  expect(steam).toContain("CREATE_NO_WINDOW");
  expect(steam).toContain("creation_flags(CREATE_NO_WINDOW)");
});
