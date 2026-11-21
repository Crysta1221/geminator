import { ArrowLeft, ArrowRight, EyeOff } from "lucide-react";

import { WizardShell } from "#/components/game/WizardShell";
import { Button } from "#/components/ui/button";
import { useFocusHeading } from "#/lib/use-focus-heading";

type IntroScreenProps = {
  onBack: () => void;
  onContinue: () => void;
};

export function IntroScreen({ onBack, onContinue }: IntroScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();

  return (
    <WizardShell step={1}>
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-5 py-2 text-center sm:gap-6 [@media(max-height:700px)]:gap-3 [@media(max-height:700px)]:py-0">
        <div className="flex size-24 items-center justify-center rounded-3xl border-[3px] border-border bg-accent-yellow shadow-[5px_5px_0_#141414] sm:size-28 [@media(max-height:700px)]:size-18">
          <EyeOff
            className="size-12 sm:size-14 [@media(max-height:700px)]:size-9"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-2 [@media(max-height:700px)]:space-y-1">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 text-xl/snug font-black text-balance outline-none sm:text-2xl lg:text-3xl [@media(max-height:700px)]:text-lg"
          >
            出題者の人に画面を見せてください
          </h1>
          <p className="m-0 text-sm font-bold text-balance text-foreground/80 sm:text-base [@media(max-height:700px)]:text-xs">
            答える人は、このあとの画面を見ないでください。
          </p>
        </div>

        <p className="m-0 inline-block rounded-xl border-[3px] border-border bg-accent-cyan/45 px-5 py-2 text-2xl font-black font-heading shadow-[3px_3px_0_#141414] sm:text-3xl [@media(max-height:700px)]:px-4 [@media(max-height:700px)]:py-1.5 [@media(max-height:700px)]:text-xl">
          お題を決めましょう
        </p>

        <div className="flex w-full flex-col-reverse items-center justify-center gap-4 pt-1 sm:w-auto sm:flex-row [@media(max-height:700px)]:gap-3 [@media(max-height:700px)]:pt-0">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={onBack}
            className="min-h-11 w-full cursor-pointer border-[2.5px] font-black sm:w-auto sm:px-5"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            もどる
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onContinue}
            className="group min-h-12 w-full cursor-pointer border-[3px] px-8 text-base font-black sm:w-auto sm:text-lg"
          >
            <span>つづける</span>
            <ArrowRight
              className="size-5 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
    </WizardShell>
  );
}
