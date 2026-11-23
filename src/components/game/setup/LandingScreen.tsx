import { ArrowRight, Cpu, MessageCircleQuestion, PenLine, Target } from "lucide-react";
import { motion } from "motion/react";

import { Logo } from "#/components/brand/Logo";
import { Button } from "#/components/ui/button";
import { useFocusHeading } from "#/hooks/use-focus-heading";

type LandingScreenProps = {
  onStart: () => void;
  onInspect: () => void;
};

const HOW_TO_PLAY = [
  {
    step: "1",
    title: "お題を決める",
    desc: (
      <>
        <span className="inline-block">自由にお題を入力するか、</span>
        <span className="inline-block">ジャンルから AI が自動作成します</span>
      </>
    ),
    icon: PenLine,
    bg: "bg-accent-cyan/35",
  },
  {
    step: "2",
    title: "自由に質問する",
    desc: (
      <>
        <span className="inline-block">回答者の質問に、AI が</span>
        <span className="inline-block">「はい / 部分的に /</span>{" "}
        <span className="inline-block">いいえ / わからない」</span>
        <span className="inline-block">で答えます。</span>
        <span className="inline-block">確率バーで推測しよう！</span>
      </>
    ),
    icon: MessageCircleQuestion,
    bg: "bg-accent-pink/35",
  },
  {
    step: "3",
    title: "答えを当てる",
    desc: (
      <>
        <span className="inline-block">わかったらそのまま</span>
        <span className="inline-block">「〇〇ですね」と送信。</span>
        <span className="inline-block">AI が「正解 / 惜しい / いいえ」</span>
        <span className="inline-block">で判定します</span>
      </>
    ),
    icon: Target,
    bg: "bg-accent-mint/45",
  },
] as const;

export function LandingScreen({ onStart, onInspect }: LandingScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();

  return (
    <section className="mx-auto flex size-full max-w-[1040px] flex-col items-center justify-center gap-5 px-4 py-5 sm:gap-7 sm:px-6 sm:py-8 lg:px-8 [@media(max-height:700px)]:gap-3 [@media(max-height:700px)]:py-3">
      <h1 ref={headingRef} tabIndex={-1} className="m-0 outline-none focus-visible:outline-none">
        <Logo />
      </h1>

      <div className="grid w-full max-w-[960px] grid-cols-1 gap-2.5 sm:gap-3.5 md:grid-cols-3 [@media(max-height:700px)]:gap-2">
        {HOW_TO_PLAY.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.34,
                delay: 0.25 + idx * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`neobrutal-box flex items-start gap-3 p-3 sm:p-4 md:flex-col md:gap-2.5 [@media(max-height:700px)]:items-center [@media(max-height:700px)]:p-2.5 ${item.bg}`}
            >
              <div className="flex shrink-0 items-center gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-xl border-[2.5px] border-border bg-secondary-background shadow-[2px_2px_0_#141414] sm:size-11 [@media(max-height:700px)]:size-8">
                  <Icon className="size-4 sm:size-5" aria-hidden="true" />
                </span>
                <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-border bg-main text-xs font-black font-heading md:hidden">
                  {item.step}
                </span>
              </div>
              <div className="min-w-0">
                <p className="m-0 flex items-center gap-1.5 text-sm/snug font-black sm:text-base">
                  <span className="hidden size-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main text-xs font-black md:inline-flex">
                    {item.step}
                  </span>
                  <span>{item.title}</span>
                </p>
                <p className="m-0 mt-1 text-xs/relaxed font-bold text-foreground/85 [@media(max-height:660px)]:hidden">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex w-full max-w-[540px] flex-col items-center justify-center gap-3 pt-1 sm:w-auto sm:flex-row sm:gap-4 sm:pt-2 [@media(max-height:700px)]:pt-0">
        <Button
          type="button"
          size="lg"
          onClick={onStart}
          className="group h-13 w-full min-w-[220px] cursor-pointer border-[3px] px-8 text-lg font-black sm:h-14 sm:w-auto sm:min-w-[240px] sm:text-xl [@media(max-height:700px)]:h-11 [@media(max-height:700px)]:text-base"
        >
          <span>はじめる</span>
          <ArrowRight
            className="size-5 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Button>
        <Button
          type="button"
          size="lg"
          variant="neutral"
          onClick={onInspect}
          className="group h-13 w-full min-w-[200px] cursor-pointer border-[3px] bg-secondary-background px-6 text-base font-black sm:h-14 sm:w-auto sm:text-lg [@media(max-height:700px)]:h-11 [@media(max-height:700px)]:text-sm"
        >
          <Cpu className="size-5" aria-hidden="true" />
          <span>仕組みを見る</span>
        </Button>
      </div>
    </section>
  );
}
