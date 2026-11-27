import { getItem } from "./items";
import { BACKPACK_SIZE, rollShop } from "./shop";
import type { RunState, Side } from "./types";

export const START_GOLD = 10;
export const START_LIVES = 3;
export const WINS_TO_VICTORY = 5;
export const GOLD_PER_ROUND = 5;

export function newRun(seed: number): RunState {
  const roll = rollShop(seed);
  return {
    runId: crypto.randomUUID(),
    round: 1,
    gold: START_GOLD,
    lives: START_LIVES,
    wins: 0,
    seed: roll.seed,
    shop: roll.offers,
    backpack: Array(BACKPACK_SIZE).fill(null),
    nextUid: 1,
  };
}

export function firstFreeSlot(state: RunState): number {
  return state.backpack.indexOf(null);
}

/** Why an offer can't be bought right now, or `null` if it can. */
export function buyBlocker(state: RunState, offerIndex: number): string | null {
  const itemId = state.shop[offerIndex];
  if (!itemId) return "Already sold";
  if (firstFreeSlot(state) === -1) return "Backpack full";
  if (state.gold < getItem(itemId).price) return "Not enough gold";
  return null;
}

/** Buys a shop offer into the first free backpack slot; unchanged state if not allowed. */
export function buyItem(state: RunState, offerIndex: number): RunState {
  if (buyBlocker(state, offerIndex) !== null) return state;
  const itemId = state.shop[offerIndex]!;
  const slot = firstFreeSlot(state);
  const backpack = [...state.backpack];
  backpack[slot] = { uid: `item-${state.nextUid}`, itemId };
  const shop = [...state.shop];
  shop[offerIndex] = null;
  return { ...state, gold: state.gold - getItem(itemId).price, shop, backpack, nextUid: state.nextUid + 1 };
}

/** Why a backpack item can't be sold right now, or `null` if it can. */
export function sellBlocker(state: RunState, slotIndex: number): string | null {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= state.backpack.length) return "Invalid slot";
  if (!state.backpack[slotIndex]) return "Empty slot";
  return null;
}

/** Sells one backpack item for half its catalog price, rounded down. */
export function sellItem(state: RunState, slotIndex: number): RunState {
  if (sellBlocker(state, slotIndex) !== null) return state;
  const backpack = [...state.backpack];
  const item = backpack[slotIndex];
  if (!item) return state;
  const value = Math.floor(getItem(item.itemId).price / 2);
  backpack[slotIndex] = null;
  return { ...state, gold: state.gold + value, backpack };
}

export const REROLL_COST = 1;

/** Why the shop can't be rerolled right now, or `null` if it can. */
export function rerollBlocker(state: RunState): string | null {
  if (state.gold < REROLL_COST) return "Not enough gold";
  return null;
}

/** Rolls a completely new set of four offers and pays 1 gold atomically. */
export function rerollShop(state: RunState): RunState {
  if (rerollBlocker(state) !== null) return state;
  const roll = rollShop(state.seed);
  return { ...state, gold: state.gold - REROLL_COST, shop: roll.offers, seed: roll.seed };
}

/** Why two backpack slots cannot be swapped/moved right now, or null if possible. */
export function moveBlocker(state: RunState, fromIndex: number, toIndex: number): string | null {
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= state.backpack.length ||
    toIndex >= state.backpack.length
  ) return "Invalid slot";
  if (!state.backpack[fromIndex]) return "Empty source slot";
  if (fromIndex === toIndex) return "Choose another slot";
  return null;
}

/** Moves an item to another slot, or swaps with an occupied target atomically. */
export function moveItem(state: RunState, fromIndex: number, toIndex: number): RunState {
  if (moveBlocker(state, fromIndex, toIndex) !== null) return state;
  const backpack = [...state.backpack];
  const source = backpack[fromIndex];
  if (!source) return state;
  backpack[fromIndex] = backpack[toIndex];
  backpack[toIndex] = source;
  return { ...state, backpack };
}

export type RunOutcome = "victory" | "defeat";

/** `victory` / `defeat` once the run is over, otherwise `null`. */
export function runOutcome(state: RunState): RunOutcome | null {
  if (state.wins >= WINS_TO_VICTORY) return "victory";
  if (state.lives <= 0) return "defeat";
  return null;
}

/** Starts the next round: round + 1, round gold, fresh shop. The backpack is kept. */
export function startNextRound(state: RunState): RunState {
  const roll = rollShop(state.seed);
  return { ...state, round: state.round + 1, gold: state.gold + GOLD_PER_ROUND, seed: roll.seed, shop: roll.offers };
}

/** Records a battle (win → +1 win, loss → −1 life) and moves on to the next round unless the run is over. */
export function applyBattleResult(state: RunState, winner: Side): RunState {
  const scored = winner === "player" ? { ...state, wins: state.wins + 1 } : { ...state, lives: state.lives - 1 };
  return runOutcome(scored) ? scored : startNextRound(scored);
}
