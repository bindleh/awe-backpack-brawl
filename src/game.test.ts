import { describe, expect, it } from "vitest";
import { fightBlocker, markSubmitted, newGame, searchFailed, skipReplay, startBattle, startSearch } from "./game";
import type { GameState, Opponent } from "./types";

const opponent: Opponent = { id: "test", name: "Test", icon: "🐢", hp: 25, round: 1, items: ["pot-lid"] };

function shopWithItem(): GameState {
  const game = newGame(123);
  game.run.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
  game.run.nextUid = 2;
  return game;
}

describe("B5 resilient matchmaking", () => {
  it("starts one search and ignores a second start while it runs", () => {
    const searching = startSearch(shopWithItem());
    expect(searching.phase).toBe("searching");
    expect(searching.searchId).toBe(1);
    expect(fightBlocker(searching)).toBe("Search already running");
    expect(startSearch(searching)).toBe(searching);
  });

  it("returns to a usable shop with the error after a failed search", () => {
    const failed = searchFailed(startSearch(shopWithItem()), "API down", 1);
    expect(failed.phase).toBe("shop");
    expect(failed.error).toBe("API down");
    expect(fightBlocker(failed)).toBeNull();

    const retry = startSearch(failed);
    expect(retry.phase).toBe("searching");
    expect(retry.searchId).toBe(2);
    expect(retry.error).toBeNull();
  });

  it("starts the battle for the current search and round", () => {
    const battle = startBattle(startSearch(shopWithItem()), opponent, 1);
    expect(battle.phase).toBe("battle");
    expect(battle.battle?.opponent).toEqual(opponent);
  });

  it("ignores a late response from an older search", () => {
    const failed = searchFailed(startSearch(shopWithItem()), "timeout", 1);
    const retry = startSearch(failed);
    expect(startBattle(retry, opponent, 1)).toBe(retry);
    expect(searchFailed(retry, "late failure", 1)).toBe(retry);
  });

  it("ignores a response for the wrong round", () => {
    const searching = startSearch(shopWithItem());
    expect(startBattle(searching, { ...opponent, round: 2 }, 1)).toBe(searching);
  });

  it("never starts a battle outside a search", () => {
    const shop = shopWithItem();
    expect(startBattle(shop, opponent, 0)).toBe(shop);
    expect(startBattle(shop, opponent, 1)).toBe(shop);
    expect(searchFailed(shop, "error", 0)).toBe(shop);
  });

  it("does not restart a battle on a duplicate response", () => {
    const battle = skipReplay(startBattle(startSearch(shopWithItem()), opponent, 1));
    expect(startBattle(battle, opponent, 1)).toBe(battle);
    expect(searchFailed(battle, "late", 1)).toBe(battle);
  });

  it("blocks searching outside the shop", () => {
    const battle = startBattle(startSearch(shopWithItem()), opponent, 1);
    expect(fightBlocker(battle)).not.toBeNull();
    expect(startSearch(battle)).toBe(battle);
  });
});

describe("B7 hall of fame state", () => {
  it("gives every run its own id and starts unsubmitted", () => {
    const a = newGame(1);
    const b = newGame(1);
    expect(a.run.runId).not.toBe(b.run.runId);
    expect(a.submitted).toBe(false);
  });

  it("marks only finished runs as submitted", () => {
    const shop = shopWithItem();
    expect(markSubmitted(shop)).toBe(shop);
    const finished: GameState = { ...shop, phase: "finished", run: { ...shop.run, lives: 0 } };
    const submitted = markSubmitted(finished);
    expect(submitted.submitted).toBe(true);
    expect(markSubmitted(submitted)).toBe(submitted);
  });
});
