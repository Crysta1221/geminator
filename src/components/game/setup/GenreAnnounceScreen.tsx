import { ArrowRight, Dices, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

import { WizardShell } from "#/components/game/shared/WizardShell";
import { Button } from "#/components/ui/button";
import { useFocusHeading } from "#/hooks/use-focus-heading";

const ANNOUNCE_DURATION_MS = 2600;

type GenreAnnounceScreenProps = {
  genre: string;
  onComplete: () => void;
};

export function GenreAnnounceScreen({ genre, onComplete }: GenreAnnounceScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const prefersReduced = useReducedMotion();
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timer = window.setTimeout(finish, ANNOUNCE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <WizardShell className="bg-accent-yellow">
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-5 py-4 text-center sm:gap-6 sm:py-6 [@media(max-height:700px)]:gap-3.5 [@media(max-height:700px)]:py-2">
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-1.5 rounded-full border-[2.5px] border-border bg-secondary-background px-4 py-1 text-xs font-black shadow-[3px_3px_0_#141414] sm:text-sm"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          <span>お題が決まりました！</span>
        </motion.div>

        <motion.div
          initial={prefersReduced ? false : { opacity: 0, scale: 0.84, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 340,
            damping: 22,
            delay: prefersReduced ? 0 : 0.06,
          }}
          className="flex size-20 items-center justify-center rounded-3xl border-[3px] border-border bg-accent-cyan shadow-[5px_5px_0_#141414] sm:size-24 [@media(max-height:700px)]:size-16"
        >
          <Dices
            className="size-10 sm:size-12 [@media(max-height:700px)]:size-8"
            aria-hidden="true"
          />
        </motion.div>

        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.34,
            delay: prefersReduced ? 0 : 0.12,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="w-full max-w-[540px] rounded-2xl border-[3px] border-border bg-secondary-background px-5 py-4 shadow-[6px_6px_0_#141414] sm:px-8 sm:py-6"
        >
          <p className="m-0 text-xs font-black tracking-wider text-foreground/70 sm:text-sm">
            今回のテーマ
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 mt-1.5 text-2xl/tight font-black text-balance wrap-break-word outline-none sm:text-4xl [@media(max-height:700px)]:text-xl"
          >
            ジャンル「{genre}」
          </h1>
        </motion.div>

        <div className="flex w-full max-w-[360px] flex-col items-center gap-2">
          <div
            aria-hidden="true"
            className="h-3 w-full overflow-hidden rounded-full border-2 border-border bg-secondary-background shadow-[2px_2px_0_#141414]"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: ANNOUNCE_DURATION_MS / 1000,
                ease: "linear",
              }}
              style={{ transformOrigin: "left" }}
              className="size-full bg-accent-cyan"
            />
          </div>
          <output aria-live="polite" className="text-xs font-black text-foreground/80 sm:text-sm">
            まもなくチャット画面へ移動します…
          </output>
        </div>

        <Button
          type="button"
          variant="neutral"
          size="sm"
          onClick={finish}
          className="group min-h-10 cursor-pointer border-[2.5px] bg-secondary-background px-5 text-xs font-black sm:text-sm"
        >
          <span>すぐにはじめる</span>
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Button>
      </div>
    </WizardShell>
  );
}
