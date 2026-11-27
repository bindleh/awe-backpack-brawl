import { getItem } from "../items";
import { buyBlocker } from "../run";
import type { RunState } from "../types";
import { ItemCard } from "./ItemCard";

interface ShopProps {
  run: RunState;
  onBuy: (offerIndex: number) => void;
  onReroll: () => void;
  onRestart: () => void;
  rerollBlocker: string | null;
}

export function Shop({ run, onBuy, onReroll, onRestart, rerollBlocker }: ShopProps) {
  return (
    <section className="rounded-lg border border-panel-edge bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">🏪 Shop</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md bg-panel-edge px-3 py-1.5 text-sm font-bold text-parchment hover:bg-life hover:text-ink"
          >
            Restart run
          </button>
          <button
            type="button"
            onClick={onReroll}
            disabled={rerollBlocker !== null}
            title={rerollBlocker ?? "Roll four new offers"}
            className="rounded-md bg-panel-edge px-3 py-1.5 text-sm font-bold text-parchment hover:bg-gold hover:text-ink disabled:text-muted"
          >
            {rerollBlocker ?? "Reroll 1 🪙"}
          </button>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {run.shop.map((itemId, index) => {
          if (!itemId) {
            return (
              <li key={index} className="grid min-h-32 place-items-center rounded-lg border-2 border-dashed border-panel-edge text-sm text-muted">
                Sold
              </li>
            );
          }
          const item = getItem(itemId);
          const blocker = buyBlocker(run, index);
          return (
            <li key={index}>
              <ItemCard item={item}>
                <button
                  type="button"
                  onClick={() => onBuy(index)}
                  disabled={blocker !== null}
                  title={blocker ?? undefined}
                  className="mt-auto rounded-md bg-gold px-3 py-1.5 font-bold text-ink hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
                >
                  {blocker ?? `Buy for ${item.price} 🪙`}
                </button>
              </ItemCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
