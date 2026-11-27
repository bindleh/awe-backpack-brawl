import { getItem } from "./items";
import { BACKPACK_SIZE, SHOP_SIZE } from "./shop";
import type { GameState, RunState } from "./types";

export const SAVE_KEY = "backpack-brawl.save.v1";
export const SAVE_VERSION = 1;

interface SaveEnvelope {
  version: typeof SAVE_VERSION;
  game: GameState;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInteger = (value: unknown, min = 0): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= min;

const isKnownItem = (value: unknown): value is string =>
  typeof value === "string" && (() => {
    try {
      getItem(value);
      return true;
    } catch {
      return false;
    }
  })();

function validRun(value: unknown): value is RunState {
  if (!isRecord(value)) return false;
  // Saves from before the hall of fame have no run id: give them a fresh one.
  if (value.runId === undefined) value.runId = crypto.randomUUID();
  if (typeof value.runId !== "string" || value.runId.length === 0 || value.runId.length > 100) return false;
  if (!isInteger(value.round, 1) || !isInteger(value.gold) || !isInteger(value.lives) ||
      !isInteger(value.wins) || !isInteger(value.seed) || !isInteger(value.nextUid, 1)) return false;
  if (value.gold < 0 || value.lives > 3 || value.wins > 5) return false;
  if (!Array.isArray(value.shop) || value.shop.length !== SHOP_SIZE) return false;
  if (!value.shop.every((itemId) => itemId === null || isKnownItem(itemId))) return false;
  if (!Array.isArray(value.backpack) || value.backpack.length !== BACKPACK_SIZE) return false;

  const uids = new Set<string>();
  for (const slot of value.backpack) {
    if (slot === null) continue;
    if (!isRecord(slot) || typeof slot.uid !== "string" || !isKnownItem(slot.itemId)) return false;
    if (!/^item-\d+$/.test(slot.uid) || uids.has(slot.uid)) return false;
    uids.add(slot.uid);
  }
  const maxUid = [...uids].reduce((max, uid) => Math.max(max, Number(uid.slice(5))), 0);
  return maxUid < value.nextUid;
}

function validBattle(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isRecord(value.opponent) || !isRecord(value.player) || !isRecord(value.enemy) ||
      !isRecord(value.result)) return false;
  const opponent = value.opponent;
  if (typeof opponent.id !== "string" || typeof opponent.name !== "string" ||
      typeof opponent.icon !== "string" || !isInteger(opponent.hp, 1) || !isInteger(opponent.round, 1)) return false;
  if (!Array.isArray(opponent.items) || opponent.items.length > 6 || !opponent.items.every(isKnownItem)) return false;

  for (const fighter of [value.player, value.enemy]) {
    if (!isRecord(fighter) || typeof fighter.name !== "string" ||
        !isInteger(fighter.maxHp, 1) || !Array.isArray(fighter.items)) return false;
    if (fighter.items.length > 6 || !fighter.items.every((item) =>
      isRecord(item) && typeof item.itemId === "string" && typeof item.name === "string" &&
      typeof item.icon === "string" && isInteger(item.cooldown, 1) && isRecord(item.effects))) return false;
  }

  const result = value.result;
  if ((result.winner !== "player" && result.winner !== "opponent") ||
      (result.reason !== "knockout" && result.reason !== "timeout")) return false;
  if (!Array.isArray(result.frames) || result.frames.length === 0 || !isInteger(value.frame)) return false;
  if (value.frame < 0 || value.frame >= result.frames.length) return false;
  if (!Array.isArray(result.events)) return false;

  let previousTick = -1;
  for (const frame of result.frames) {
    if (!isRecord(frame) || !isInteger(frame.tick) || frame.tick <= previousTick) return false;
    previousTick = frame.tick;
    if (!isRecord(frame.player) || !isRecord(frame.opponent) || !Array.isArray(frame.events)) return false;
    for (const snapshot of [frame.player, frame.opponent]) {
      if (!isInteger(snapshot.hp) || !isInteger(snapshot.maxHp, 1) ||
          !isInteger(snapshot.block) || !isInteger(snapshot.burn) || !isInteger(snapshot.poison)) return false;
      if (snapshot.hp > snapshot.maxHp || snapshot.block > snapshot.maxHp * 10 ||
          snapshot.burn > snapshot.maxHp || snapshot.poison > snapshot.maxHp * 10) return false;
    }
  }
  return true;
}

export function normalizeSavedGame(game: GameState): GameState {
  if (game.phase === "searching") {
    return { ...game, phase: "shop", battle: null, error: null };
  }
  if (game.phase === "battle" && game.battle) {
    return game;
  }
  if (game.phase !== "battle") {
    return { ...game, battle: null };
  }
  return { ...game, phase: "shop", battle: null, error: null };
}

export function serializeGame(game: GameState): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, game: normalizeSavedGame(game) };
  return JSON.stringify(envelope);
}

export function parseSavedGame(raw: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !isRecord(parsed.game)) return null;
    const game = parsed.game;
    if (game.phase !== "shop" && game.phase !== "searching" &&
        game.phase !== "battle" && game.phase !== "finished") return null;
    if (!validRun(game.run)) return null;
    if (game.error !== null && typeof game.error !== "string") return null;
    if (game.searchId === undefined) game.searchId = 0;
    if (!isInteger(game.searchId)) return null;
    if (game.submitted === undefined) game.submitted = false;
    if (typeof game.submitted !== "boolean" || (game.submitted && game.phase !== "finished")) return null;

    if (game.phase === "battle") {
      if (!validBattle(game.battle)) return null;
    } else if (game.battle !== null) {
      return null;
    }
    if (game.phase === "finished" && (game.run.wins < 5 && game.run.lives > 0)) return null;
    if ((game.phase === "shop" || game.phase === "searching") &&
        (game.run.wins >= 5 || game.run.lives <= 0)) return null;

    return normalizeSavedGame(game as unknown as GameState);
  } catch {
    return null;
  }
}

export function saveGame(game: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, serializeGame(game));
  } catch {
    // Storage can be unavailable in privacy modes; gameplay remains usable.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? parseSavedGame(raw) : null;
  } catch {
    return null;
  }
}
