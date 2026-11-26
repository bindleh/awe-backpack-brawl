import type { ItemDef, ItemEffects, ItemSet } from "./types";

export const CATALOG: ItemDef[] = [
  { id: "chipped-dagger", name: "Chipped Dagger", icon: "🗡️", price: 2, cooldown: 4, effects: { damage: 3 } },
  { id: "hunting-bow", name: "Hunting Bow", icon: "🏹", price: 4, cooldown: 4, effects: { damage: 5 } },
  { id: "iron-cleaver", name: "Iron Cleaver", icon: "🪓", price: 5, cooldown: 8, effects: { damage: 12 } },
  { id: "oak-buckler", name: "Oak Buckler", icon: "🛡️", price: 3, cooldown: 5, effects: { block: 4 }, set: "Stone" },
  { id: "pot-lid", name: "Pot Lid", icon: "🍳", price: 2, cooldown: 3, effects: { block: 2 }, set: "Stone" },
  { id: "spiked-shield", name: "Spiked Shield", icon: "⚔️", price: 4, cooldown: 6, effects: { damage: 3, block: 3 }, set: "Stone" },
  { id: "ember-wand", name: "Ember Wand", icon: "🪄", price: 3, cooldown: 4, effects: { burnStacks: 2 }, set: "Fire" },
  { id: "flame-sword", name: "Flame Sword", icon: "🔥", price: 5, cooldown: 6, effects: { damage: 4, burnStacks: 2 }, set: "Fire" },
  { id: "phoenix-cinder", name: "Phoenix Cinder", icon: "☄️", price: 4, cooldown: 5, effects: { damage: 2, burnStacks: 3 }, set: "Fire" },
  { id: "venom-dagger", name: "Venom Dagger", icon: "🧪", price: 3, cooldown: 4, effects: { damage: 1, poisonStacks: 1 } },
  { id: "viper-fang", name: "Viper Fang", icon: "🐍", price: 4, cooldown: 5, effects: { poisonStacks: 2 } },
  { id: "toxic-vial", name: "Toxic Vial", icon: "☠️", price: 5, cooldown: 6, effects: { poisonStacks: 3 } },
  { id: "healing-herb", name: "Healing Herb", icon: "🌿", price: 2, cooldown: 4, effects: { heal: 2 } },
  { id: "health-potion", name: "Health Potion", icon: "🧴", price: 4, cooldown: 6, effects: { heal: 5 } },
  { id: "troll-salve", name: "Troll Salve", icon: "🍖", price: 5, cooldown: 8, effects: { heal: 8 } },
];

const byId = new Map(CATALOG.map((item) => [item.id, item]));

export function getItem(id: string): ItemDef {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export function countSetItems(itemIds: string[], set: ItemSet): number {
  return itemIds.filter((id) => getItem(id).set === set).length;
}

export function describeSet(set: ItemSet): string {
  return set === "Fire" ? "🔥 Fire" : "🪨 Stone";
}

const EFFECT_LABELS: [keyof ItemEffects, (n: number) => string][] = [
  ["damage", (n) => `⚔️ ${n} dmg`],
  ["block", (n) => `🛡️ +${n} block`],
  ["burnStacks", (n) => `🔥 +${n} burn stacks`],
  ["poisonStacks", (n) => `☠️ +${n} poison stacks`],
  ["heal", (n) => `💚 +${n} HP`],
];

/** Short labels for an item's effects, e.g. `[{ effect: "damage", label: "⚔️ 2 dmg" }, …]`. */
export function describeEffects(effects: ItemEffects): { effect: keyof ItemEffects; label: string }[] {
  return EFFECT_LABELS.flatMap(([effect, label]) => (effects[effect] ? [{ effect, label: label(effects[effect]) }] : []));
}
