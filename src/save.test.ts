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

  it("gives old saves a run id and an unsubmitted hall of fame state", () => {
    const old = JSON.parse(serializeGame(newGame(123)));
    delete old.game.run.runId;
    delete old.game.submitted;
    const parsed = parseSavedGame(JSON.stringify(old));
    expect(parsed?.run.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(parsed?.submitted).toBe(false);
  });

  it("keeps runId and submitted of a finished run and rejects invalid values", () => {
    const finished = newGame(123);
    finished.phase = "finished";
    finished.run.lives = 0;
    finished.submitted = true;
    expect(parseSavedGame(serializeGame(finished))).toEqual(finished);

    expect(parseSavedGame(serializeGame({ ...finished, submitted: "yes" as unknown as boolean }))).toBeNull();
    expect(parseSavedGame(serializeGame({ ...finished, run: { ...finished.run, runId: "" } }))).toBeNull();
    // Only a finished run can have been submitted.
    expect(parseSavedGame(serializeGame({ ...newGame(123), submitted: true }))).toBeNull();
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
