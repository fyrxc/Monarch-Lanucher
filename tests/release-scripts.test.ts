import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeUpdaterPublicKey } from "../scripts/decode-updater-public-key.mjs";
import { resolveVersion } from "../scripts/resolve-version.mjs";
import { writeLatestJson } from "../scripts/make-latest-json.mjs";

describe("release scripts", () => {
  it("resolves GitHub run numbers into deterministic 0.4.x versions", () => {
    expect(resolveVersion("77")).toBe("0.4.77");
    expect(() => resolveVersion("abc")).toThrow(/numeric GitHub run number required/i);
    expect(() => resolveVersion("")).toThrow(/numeric GitHub run number required/i);
  });

  it("decodes and validates the repository updater public key", () => {
    const encoded =
      "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDZFRTMwMjI0Qjc3MTRGREQKUldUZFQzRzNKQUxqYmkwNDhWaG5Lb2UwaWczWnYyRGM0WE92WXp3LzJrc0JJcmRjQ21MaEpPZ20K";

    expect(decodeUpdaterPublicKey(encoded)).toBe(
      "untrusted comment: minisign public key: 6EE30224B7714FDD\n" +
        "RWXdT3G3JALjbi048VhnKoe0ig3Zv2Dc4XOvYzw/2ksBIrdcCmLhJOgm",
    );
    expect(() => decodeUpdaterPublicKey("not-base64")).toThrow(/valid base64/i);
    expect(() => decodeUpdaterPublicKey(Buffer.from("wrong format").toString("base64"))).toThrow(
      /minisign public key/i,
    );
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
});
