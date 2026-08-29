import { expect, it } from "vitest";
import { readServerCache, writeServerCache } from "../lib/server-cache";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "cached-1",
  name: "Cached Server",
  map: "chernarusplus",
  players: 12,
  capacity: 60,
  ping: 30,
  ip: "1.2.3.4",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "",
  requiredWorkshopIds: [],
};

it("persists the last successful server directory for instant launcher startup", () => {
  localStorage.clear();
  writeServerCache([server]);
  expect(readServerCache()).toEqual([server]);
});
