import { ArrowLeft, ArrowRight, Dices, PenLine } from "lucide-react";

import { MODE_SELECT_STEPS, WizardShell } from "#/components/game/shared/WizardShell";
import { Button } from "#/components/ui/button";
import { useFocusHeading } from "#/hooks/use-focus-heading";
import type { TopicMode } from "#/lib/client-types";

type ModeScreenProps = {
  selectedMode: TopicMode;
  onBack: () => void;
  onSelectMode: (mode: TopicMode) => void;
};

const MODE_OPTIONS: readonly {
  mode: TopicMode;
  badge: string;
  title: string;
  desc: string;
  hint: string;
  icon: typeof PenLine;
  cardBg: string;
  badgeBg: string;
}[] = [
  {
    mode: "custom",
    badge: "2人〜で遊ぶ",
    title: "自由にお題を決める",
    desc: "出題者がお題（答え）と補足を自由に入力します。",
    hint: "オリジナルのお題を出したいときにおすすめ",
    icon: PenLine,
    cardBg: "bg-accent-cyan/30 hover:bg-accent-cyan/45",
    badgeBg: "bg-accent-cyan",
  },
  {
    mode: "genre",
    badge: "1人でもOK",
    title: "ジャンルから AI が考える",
    desc: "ジャンルを入力すると、Gemini 3.5 Flash-Lite がお題を自動で作ります。",
    hint: "答えを知らないまま1人で遊べます",
    icon: Dices,
    cardBg: "bg-accent-yellow/35 hover:bg-accent-yellow/55",
    badgeBg: "bg-accent-yellow",
  },
] as const;

export function ModeScreen({ selectedMode, onBack, onSelectMode }: ModeScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();

  return (
    <WizardShell step={0} steps={MODE_SELECT_STEPS}>
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 sm:gap-5 [@media(max-height:700px)]:gap-2.5">
        <div className="space-y-1 text-center">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 text-xl font-black outline-none sm:text-2xl lg:text-3xl [@media(max-height:700px)]:text-lg"
          >
            遊び方を選ぼう
          </h1>
          <p className="m-0 text-xs font-bold text-balance text-foreground/80 sm:text-sm [@media(max-height:700px)]:hidden">
            自分でお題を決めるか、ジャンルを指定して AI におまかせするかを選べます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [@media(max-height:700px)]:gap-3">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => onSelectMode(opt.mode)}
                className={`group flex cursor-pointer flex-col justify-between gap-4 rounded-2xl border-[3px] border-border p-4 text-left shadow-[5px_5px_0_#141414] transition-all hover:-translate-0.5 hover:shadow-[7px_7px_0_#141414] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-border active:translate-[3px] active:shadow-[2px_2px_0_#141414] sm:p-5 [@media(max-height:700px)]:gap-2.5 [@media(max-height:700px)]:p-3.5 ${opt.cardBg} ${
                  isSelected ? "ring-2 ring-border/40" : ""
                }`}
              >
                <div className="space-y-3 [@media(max-height:700px)]:space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex size-11 items-center justify-center rounded-xl border-[2.5px] border-border bg-secondary-background shadow-[3px_3px_0_#141414] sm:size-12 [@media(max-height:700px)]:size-9">
                      <Icon className="size-5 sm:size-6" aria-hidden="true" />
                    </span>
                    <span
                      className={`rounded-full border-2 border-border px-3 py-0.5 text-xs font-black shadow-[2px_2px_0_#141414] ${opt.badgeBg}`}
                    >
                      {opt.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="m-0 text-lg font-black sm:text-xl [@media(max-height:700px)]:text-base">
                      {opt.title}
                    </h2>
                    <p className="m-0 text-xs/relaxed font-bold text-foreground/85 sm:text-sm">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t-2 border-border/15 pt-2.5 [@media(max-height:700px)]:pt-2">
                  <span className="text-[11px] font-extrabold text-foreground/75 sm:text-xs">
                    {opt.hint}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-border bg-secondary-background px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_#141414]">
                    <span>選ぶ</span>
                    <ArrowRight
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-start pt-0.5">
          <Button
            type="button"
            variant="neutral"
            onClick={onBack}
            className="min-h-11 cursor-pointer border-[2.5px] px-4 font-black"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            もどる
          </Button>
        </div>
      </div>
    </WizardShell>
  );
}
