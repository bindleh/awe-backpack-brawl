import { describe, expect, it } from "vitest";
import {
  BURN_DAMAGE_PER_STACK,
  BURN_TICK_INTERVAL,
  FIRE_SET_DAMAGE_BONUS,
  buildFighter,
  simulateBattle,
} from "./battle";

describe("B4 item sets and Burn", () => {
  it("catalogues at least three Fire and three Stone items", async () => {
    const { CATALOG } = await import("./items");
    expect(CATALOG.filter((item) => item.set === "Fire").length).toBeGreaterThanOrEqual(3);
    expect(CATALOG.filter((item) => item.set === "Stone").length).toBeGreaterThanOrEqual(3);
  });

  it("grants the Stone set's starting block to player and opponent fighters", () => {
    const player = buildFighter(["oak-buckler", "pot-lid"], 40, "Hero");
    const opponent = buildFighter(["oak-buckler", "spiked-shield"], 40, "Enemy");
    const result = simulateBattle(player, opponent);
    expect(result.frames[0].player.block).toBe(4);
    expect(result.frames[0].opponent.block).toBe(4);
  });

  it("grants the Fire set damage bonus to damage items", () => {
    const player = buildFighter(["ember-wand", "flame-sword"], 40, "Hero");
    const opponent = buildFighter(["pot-lid"], 40, "Enemy");
    const result = simulateBattle(player, opponent);
    const damageEvents = result.events.filter((event) => event.kind === "damage");
    expect(damageEvents.length).toBeGreaterThan(0);
    expect(damageEvents[0].amount).toBe(4 + FIRE_SET_DAMAGE_BONUS);
  });

  it("adds Burn stacks, ticks deterministically and decays", () => {
    const player = buildFighter(["ember-wand"], 40, "Hero");
    const opponent = buildFighter(["pot-lid"], 40, "Enemy");
    const result = simulateBattle(player, opponent);
    const addEvents = result.events.filter((event) => event.kind === "burn" && event.message.includes("adds"));
    expect(addEvents.length).toBeGreaterThan(0);

    const burnTicks = result.events.filter((event) =>
      event.kind === "burn" && event.message.includes("Burn deals"),
    );
    expect(burnTicks.every((event) => event.tick % BURN_TICK_INTERVAL === 0)).toBe(true);
    expect(burnTicks[0].amount % BURN_DAMAGE_PER_STACK).toBe(0);
  });
});
