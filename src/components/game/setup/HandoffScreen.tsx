import { ArrowRight, Smartphone } from "lucide-react";

import { WizardShell } from "#/components/game/shared/WizardShell";
import { Button } from "#/components/ui/button";
import { useFocusHeading } from "#/hooks/use-focus-heading";

type HandoffScreenProps = {
  onStart: () => void;
};

export function HandoffScreen({ onStart }: HandoffScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();

  return (
    <WizardShell step={4} className="bg-accent-yellow">
      <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-6 py-4 text-center sm:py-6 [@media(max-height:700px)]:gap-3.5 [@media(max-height:700px)]:py-1">
        <div className="flex size-24 items-center justify-center rounded-3xl border-[3px] border-border bg-accent-cyan shadow-[5px_5px_0_#141414] sm:size-28 [@media(max-height:700px)]:size-18">
          <Smartphone
            className="size-12 sm:size-14 [@media(max-height:700px)]:size-9"
            aria-hidden="true"
          />
        </div>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="m-0 text-2xl/snug font-black text-balance outline-none sm:text-3xl [@media(max-height:700px)]:text-xl"
        >
          回答者に画面を渡してください
        </h1>

        <Button
          type="button"
          variant="neutral"
          size="lg"
          onClick={onStart}
          className="group min-h-12 w-full min-w-[230px] cursor-pointer border-[3px] bg-secondary-background px-8 text-base font-black sm:w-auto sm:text-lg"
        >
          <span>質問をはじめる</span>
          <ArrowRight
            className="size-5 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Button>
      </div>
    </WizardShell>
  );
}
