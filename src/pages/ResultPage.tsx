import { RunHeader } from "../components/RunHeader";
import { RunOver } from "../components/RunOver";
import { runOutcome } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ResultPage() {
  const { game, startNewRun } = useActiveGame();
  const outcome = runOutcome(game.run);
  if (!outcome) return null;

  // Starting a new run moves the phase to "shop", so RequireRoute redirects to the shop.
  return (
    <>
      <RunHeader run={game.run} />
      <RunOver run={game.run} outcome={outcome} onNewRun={startNewRun} />
    </>
  );
}
