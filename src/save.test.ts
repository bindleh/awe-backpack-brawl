import { describe, expect, it } from "vitest";
import { newGame, startBattle, startSearch } from "./game";
import { normalizeSavedGame, parseSavedGame, serializeGame } from "./save";

describe("B6 save and resume", () => {
  it("round-trips a playable shop save", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
    game.run.nextUid = 2;
    expect(parseSavedGame(serializeGame(game))).toEqual(game);
  });

  it("falls back from a malformed or incompatible save", () => {
    expect(parseSavedGame("{not-json")).toBeNull();
    expect(parseSavedGame(JSON.stringify({ version: 999, game: {} }))).toBeNull();
  });

  it("normalizes an interrupted search back to the shop", () => {
    const shop = newGame(123);
    shop.run.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
    shop.run.nextUid = 2;
    const started = startSearch(shop);
    const normalized = normalizeSavedGame(started);
    expect(normalized.phase).toBe("shop");
    expect(normalized.battle).toBeNull();
  });

  it("preserves the same battle replay across serialization", () => {
    const shop = newGame(123);
    shop.run.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
    shop.run.nextUid = 2;
    const opponent = { id: "test", name: "Test", icon: "🐢", hp: 25, round: 1, items: ["pot-lid"] };
    const battle = startBattle(startSearch(shop), opponent, 1);
    const serialized = serializeGame(battle);
    const parsed = parseSavedGame(serialized);
    expect(parsed?.phase).toBe("battle");
    expect(parsed?.battle?.opponent).toEqual(opponent);
  });

  it("drops a pre-Poison battle save but still loads its shop save", () => {
    const shop = newGame(123);
    shop.run.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
    shop.run.nextUid = 2;
    const opponent = { id: "test", name: "Test", icon: "🐢", hp: 25, round: 1, items: ["pot-lid"] };
    const battle = startBattle(startSearch(shop), opponent, 1);
    const old = JSON.parse(serializeGame(battle));
    for (const frame of old.game.battle.result.frames) {
      delete frame.player.poison;
      delete frame.opponent.poison;
    }
    expect(parseSavedGame(JSON.stringify(old))).toBeNull();
    expect(parseSavedGame(serializeGame(shop))).not.toBeNull();
  });

  it("loads old saves without searchId and rejects invalid ones", () => {
    const game = newGame(123);
    const old = JSON.parse(serializeGame(game));
    delete old.game.searchId;
    expect(parseSavedGame(JSON.stringify(old))?.searchId).toBe(0);
    old.game.searchId = -1;
    expect(parseSavedGame(JSON.stringify(old))).toBeNull();
    old.game.searchId = 1.5;
    expect(parseSavedGame(JSON.stringify(old))).toBeNull();
  });

  it("rejects impossible shop and finished states", () => {
    const impossible = newGame(123);
    impossible.run.gold = -1;
    expect(parseSavedGame(serializeGame(impossible))).toBeNull();

    const finished = newGame(123);
    finished.phase = "finished";
    expect(parseSavedGame(serializeGame(finished))).toBeNull();
  });
});
