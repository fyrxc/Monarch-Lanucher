import { pathToFileURL } from "node:url";

export function resolveVersion(runNumber) {
  if (!/^\d+$/.test(runNumber ?? "")) {
    throw new Error("numeric GitHub run number required");
  }

  return `0.4.${runNumber}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(resolveVersion(process.argv[2]));
}
