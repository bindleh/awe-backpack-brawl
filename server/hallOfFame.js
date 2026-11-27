/**
 * Validation and ranking for hall of fame entries. Pure functions, so they can be tested
 * without the HTTP server; `server/index.js` keeps the entries in memory.
 */

export const WINS_TO_VICTORY = 5;
export const START_LIVES = 3;
export const MAX_NAME_LENGTH = 20;
export const MAX_RUN_ID_LENGTH = 100;
/** How many entries `GET /api/hall-of-fame` returns. */
export const TOP_ENTRIES = 10;

const isWhole = (value, min, max = Number.MAX_SAFE_INTEGER) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;

/**
 * Checks a submitted body. Returns `{ entry }` with the cleaned entry (without `submittedAt`)
 * or `{ error }` with a human-readable reason.
 */
export function validateEntry(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }
  const { runId, name, outcome, wins, lives, rounds } = body;

  if (typeof runId !== "string" || runId.length === 0 || runId.length > MAX_RUN_ID_LENGTH) {
    return { error: `runId must be a non-empty string of at most ${MAX_RUN_ID_LENGTH} characters` };
  }
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > MAX_NAME_LENGTH) {
    return { error: `name must be 1–${MAX_NAME_LENGTH} characters (leading and trailing spaces are ignored)` };
  }
  if (outcome !== "victory" && outcome !== "defeat") {
    return { error: 'outcome must be "victory" or "defeat"' };
  }
  if (!isWhole(wins, 0, WINS_TO_VICTORY)) return { error: `wins must be a whole number from 0 to ${WINS_TO_VICTORY}` };
  if (!isWhole(lives, 0, START_LIVES)) return { error: `lives must be a whole number from 0 to ${START_LIVES}` };
  if (!isWhole(rounds, 1)) return { error: "rounds must be a whole number of at least 1" };

  if (outcome === "victory" && !(wins === WINS_TO_VICTORY && lives >= 1)) {
    return { error: `A victory needs ${WINS_TO_VICTORY} wins and at least 1 life left` };
  }
  if (outcome === "defeat" && !(lives === 0 && wins < WINS_TO_VICTORY)) {
    return { error: `A defeat needs 0 lives left and fewer than ${WINS_TO_VICTORY} wins` };
  }
  const losses = START_LIVES - lives;
  if (rounds !== wins + losses) {
    return { error: `rounds must equal wins + lost lives (${wins} + ${losses} = ${wins + losses})` };
  }

  return { entry: { runId, name: name.trim(), outcome, wins, lives, rounds } };
}

/** Victories first, then more wins, then fewer rounds, then the earlier submission. */
export function compareEntries(a, b) {
  if (a.outcome !== b.outcome) return a.outcome === "victory" ? -1 : 1;
  if (a.wins !== b.wins) return b.wins - a.wins;
  if (a.rounds !== b.rounds) return a.rounds - b.rounds;
  return a.submittedAt.localeCompare(b.submittedAt);
}

/** The best `TOP_ENTRIES` entries in ranking order; does not modify `entries`. */
export function topEntries(entries, limit = TOP_ENTRIES) {
  return [...entries].sort(compareEntries).slice(0, limit);
}
