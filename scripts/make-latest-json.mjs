import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const requiredVariables = ["MONARCH_VERSION", "MONARCH_RELEASE_URL", "MONARCH_NOTES"];

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function createLatestMetadata(env, now = new Date()) {
  for (const name of requiredVariables) required(env, name);

  const signature = env.MONARCH_SIGNATURE?.trim() ?? "";
  const platforms = signature
    ? {
        "windows-x86_64": {
          signature,
          url: required(env, "MONARCH_RELEASE_URL"),
        },
      }
    : {};

  return {
    version: required(env, "MONARCH_VERSION"),
    notes: required(env, "MONARCH_NOTES"),
    pub_date: now.toISOString(),
    platforms,
  };
}

export function writeLatestJson(
  env,
  outputPath = join(process.cwd(), "release", "latest.json"),
  now = new Date(),
) {
  const metadata = createLatestMetadata(env, now);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeLatestJson(process.env);
}
