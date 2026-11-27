import { describe, expect, it } from "vitest";
import { compareEntries, topEntries, validateEntry } from "./hallOfFame.js";

const valid = { runId: "run-1", name: "  Ada  ", outcome: "victory", wins: 5, lives: 2, rounds: 6 };

describe("B7 hall of fame validation", () => {
  it("accepts a plausible run and trims the name", () => {
    expect(validateEntry(valid)).toEqual({ entry: { ...valid, name: "Ada" } });
    expect(validateEntry({ ...valid, runId: "run-2", outcome: "defeat", wins: 2, lives: 0, rounds: 5 }).entry).toBeDefined();
  });

  it.each([
    ["no body", null, "JSON object"],
    ["empty runId", { ...valid, runId: "" }, "runId"],
    ["long runId", { ...valid, runId: "x".repeat(101) }, "runId"],
    ["blank name", { ...valid, name: "   " }, "name"],
    ["long name", { ...valid, name: "x".repeat(21) }, "name"],
    ["unknown outcome", { ...valid, outcome: "draw" }, "outcome"],
    ["too many wins", { ...valid, wins: 6 }, "wins"],
    ["fractional wins", { ...valid, wins: 4.5 }, "wins"],
    ["too many lives", { ...valid, lives: 4 }, "lives"],
    ["zero rounds", { ...valid, rounds: 0 }, "rounds"],
    ["string rounds", { ...valid, rounds: "6" }, "rounds"],
    ["victory without 5 wins", { ...valid, wins: 4, rounds: 5 }, "victory"],
    ["victory with 0 lives", { ...valid, lives: 0, rounds: 8 }, "victory"],
    ["defeat with lives left", { ...valid, outcome: "defeat", wins: 2, lives: 1, rounds: 4 }, "defeat"],
    ["defeat with 5 wins", { ...valid, outcome: "defeat", wins: 5, lives: 0, rounds: 8 }, "defeat"],
    ["impossible rounds", { ...valid, rounds: 9 }, "rounds"],
  ])("rejects %s", (_label, body, field) => {
    const { error, entry } = validateEntry(body);
    expect(entry).toBeUndefined();
    expect(error).toContain(field);
  });
});

describe("B7 hall of fame ranking", () => {
  const entry = (name: string, outcome: string, wins: number, rounds: number, submittedAt: string) =>
    ({ runId: name, name, outcome, wins, lives: 0, rounds, submittedAt });

  it("orders victories first, then more wins, fewer rounds, earlier submission", () => {
    const entries = [
      entry("defeat-4", "defeat", 4, 7, "2026-01-01T00:00:00.000Z"),
      entry("victory-7", "victory", 5, 7, "2026-01-01T00:00:00.000Z"),
      entry("victory-5-late", "victory", 5, 5, "2026-01-02T00:00:00.000Z"),
      entry("victory-5-early", "victory", 5, 5, "2026-01-01T00:00:00.000Z"),
      entry("defeat-1", "defeat", 1, 4, "2026-01-01T00:00:00.000Z"),
      entry("defeat-4-fast", "defeat", 4, 6, "2026-01-03T00:00:00.000Z"),
    ];
    expect([...entries].sort(compareEntries).map((e) => e.name)).toEqual([
      "victory-5-early", "victory-5-late", "victory-7", "defeat-4-fast", "defeat-4", "defeat-1",
    ]);
  });

  it("returns at most ten entries without changing the stored list", () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      entry(`p${i}`, "defeat", i % 5, 3 + (i % 5), `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`));
    const copy = [...entries];
    expect(topEntries(entries)).toHaveLength(10);
    expect(entries).toEqual(copy);
  });
});
