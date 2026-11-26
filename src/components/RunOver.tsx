import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { submitHallOfFame } from "../api";
import { ROUTES } from "../game";
import type { RunOutcome } from "../run";
import type { RunState } from "../types";

interface RunOverProps {
  run: RunState;
  outcome: RunOutcome;
  /** Whether this run is already stored in the hall of fame. */
  submitted: boolean;
  onSubmitted: () => void;
  onNewRun: () => void;
}

export function RunOver({ run, outcome, submitted, onSubmitted, onNewRun }: RunOverProps) {
  const victory = outcome === "victory";
  return (
    <section
      className={`mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-lg border-2 bg-panel p-8 text-center ${victory ? "border-gold" : "border-life"}`}
    >
      <p className="text-6xl" aria-hidden>
        {victory ? "👑" : "🪦"}
      </p>
      <h2 className="font-display text-3xl font-bold">{victory ? "Champion of the arena!" : "Your run is over"}</h2>
      <p className="text-muted">
        {run.wins} {run.wins === 1 ? "win" : "wins"} in {run.round} {run.round === 1 ? "round" : "rounds"}, {run.lives}{" "}
        {run.lives === 1 ? "life" : "lives"} left.
      </p>
      <HallOfFameForm run={run} outcome={outcome} submitted={submitted} onSubmitted={onSubmitted} />
      <button type="button" onClick={onNewRun} className="rounded-md bg-gold px-5 py-2 font-display font-bold text-ink hover:brightness-110">
        🎒 New run
      </button>
    </section>
  );
}

const MAX_NAME_LENGTH = 20;

type SubmitStatus = { state: "idle" } | { state: "sending" } | { state: "error"; message: string };

function HallOfFameForm({ run, outcome, submitted, onSubmitted }: Omit<RunOverProps, "onNewRun">) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<SubmitStatus>({ state: "idle" });

  if (submitted) {
    return (
      <p role="status" className="font-bold text-gold">
        Saved ✓{" "}
        <Link to={ROUTES.hallOfFame} className="underline">
          View the hall of fame
        </Link>
      </p>
    );
  }

  const sending = status.state === "sending";
  const trimmed = name.trim();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending || trimmed.length === 0) return;
    setStatus({ state: "sending" });
    try {
      await submitHallOfFame({ runId: run.runId, name: trimmed, outcome, wins: run.wins, lives: run.lives, rounds: run.round });
      onSubmitted();
    } catch (error) {
      setStatus({ state: "error", message: error instanceof Error ? error.message : "Submitting failed." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 rounded-md border border-panel-edge p-3">
      <label htmlFor="hall-of-fame-name" className="text-sm font-bold">
        🏆 Enter the hall of fame
      </label>
      <div className="flex gap-2">
        <input
          id="hall-of-fame-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Your name"
          autoFocus
          disabled={sending}
          className="min-w-0 flex-1 rounded-md border border-panel-edge bg-ink px-2 py-1"
        />
        <button
          type="submit"
          disabled={sending || trimmed.length === 0}
          className="shrink-0 rounded-md bg-life px-3 py-1 font-bold text-parchment hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
        >
          {sending ? "Sending…" : status.state === "error" ? "Retry" : "Submit to hall of fame"}
        </button>
      </div>
      {status.state === "error" && (
        <p role="alert" className="text-sm text-life">
          ⚠️ {status.message} Your name is kept, try again.
        </p>
      )}
    </form>
  );
}
