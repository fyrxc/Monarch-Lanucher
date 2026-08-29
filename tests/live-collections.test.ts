import { describe, expect, it } from "vitest";
import {
  reconcileServerCollection,
  sortServersWithFavoritesFirst,
} from "../lib/live-server-collections";
import type { DayzServer } from "../lib/models";
import { serverIdentity } from "../lib/server-id";

function server(overrides: Partial<DayzServer> = {}): DayzServer {
  return {
    id: "same-server",
    name: "Saved Name",
    map: "chernarusplus",
    players: 2,
    capacity: 60,
    ping: null,
    ip: "10.0.0.10",
    gamePort: 2302,
    queryPort: 2303,
    status: "online",
    isPassworded: false,
    isOfficial: false,
    firstPersonOnly: false,
    country: "US",
    requiredWorkshopIds: ["111"],
    ...overrides,
  };
}

describe("reconcileServerCollection", () => {
  it("replaces saved snapshots with current live server data", () => {
    const saved = server();
    const live = server({
      name: "Live Name",
      players: 30,
      capacity: 60,
      ping: 41,
      map: "enoch",
      firstPersonOnly: true,
      requiredWorkshopIds: ["111", "222"],
    });

    expect(reconcileServerCollection([saved], [live])).toEqual([live]);
  });

  it("keeps the saved snapshot when the live directory cannot resolve it", () => {
    const saved = server({ id: "offline-saved" });
    const unrelated = server({ id: "different-server", players: 45 });

    expect(reconcileServerCollection([saved], [unrelated])).toEqual([saved]);
  });
});

describe("sortServersWithFavoritesFirst", () => {
  it("moves favorites to the top without changing order inside either group", () => {
    const first = server({ id: "first", name: "First" });
    const favoriteOne = server({ id: "fav-1", name: "Favorite One" });
    const middle = server({ id: "middle", name: "Middle" });
    const favoriteTwo = server({ id: "fav-2", name: "Favorite Two" });
    const favorites = new Set([
      serverIdentity(favoriteOne),
      serverIdentity(favoriteTwo),
    ]);

    expect(
      sortServersWithFavoritesFirst(
        [first, favoriteOne, middle, favoriteTwo],
        favorites,
      ).map((item) => item.name),
    ).toEqual(["Favorite One", "Favorite Two", "First", "Middle"]);
  });
});
