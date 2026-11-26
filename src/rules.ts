import {
  ACTIVE_SET_MIN_ITEMS,
  BURN_DAMAGE_PER_STACK,
  BURN_TICK_INTERVAL,
  FIRE_SET_DAMAGE_BONUS,
  HERO_BASE_HP,
  MAX_TICKS,
  POISON_DAMAGE_PER_STACK,
  POISON_TICK_INTERVAL,
  STONE_SET_BLOCK_BONUS,
  TICK_SECONDS,
} from "./battle";
import { GOLD_PER_ROUND, START_GOLD, START_LIVES, WINS_TO_VICTORY } from "./run";
import { BACKPACK_COLS, BACKPACK_ROWS, SHOP_SIZE } from "./shop";
import type { ItemEffects } from "./types";

/**
 * Player-facing explanations of the rules. Built from the game constants so
 * the texts stay correct when numbers are rebalanced.
 */

const BATTLE_SECONDS = MAX_TICKS * TICK_SECONDS;


/** Tooltip per item effect. */
export const EFFECT_HELP: Record<keyof ItemEffects, string> = {
  damage: "Damage: hits the enemy. Block absorbs it first, the rest is lost from HP.",
  block: "Block: absorbs incoming damage until used up. Unused block stays for the rest of the battle.",
  burnStacks: `Burn: adds stacks to the enemy. Every ${BURN_TICK_INTERVAL} ticks, ${BURN_DAMAGE_PER_STACK} damage per stack is absorbed by block first, then the stack count decays by 1.`,
  poisonStacks: `Poison: adds stacks to the enemy. Every ${POISON_TICK_INTERVAL} ticks the enemy loses ${POISON_DAMAGE_PER_STACK} HP per stack. Ignores block; stacks never decay.`,
  heal: "Heal: restores your own HP when the item fires, never above your max HP.",
};

export const COOLDOWN_HELP = `Cooldown: the item fires every time this much battle time has passed (1 tick = ${TICK_SECONDS} s).`;

/** Tooltip per fighter status shown in battle. */
export const STATUS_HELP = {
  hp: "HP: reaching 0 is a knockout.",
  block: EFFECT_HELP.block,
  burn: EFFECT_HELP.burnStacks,
  poison: EFFECT_HELP.poisonStacks,
  timer: `After ${BATTLE_SECONDS} s the fighter with the higher share of HP wins; a tie counts as your loss.`,
};

export interface RuleSection {
  title: string;
  rules: string[];
}

export const RULES: RuleSection[] = [
  {
    title: "🏆 The run",
    rules: [
      `Reach ${WINS_TO_VICTORY} wins before you lose all ${START_LIVES} lives.`,
      `Each battle is one round: a win gives +1 win, a loss costs 1 life.`,
      `Opponents get tougher every round.`,
    ],
  },
  {
    title: "🏪 Shop & backpack",
    rules: [
      `You start with ${START_GOLD} 🪙 and earn ${GOLD_PER_ROUND} 🪙 at the start of every new round. Unspent gold carries over.`,
      `The shop offers ${SHOP_SIZE} new items every round.`,
      `Bought items go to the first free slot of your ${BACKPACK_COLS}×${BACKPACK_ROWS} backpack and stay there for the whole run.`,
      `Sell an item from the backpack for half its listed price, rounded down.`,
      `Reroll all ${SHOP_SIZE} shop offers for 1 🪙. Gold and backpack changes complete atomically.`,
      `Select a backpack item, then choose another slot to move it. Moving onto an occupied slot swaps both items; selection can be cancelled.`,
      `Only items in your backpack fight. Their position doesn't matter.`,
    ],
  },
  {
    title: "⚔️ Battle",
    rules: [
      `Battles run on their own. Your hero has ${HERO_BASE_HP} HP; every item fires whenever its cooldown is up.`,
      `Damage hits block first; only the rest is lost from HP. Unused block stays for the rest of the battle.`,
      `Knock the enemy out to win. ${STATUS_HELP.timer} If both fall at once, you lose.`,
    ],
  },
  {
    title: "🔥 Item sets & Burn",
    rules: [
      `${ACTIVE_SET_MIN_ITEMS} or more items of the Fire set grant +${FIRE_SET_DAMAGE_BONUS} damage to every damage effect. Fire items add 2 or 3 Burn stacks.`,
      `${ACTIVE_SET_MIN_ITEMS} or more items of the Stone set grant +${STONE_SET_BLOCK_BONUS} block at the start of battle.`,
      `Burn ticks every ${BURN_TICK_INTERVAL} ticks and deals ${BURN_DAMAGE_PER_STACK} damage per stack. Block absorbs it first; 1 stack decays after each Burn tick until it wears off.`,
      `Set bonuses apply to both fighters. Set badges identify Fire and Stone items in the shop and battle view.`,
    ],
  },
  {
    title: "☠️ Poison & 💚 Heal",
    rules: [
      `Poison items add stacks to the enemy. Every ${POISON_TICK_INTERVAL} ticks a poisoned fighter loses ${POISON_DAMAGE_PER_STACK} HP per stack.`,
      `Poison ignores block and never decays: stacks pile up until the battle ends. Burn hits harder but block absorbs it and it wears off.`,
      `Burn and Poison tick before items fire; a knockout from them ends the battle at once.`,
      `Heal items restore the fighter's own HP when they fire, never above max HP. At full HP the heal is wasted.`,
    ],
  },
  {
    title: "💾 Save & resume",
    rules: [
      `Shop, backpack, gold and run progress are saved automatically in this browser.`,
      `Refreshing during an opponent search returns to the usable shop; the cancelled search does not reroll the shop or choose a different opponent.`,
      `Refreshing during battle resumes the matching battle screen with the same opponent and replay, so a battle result cannot be applied twice.`,
      `Malformed or incompatible saves are ignored and replaced with a fresh playable start.`,
    ],
  },
];
