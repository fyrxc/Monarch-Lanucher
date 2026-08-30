import { pathToFileURL } from "node:url";

export function decodeUpdaterPublicKey(value) {
  const encoded = String(value ?? "").trim();
  if (
    !encoded ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    throw new Error("Updater public key must be valid Base64.");
  }

  const bytes = Buffer.from(encoded, "base64");
  const canonical = bytes.toString("base64");
  if (canonical !== encoded) {
    throw new Error("Updater public key must be valid Base64.");
  }

  const decoded = bytes.toString("utf8").replace(/\r\n/g, "\n").trim();
  const lines = decoded.split("\n");
  if (
    lines.length !== 2 ||
    !/^untrusted comment: minisign public key: [0-9A-Fa-f]{16}$/.test(lines[0]) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(lines[1])
  ) {
    throw new Error("Decoded value is not a Minisign public key.");
  }

  return decoded;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(`${decodeUpdaterPublicKey(process.argv[2])}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
