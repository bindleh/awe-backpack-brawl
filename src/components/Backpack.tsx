import { TICK_SECONDS } from "../battle";
import { describeEffects, getItem } from "../items";
import { BACKPACK_COLS } from "../shop";
import type { Backpack as BackpackSlots, ItemDef } from "../types";
import { useState } from "react";

/** Hover text for a backpack slot: name, effects and cooldown. */
const tooltip = (item: ItemDef) =>
  [item.name, ...describeEffects(item.effects).map(({ label }) => label), `⏱️ every ${item.cooldown * TICK_SECONDS}s`].join("\n");

interface BackpackProps {
  backpack: BackpackSlots;
  onSell?: (slotIndex: number) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
}

export function Backpack({ backpack, onSell, onMove }: BackpackProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <section className="rounded-lg border border-panel-edge bg-panel p-4">
      <h2 className="font-display text-xl font-bold">🎒 Backpack</h2>
      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {selectedIndex === null
          ? "Select an item to move or rearrange it."
          : `Selected slot ${selectedIndex + 1}. Choose another slot, or cancel below.`}
      </p>
      {selectedIndex !== null && (
        <button
          type="button"
          onClick={() => setSelectedIndex(null)}
          className="mb-2 w-full rounded-md border border-panel-edge px-2 py-1 text-sm font-bold hover:border-gold"
        >
          Cancel selection
        </button>
      )}
      <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${BACKPACK_COLS}, minmax(0, 1fr))` }}>
        {backpack.map((slot, index) => {
          const item = slot ? getItem(slot.itemId) : null;
          const isSelected = selectedIndex === index;
          return (
            <li
              key={slot?.uid ?? `empty-${index}`}
              title={item ? tooltip(item) : undefined}
              aria-label={item ? item.name : `Empty slot ${index + 1}`}
              className={[
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 p-1",
                isSelected ? "border-gold bg-gold/15 ring-2 ring-gold" :
                  item ? "cursor-help border-gold/40 bg-ink/40" : "border-dashed border-panel-edge",
              ].join(" ")}
            >
              {item && (
                <>
                  <span className="text-2xl leading-none sm:text-3xl" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="text-center text-[0.65rem] leading-tight">{item.name}</span>
                  {isSelected ? (
                    <span className="rounded bg-gold px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">Selected</span>
                  ) : selectedIndex === null ? (
                    onMove && (
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        className="rounded bg-panel-edge px-1.5 py-0.5 text-[0.65rem] font-bold text-parchment hover:bg-gold hover:text-ink"
                      >
                        Select
                      </button>
                    )
                  ) : (
                    onMove && (
                      <button
                        type="button"
                        onClick={() => {
                          onMove(selectedIndex, index);
                          setSelectedIndex(null);
                        }}
                        className="rounded bg-gold px-1.5 py-0.5 text-[0.65rem] font-bold text-ink"
                      >
                        {slot ? "Swap" : "Move"}
                      </button>
                    )
                  )}
                  {selectedIndex === null && onSell && (
                    <button
                      type="button"
                      onClick={() => onSell(index)}
                      title={`Sell for ${Math.floor(item.price / 2)} 🪙`}
                      className="rounded bg-panel-edge px-1.5 py-0.5 text-[0.65rem] font-bold text-parchment hover:bg-gold hover:text-ink"
                    >
                      Sell {Math.floor(item.price / 2)} 🪙
                    </button>
                  )}
                </>
              )}
              {!item && selectedIndex !== null && onMove && (
                <button
                  type="button"
                  onClick={() => {
                    onMove(selectedIndex, index);
                    setSelectedIndex(null);
                  }}
                  className="rounded-md border-2 border-dashed border-gold px-2 py-1 text-xs font-bold text-gold"
                >
                  Move here
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
