import { useEffect, useState } from "react";
import { fetchHallOfFame } from "../api";
import type { HallOfFameEntry } from "../types";

type LoadState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "loaded"; entries: HallOfFameEntry[] };

export function HallOfFamePage() {
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  // Bumped by "Retry" to run the effect again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchHallOfFame()
      .then((entries) => active && setLoad({ state: "loaded", entries }))
      .catch((error: unknown) =>
        active && setLoad({ state: "error", message: error instanceof Error ? error.message : "Loading failed." }));
    return () => {
      active = false;
    };
  }, [attempt]);

  function handleRetry() {
    setLoad({ state: "loading" });
    setAttempt((n) => n + 1);
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-lg border-2 border-gold bg-panel p-6">
      <h2 className="font-display text-3xl font-bold">🏆 Hall of fame</h2>
      <p className="text-sm text-muted">
        Victories rank first, then more wins, then fewer rounds; on a tie the earlier entry ranks higher. The best 10 runs are shown.
      </p>

      {load.state === "loading" && <p className="animate-pulse text-gold">Loading the hall of fame…</p>}

      {load.state === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-life">
          <p>⚠️ {load.message}</p>
          <button type="button" onClick={handleRetry} className="rounded-md border border-panel-edge px-3 py-1 text-parchment hover:bg-panel-edge/40">
            Retry
          </button>
        </div>
      )}

      {load.state === "loaded" && load.entries.length === 0 && <p className="text-muted">No runs yet. Finish a run and be the first!</p>}

      {load.state === "loaded" && load.entries.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-panel-edge text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="py-1">Rank</th>
              <th>Name</th>
              <th>Outcome</th>
              <th className="text-right">Wins</th>
              <th className="text-right">Rounds</th>
            </tr>
          </thead>
          <tbody>
            {load.entries.map((entry, index) => (
              <tr key={entry.runId} className="border-b border-panel-edge/40">
                <td className="py-1 font-mono">{index + 1}</td>
                <td className="font-bold">{entry.name}</td>
                <td>{entry.outcome === "victory" ? "👑 Victory" : "🪦 Defeat"}</td>
                <td className="text-right font-mono">{entry.wins}</td>
                <td className="text-right font-mono">{entry.rounds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
