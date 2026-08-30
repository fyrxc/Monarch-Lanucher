import { describe, expect, it } from "vitest";
import { filterServers, type ServerFilters } from "@/lib/filters";
import type { DayzServer } from "@/lib/models";

const monarch: DayzServer = {
  id: "monarch-1",
  name: "Monarch EU | 1PP",
  map: "chernarusplus",
  players: 42,
  capacity: 100,
  ping: 45,
  ip: "1.2.3.4",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: true,
  country: "US",
  requiredWorkshopIds: ["1559212036"]
};

const emptyVanilla: DayzServer = {
  ...monarch,
  id: "vanilla-1",
  name: "Vanilla Community",
  map: "enoch",
  players: 0,
  ping: null,
  ip: "5.6.7.8",
  gamePort: 2402,
  queryPort: 2403,
  firstPersonOnly: false,
  requiredWorkshopIds: []
};

const defaults: ServerFilters = {
  search: "",
  map: "",
  minPlayers: null,
  maxPlayers: null,
  maxPing: null,
  hideEmpty: false,
  hideFull: false,
  modded: null,
  passworded: null,
  official: null,
  firstPersonOnly: null,
  favoritesOnly: false
};

describe("filterServers", () => {
  it("matches text across name map and address", () => {
    expect(filterServers([monarch, emptyVanilla], { ...defaults, search: "monarch" })).toEqual([monarch]);
    expect(filterServers([monarch, emptyVanilla], { ...defaults, search: "chernarus" })).toEqual([monarch]);
    expect(filterServers([monarch, emptyVanilla], { ...defaults, search: "1.2.3.4:2302" })).toEqual([monarch]);
  });

  it("applies player ping and map filters without rejecting unknown ping", () => {
    expect(filterServers([monarch, emptyVanilla], { ...defaults, map: "chernarusplus", minPlayers: 40, maxPlayers: 50, maxPing: 50 })).toEqual([monarch]);
    expect(filterServers([emptyVanilla], { ...defaults, maxPing: 20 })).toEqual([emptyVanilla]);
  });

  it("applies empty full and tri-state server filters", () => {
    expect(filterServers([monarch, emptyVanilla], { ...defaults, hideEmpty: true })).toEqual([monarch]);
    expect(filterServers([monarch, emptyVanilla], { ...defaults, modded: true })).toEqual([monarch]);
    expect(filterServers([monarch, emptyVanilla], { ...defaults, modded: false })).toEqual([emptyVanilla]);
    expect(filterServers([monarch, emptyVanilla], { ...defaults, firstPersonOnly: true })).toEqual([monarch]);
  });

  it("limits results to favorite ids when requested", () => {
    expect(filterServers([monarch, emptyVanilla], { ...defaults, favoritesOnly: true }, new Set(["monarch-1"]))).toEqual([monarch]);
  });

  it("moves favorites to the top while preserving order inside each group", () => {
    expect(
      filterServers([emptyVanilla, monarch], defaults, new Set(["monarch-1"])),
    ).toEqual([monarch, emptyVanilla]);
  });
});
