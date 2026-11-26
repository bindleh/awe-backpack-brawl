import { describe, expect, it } from "vitest";
import { getItem } from "./items";
import { BACKPACK_SIZE } from "./shop";
import {
  buyItem,
  moveBlocker,
  moveItem,
  newRun,
  rerollBlocker,
  rerollShop,
  sellBlocker,
  sellItem,
} from "./run";

describe("B1 shop economy", () => {
  it("buys into a free slot without going below zero gold", () => {
    const state = newRun(123);
    state.gold = 10;
    const price = getItem(state.shop[0]!).price;
    const bought = buyItem(state, 0);
    expect(bought.gold).toBe(10 - price);
    expect(bought.shop[0]).toBeNull();
    expect(bought.backpack.filter(Boolean)).toHaveLength(1);
  });

  it("does not buy when the backpack is full", () => {
    const state = newRun(123);
    state.backpack = Array.from({ length: BACKPACK_SIZE }, (_, index) => ({
      uid: `item-${index}`,
      itemId: "chipped-dagger",
    }));
    expect(buyItem(state, 0).shop).toBe(state.shop);
    expect(buyItem(state, 0).backpack).toBe(state.backpack);
  });

  it("sells exactly once for half price rounded down", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    const sold = sellItem(state, 0);
    expect(sold.gold).toBe(state.gold + 2);
    expect(sold.backpack[0]).toBeNull();
    expect(sellItem(sold, 0)).toBe(sold);
  });

  it("rejects empty and invalid sell slots", () => {
    const state = newRun(123);
    expect(sellBlocker(state, 0)).toBe("Empty slot");
    expect(sellBlocker(state, -1)).toBe("Invalid slot");
  });

  it("rerolls for exactly 1 gold and cannot go negative", () => {
    const state = newRun(123);
    const rerolled = rerollShop(state);
    expect(rerolled.gold).toBe(state.gold - 1);
    expect(rerolled.shop).not.toBe(state.shop);
    rerolled.gold = 0;
    expect(rerollBlocker(rerolled)).toBe("Not enough gold");
    expect(rerollShop(rerolled)).toBe(rerolled);
  });
});

describe("B2 backpack arrangement", () => {
  it("moves an item to an empty slot", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
    const moved = moveItem(state, 0, 4);
    expect(moved.backpack[0]).toBeNull();
    expect(moved.backpack[4]?.uid).toBe("item-1");
  });

  it("swaps two occupied slots", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
    state.backpack[2] = { uid: "item-2", itemId: "hunting-bow" };
    const swapped = moveItem(state, 0, 2);
    expect(swapped.backpack[0]?.uid).toBe("item-2");
    expect(swapped.backpack[2]?.uid).toBe("item-1");
  });

  it("rejects invalid, empty-source and same-slot moves", () => {
    const state = newRun(123);
    expect(moveBlocker(state, -1, 0)).toBe("Invalid slot");
    expect(moveBlocker(state, 0, 1)).toBe("Empty source slot");
    state.backpack[0] = { uid: "item-1", itemId: "chipped-dagger" };
    expect(moveBlocker(state, 0, 0)).toBe("Choose another slot");
    expect(moveItem(state, 0, 0)).toBe(state);
  });
});
