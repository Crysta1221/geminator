import { motion } from "motion/react";

type LogoProps = {
  className?: string;
};

export const LOGO_TILES = [
  { char: "じ", bg: "bg-accent-yellow", tilt: -5, yEm: 0, small: false },
  { char: "ぇ", bg: "bg-accent-cyan", tilt: 3, yEm: -0.09, small: true },
  { char: "み", bg: "bg-accent-pink", tilt: -2, yEm: 0.06, small: false },
  { char: "ね", bg: "bg-accent-mint", tilt: 4, yEm: -0.06, small: false },
  { char: "い", bg: "bg-accent-orange", tilt: -4, yEm: 0.09, small: false },
  { char: "た", bg: "bg-accent-purple", tilt: 2, yEm: -0.03, small: false },
  { char: "ー", bg: "bg-accent-yellow", tilt: -3, yEm: 0.045, small: false },
] as const;

export function Logo({ className = "" }: LogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center px-3 pt-4 pb-2 select-none [@media(max-height:680px)]:scale-[0.86] ${className}`}
    >
      <span className="sr-only">じぇみねいたー</span>

      <div className="relative inline-flex items-center gap-[2px] sm:gap-1.5">
        <span
          aria-hidden="true"
          className="animate-sticker-wobble pointer-events-none absolute -top-4 -left-3 z-10 sm:-top-5 sm:-left-5"
        >
          <span className="inline-flex size-7 -rotate-12 items-center justify-center rounded-full border-[2.5px] border-border bg-accent-pink text-sm leading-none font-black font-heading text-foreground shadow-[3px_3px_0_#141414] sm:size-10 sm:border-[3px] sm:text-xl">
            ？
          </span>
        </span>

        <span
          aria-hidden="true"
          style={{ animationDelay: "1.2s" }}
          className="animate-sticker-wobble pointer-events-none absolute -top-4 -right-3 z-10 sm:-top-5 sm:-right-5"
        >
          <span className="inline-flex size-7 rotate-12 items-center justify-center rounded-full border-[2.5px] border-border bg-accent-yellow text-sm leading-none font-black font-heading text-foreground shadow-[3px_3px_0_#141414] sm:size-10 sm:border-[3px] sm:text-xl">
            ！
          </span>
        </span>

        {LOGO_TILES.map((tile, index) => (
          <motion.span
            key={`${tile.char}-${tile.tilt}`}
            aria-hidden="true"
            initial={{ opacity: 0, y: -28, scale: 0.72 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 19,
              delay: index * 0.06,
            }}
            className="inline-block"
          >
            <span
              className="animate-logo-float inline-block"
              style={{ animationDelay: `${0.55 + index * 0.22}s` }}
            >
              <span
                style={{
                  transform: `translateY(${tile.yEm}em) rotate(${tile.tilt}deg)`,
                  fontSize: tile.small
                    ? "clamp(1.85rem, 5.8vw, 3.7rem)"
                    : "clamp(2.25rem, 7vw, 4.5rem)",
                }}
                className={`inline-flex h-[1.22em] w-[1.16em] items-center justify-center rounded-xl border-[3px] border-border leading-none font-black font-heading text-foreground shadow-[5px_5px_0_#141414] ${tile.bg}`}
              >
                {tile.char}
              </span>
            </span>
          </motion.span>
        ))}
      </div>
    </div>
  );
}
