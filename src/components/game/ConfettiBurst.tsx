import type { CSSProperties } from "react";

const COLORS = ["#FFD84D", "#5CD9FF", "#FF8AB8", "#7BE0A8", "#FF9F4A", "#B9A4FF"] as const;
const SHAPES = ["round", "ribbon", "square"] as const;

type ConfettiPiece = {
  id: number;
  left: number;
  dx: number;
  rot: number;
  delay: number;
  dur: number;
  color: string;
  shape: (typeof SHAPES)[number];
};

const PIECES: ConfettiPiece[] = Array.from({ length: 48 }, (_, idx) => {
  const left = 3 + ((idx * 29) % 94);
  const dx = ((idx % 9) - 4) * 32;
  const rot = (idx % 2 === 0 ? 1 : -1) * (360 + (idx % 5) * 140);
  const delay = (idx % 10) * 0.07;
  const dur = 2.0 + (idx % 5) * 0.28;

  return {
    id: idx,
    left,
    dx,
    rot,
    delay,
    dur,
    color: COLORS[idx % COLORS.length],
    shape: SHAPES[idx % SHAPES.length],
  };
});

export function ConfettiBurst() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {PIECES.map((piece) => {
        const style = {
          left: `${piece.left}%`,
          backgroundColor: piece.color,
          "--confetti-dx": `${piece.dx}px`,
          "--confetti-rot": `${piece.rot}deg`,
          "--confetti-delay": `${piece.delay}s`,
          "--confetti-dur": `${piece.dur}s`,
        } as CSSProperties;
        return (
          <span
            key={piece.id}
            style={style}
            className={`confetti-piece absolute -top-4 border-2 border-border ${
              piece.shape === "round"
                ? "size-3.5 rounded-full"
                : piece.shape === "ribbon"
                  ? "h-4.5 w-2.5 rounded-[3px]"
                  : "size-3 rounded-[3px]"
            }`}
          />
        );
      })}
    </div>
  );
}
