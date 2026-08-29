import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function writeBase64Asset(source, destination) {
  const encoded = readFileSync(source, "utf8").trim();
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, Buffer.from(encoded, "base64"));
}

export function materializeAssets(root = process.cwd()) {
  writeBase64Asset(
    join(root, "assets", "header-click.ogg.b64"),
    join(root, "public", "sounds", "header-click.ogg"),
  );
}

const invokedPath = process.argv[1];
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  materializeAssets();
}
