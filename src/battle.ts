import { countSetItems, getItem } from "./items";
import { itemIdsOf } from "./shop";
import type { Backpack, BattleEvent, BattleResult, Fighter, FighterItem, FighterSnapshot, Opponent, Side } from "./types";

/** Seconds per battle tick. */
export const TICK_SECONDS = 0.5;
/** Battles that last longer are decided by the timeout rule. */
export const MAX_TICKS = 60;
export const HERO_BASE_HP = 40;
export const BURN_TICK_INTERVAL = 2;
export const BURN_DAMAGE_PER_STACK = 3;
export const FIRE_SET_DAMAGE_BONUS = 2;
export const STONE_SET_BLOCK_BONUS = 4;
export const ACTIVE_SET_MIN_ITEMS = 2;

/** Turns a list of item ids into a fighter with the catalog values of each item. */
export function buildFighter(itemIds: string[], baseHp: number, name = "Fighter"): Fighter {
  const items: FighterItem[] = itemIds.map((id) => {
    const def = getItem(id);
    return { itemId: def.id, name: def.name, icon: def.icon, cooldown: def.cooldown, effects: { ...def.effects } };
  });
  return { name, maxHp: baseHp, items };
}

/** The player's fighter: every backpack item and the hero's base HP. */
export function buildPlayerFighter(backpack: Backpack): Fighter {
  return buildFighter(itemIdsOf(backpack), HERO_BASE_HP, "Hero");
}

export function buildOpponentFighter(opponent: Opponent): Fighter {
  return buildFighter(opponent.items, opponent.hp, opponent.name);
}

interface FighterState {
  fighter: Fighter;
  hp: number;
  block: number;
  burn: number;
  /** Ticks each item has charged towards its cooldown. */
  charge: number[];
}

const other = (side: Side): Side => (side === "player" ? "opponent" : "player");

const snapshot = (s: FighterState): FighterSnapshot => ({
  hp: Math.max(0, s.hp),
  maxHp: s.fighter.maxHp,
  block: s.block,
  burn: s.burn,
});

const isDown = (s: FighterState) => s.hp <= 0;

/**
 * Runs a full battle. Pure and deterministic: the same fighters always give
 * the same result.
 *
 * Each tick:
 * 1. Each fighter charges all items by one tick; items whose charge reaches their cooldown fire.
 * 2. Fired items resolve (player first, then opponent). Both sides fire "simultaneously":
 *    which items fire is decided before any effect is applied.
 * After step 2 the battle ends if someone is down; if both are down, the player loses.
 * After `MAX_TICKS` the higher HP percentage wins; a tie is a player loss.
 */
export function simulateBattle(player: Fighter, opponent: Fighter): BattleResult {
  const state: Record<Side, FighterState> = {
    player: initState(player),
    opponent: initState(opponent),
  };
  const frames: BattleResult["frames"] = [
    { tick: 0, player: snapshot(state.player), opponent: snapshot(state.opponent), events: [] },
  ];
  const events: BattleEvent[] = [];

  const knockoutWinner = (): Side | null => {
    if (isDown(state.player)) return "opponent";
    if (isDown(state.opponent)) return "player";
    return null;
  };

  let winner: Side | null = null;
  let tick = 0;
  while (winner === null && tick < MAX_TICKS) {
    tick += 1;
    const tickEvents: BattleEvent[] = [];
    const emit = (event: Omit<BattleEvent, "tick">) => tickEvents.push({ tick, ...event });

    if (tick % BURN_TICK_INTERVAL === 0) {
      for (const side of ["player", "opponent"] as const) {
        resolveBurn(state[side], side, emit);
      }
      winner = knockoutWinner();
    }

    if (winner !== null) {
      frames.push({ tick, player: snapshot(state.player), opponent: snapshot(state.opponent), events: tickEvents });
      events.push(...tickEvents);
      break;
    }

    const fired: Record<Side, FighterItem[]> = {
      player: chargeItems(state.player),
      opponent: chargeItems(state.opponent),
    };
    for (const side of ["player", "opponent"] as const) {
      for (const item of fired[side]) resolveItem(item, state[side], state[other(side)], side, emit);
    }
    winner = knockoutWinner();

    frames.push({ tick, player: snapshot(state.player), opponent: snapshot(state.opponent), events: tickEvents });
    events.push(...tickEvents);
  }

  if (winner !== null) return { winner, reason: "knockout", frames, events };
  return { winner: timeoutWinner(state.player, state.opponent), reason: "timeout", frames, events };
}

function initState(fighter: Fighter): FighterState {
  const itemIds = fighter.items.map((item) => item.itemId);
  const startingBlock = countSetItems(itemIds, "Stone") >= ACTIVE_SET_MIN_ITEMS ? STONE_SET_BLOCK_BONUS : 0;
  return { fighter, hp: fighter.maxHp, block: startingBlock, burn: 0, charge: fighter.items.map(() => 0) };
}

/** Advances one tick of cooldowns and returns the items that fire this tick. */
function chargeItems(s: FighterState): FighterItem[] {
  const fired: FighterItem[] = [];
  s.fighter.items.forEach((item, i) => {
    s.charge[i] += 1;
    if (s.charge[i] >= item.cooldown) {
      s.charge[i] = 0;
      fired.push(item);
    }
  });
  return fired;
}

function resolveItem(
  item: FighterItem,
  self: FighterState,
  enemy: FighterState,
  side: Side,
  emit: (event: Omit<BattleEvent, "tick">) => void,
) {
  const { damage, block, burnStacks } = item.effects;
  const base = { source: side, itemId: item.itemId };
  const enemySide = other(side);
  const itemIds = self.fighter.items.map((fighterItem) => fighterItem.itemId);
  const fireBonus = countSetItems(itemIds, "Fire") >= ACTIVE_SET_MIN_ITEMS ? FIRE_SET_DAMAGE_BONUS : 0;

  if (damage) {
    const totalDamage = damage + fireBonus;
    const absorbed = Math.min(enemy.block, totalDamage);
    enemy.block -= absorbed;
    enemy.hp -= totalDamage - absorbed;
    const note = absorbed > 0 ? ` (${absorbed} blocked)` : "";
    emit({ ...base, target: enemySide, kind: "damage", amount: totalDamage, message: `${item.name} hits ${enemy.fighter.name} for ${totalDamage}${note}` });
  }
  if (block) {
    self.block += block;
    emit({ ...base, target: side, kind: "block", amount: block, message: `${item.name} grants ${self.fighter.name} ${block} block` });
  }
  if (burnStacks) {
    enemy.burn += burnStacks;
    emit({ ...base, target: enemySide, kind: "burn", amount: burnStacks, message: `${item.name} adds ${burnStacks} burn stacks to ${enemy.fighter.name}` });
  }
}

function resolveBurn(target: FighterState, side: Side, emit: (event: Omit<BattleEvent, "tick">) => void) {
  if (target.burn <= 0) return;
  const damage = target.burn * BURN_DAMAGE_PER_STACK;
  const absorbed = Math.min(target.block, damage);
  target.block -= absorbed;
  target.hp -= damage - absorbed;
  const note = absorbed > 0 ? ` (${absorbed} blocked)` : "";
  emit({
    source: other(side),
    target: side,
    kind: "burn",
    amount: damage,
    itemId: target.burn > 0 ? "ember-wand" : "ember-wand",
    message: `Burn deals ${damage} damage to ${target.fighter.name}${note}; ${target.burn} stacks remain`,
  });
  target.burn -= 1;
  target.burn = Math.max(0, target.burn);
}

function timeoutWinner(player: FighterState, opponent: FighterState): Side {
  const ratio = (s: FighterState) => s.hp / s.fighter.maxHp;
  return ratio(player) > ratio(opponent) ? "player" : "opponent";
}
