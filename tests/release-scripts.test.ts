import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveVersion } from "../scripts/resolve-version.mjs";
import { writeLatestJson } from "../scripts/make-latest-json.mjs";

describe("release scripts", () => {
  it("resolves GitHub run numbers into deterministic 0.4.x versions", () => {
    expect(resolveVersion("77")).toBe("0.4.77");
    expect(() => resolveVersion("abc")).toThrow(/numeric GitHub run number required/i);
    expect(() => resolveVersion("")).toThrow(/numeric GitHub run number required/i);
  });

  it("writes exact Windows updater URL and signature into latest.json", () => {
    const root = mkdtempSync(join(tmpdir(), "monarch-release-"));
    const output = join(root, "latest.json");

    writeLatestJson(
      {
        MONARCH_VERSION: "0.4.77",
        MONARCH_RELEASE_URL:
          "https://github.com/fyrxc/Monarch-Lanucher/releases/download/v0.4.77/MonarchLauncher-Setup.exe",
        MONARCH_SIGNATURE: "signed-payload",
        MONARCH_NOTES: "Release 0.4.77",
      },
      output,
      new Date("2026-08-28T23:00:00.000Z"),
    );

    const metadata = JSON.parse(readFileSync(output, "utf8"));
    expect(metadata.version).toBe("0.4.77");
    expect(metadata.pub_date).toBe("2026-08-28T23:00:00.000Z");
    expect(metadata.platforms["windows-x86_64"]).toEqual({
      signature: "signed-payload",
      url: "https://github.com/fyrxc/Monarch-Lanucher/releases/download/v0.4.77/MonarchLauncher-Setup.exe",
    });
  });

  it("injects the updater public key into Tauri config before signed release builds", () => {
    const workflow = readFileSync(
      join(process.cwd(), ".github", "workflows", "release.yml"),
      "utf8",
    );

    expect(workflow).toContain(
      "$config.plugins.updater.pubkey = $env:MONARCH_UPDATER_PUBLIC_KEY",
    );
  });
});
