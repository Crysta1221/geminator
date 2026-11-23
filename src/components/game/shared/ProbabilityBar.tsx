import { motion } from "motion/react";

import { PROBABILITY_ORDER } from "#/lib/client-types";
import type { Probabilities } from "#/lib/contract";

type ProbabilityBarProps = {
  probabilities: Probabilities;
  animateBars?: boolean;
};

export function ProbabilityBar({ probabilities, animateBars = true }: ProbabilityBarProps) {
  const total = PROBABILITY_ORDER.reduce(
    (sum, item) => sum + Math.max(0, probabilities[item.key] ?? 0),
    0,
  );

  const items = PROBABILITY_ORDER.map((item) => {
    const raw = Math.max(0, probabilities[item.key] ?? 0);
    const pct = total > 0 ? (raw / total) * 100 : 0;
    const rounded = Math.round(pct);
    return { ...item, pct, rounded };
  });

  const ariaSummary = items.map((item) => `${item.label} ${item.rounded}%`).join("、");

  const visibleItems = items.filter((item) => item.rounded > 0);
  const labelsToShow = visibleItems.length > 0 ? visibleItems : items;

  return (
    <div className="mt-1.5 w-full space-y-1.5">
      <div
        role="img"
        aria-label={`確率の内訳: ${ariaSummary}`}
        className="flex h-3.5 w-full overflow-hidden rounded-full border-2 border-border bg-secondary-background"
      >
        {items.map((item, idx) =>
          item.pct > 0 ? (
            <motion.span
              key={item.key}
              initial={animateBars ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.45,
                delay: idx * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ width: `${item.pct}%`, transformOrigin: "left" }}
              className={`block h-full ${item.barClass}`}
              title={`${item.label}: ${item.rounded}%`}
            />
          ) : null,
        )}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-2.5 gap-y-1 p-0 text-[11px] leading-tight font-extrabold text-foreground/90 tabular-nums">
        {labelsToShow.map((item) => (
          <li key={item.key} className="inline-flex items-center gap-1">
            <span
              className={`inline-block size-2.5 shrink-0 rounded-full border border-border ${item.dotClass}`}
              aria-hidden="true"
            />
            <span>
              {item.label} {item.rounded}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
