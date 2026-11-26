import { describe, expect, it } from "vitest";
import { POISON_DAMAGE_PER_STACK, POISON_TICK_INTERVAL, buildFighter, simulateBattle } from "./battle";
import { CATALOG } from "./items";
import type { Fighter } from "./types";

/** A fighter with a single hand-made item, so tests don't depend on catalog balancing. */
const fighterWith = (name: string, maxHp: number, effects: Fighter["items"][number]["effects"], cooldown = 4): Fighter => ({
  name,
  maxHp,
  items: [{ itemId: "viper-fang", name: "Test item", icon: "🧪", cooldown, effects }],
});

const poisonTicks = (events: ReturnType<typeof simulateBattle>["events"]) =>
  events.filter((event) => event.kind === "poison" && event.message.startsWith("Poison deals"));

describe("B3 Poison and Heal", () => {
  it("catalogues at least three Poison and three Heal items", () => {
    expect(CATALOG.filter((item) => item.effects.poisonStacks).length).toBeGreaterThanOrEqual(3);
    expect(CATALOG.filter((item) => item.effects.heal).length).toBeGreaterThanOrEqual(3);
  });

  it("ignores block", () => {
    const player = fighterWith("Hero", 40, { poisonStacks: 1 }, 1);
    const opponent = fighterWith("Wall", 40, { block: 50 }, 1);
    const result = simulateBattle(player, opponent);
    const first = poisonTicks(result.events)[0];
    const frame = result.frames.find((f) => f.tick === first.tick)!;
    const before = result.frames.find((f) => f.tick === first.tick - 1)!;
    expect(frame.opponent.hp).toBe(before.opponent.hp - first.amount);
    expect(frame.opponent.block).toBeGreaterThanOrEqual(before.opponent.block);
  });

  it("ticks every POISON_TICK_INTERVAL ticks and never decays", () => {
    // Adds 2 stacks every tick; Poison ticks before items fire, so a tick deals (stacks shown − 2) damage.
    const player = fighterWith("Hero", 40, { poisonStacks: 2 }, 1);
    const opponent = fighterWith("Dummy", 2000, {}, 100);
    const result = simulateBattle(player, opponent);
    const ticks = poisonTicks(result.events);
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.every((event) => event.tick % POISON_TICK_INTERVAL === 0)).toBe(true);
    // Stacks are added every tick and never lost, so the poison count only grows.
    const stacks = result.frames.map((f) => f.opponent.poison);
    stacks.slice(1).forEach((n, i) => expect(n).toBeGreaterThanOrEqual(stacks[i]));
    ticks.forEach((event) => {
      const frame = result.frames.find((f) => f.tick === event.tick)!;
      expect(event.amount).toBe((frame.opponent.poison - 2) * POISON_DAMAGE_PER_STACK);
    });
  });

  it("keeps all stacks until the battle ends", () => {
    const player = fighterWith("Hero", 40, { poisonStacks: 3 }, 6);
    const opponent = fighterWith("Dummy", 500, {}, 100);
    const result = simulateBattle(player, opponent);
    const last = result.frames[result.frames.length - 1];
    const added = result.events.filter((e) => e.kind === "poison" && e.message.includes("adds")).length * 3;
    expect(last.opponent.poison).toBe(added);
  });

  it("never heals above max HP", () => {
    const player = fighterWith("Hero", 40, { heal: 8 }, 1);
    const opponent = fighterWith("Pecker", 40, { damage: 1 }, 3);
    const result = simulateBattle(player, opponent);
    expect(result.frames.every((f) => f.player.hp <= f.player.maxHp)).toBe(true);
    const heals = result.events.filter((e) => e.kind === "heal");
    expect(heals.length).toBeGreaterThan(0);
    expect(heals[0].amount).toBe(0);
    expect(heals[0].message).toContain("full HP");
    expect(heals.some((e) => e.amount === 1)).toBe(true);
  });

  it("stays deterministic with poison and heal items", () => {
    const player = () => buildFighter(["venom-dagger", "health-potion", "toxic-vial"], 40, "Hero");
    const opponent = () => buildFighter(["viper-fang", "troll-salve", "hunting-bow"], 44, "Enemy");
    expect(simulateBattle(player(), opponent())).toEqual(simulateBattle(player(), opponent()));
  });
});
