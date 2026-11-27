import type { HallOfFameEntry, HallOfFameSubmission, Opponent } from "./types";

/** Throws with the server's `error` text, or `fallback` and the status code. */
async function throwResponseError(response: Response, fallback: string): Promise<never> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(body?.error ?? `${fallback} (${response.status})`);
}

/** Asks the API for this round's opponent; throws with the server's error text on failure. */
export async function fetchOpponent(round: number): Promise<Opponent> {
  const response = await fetch(`/api/opponents?round=${encodeURIComponent(round)}`);
  if (!response.ok) return throwResponseError(response, "Opponent search failed");
  return response.json() as Promise<Opponent>;
}

/**
 * Saves a finished run in the hall of fame. A 409 means this run is already stored
 * (e.g. the first answer got lost), so it counts as success as well.
 */
export async function submitHallOfFame(entry: HallOfFameSubmission): Promise<void> {
  const response = await fetch("/api/hall-of-fame", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (response.ok || response.status === 409) return;
  return throwResponseError(response, "Submitting to the hall of fame failed");
}

/** The best runs, already in ranking order. */
export async function fetchHallOfFame(): Promise<HallOfFameEntry[]> {
  const response = await fetch("/api/hall-of-fame");
  if (!response.ok) return throwResponseError(response, "Loading the hall of fame failed");
  return response.json() as Promise<HallOfFameEntry[]>;
}
