import { LOGO_TILES } from "#/components/brand/Logo";
import { CUSTOM_STEPS, GENRE_STEPS, WizardShell } from "#/components/game/WizardShell";
import type { TopicMode } from "#/lib/client-types";
import { useFocusHeading } from "#/lib/use-focus-heading";

type StartingScreenProps = {
  topicMode: TopicMode;
};

export function StartingScreen({ topicMode }: StartingScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const isGenre = topicMode === "genre";

  return (
    <WizardShell step={isGenre ? 2 : 3} steps={isGenre ? GENRE_STEPS : CUSTOM_STEPS}>
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-6 py-6 text-center [@media(max-height:700px)]:min-h-[200px] [@media(max-height:700px)]:gap-4">
        <div aria-hidden="true" className="flex items-center justify-center gap-1.5 pt-3 sm:gap-2">
          {LOGO_TILES.map((tile, index) => (
            <span
              key={`${tile.char}-${tile.tilt}`}
              style={{ animationDelay: `${index * 0.1}s` }}
              className="animate-tile-hop inline-block"
            >
              <span
                style={{ transform: `rotate(${tile.tilt}deg)` }}
                className={`inline-flex items-center justify-center rounded-lg border-[2.5px] border-border leading-none font-black font-heading text-foreground shadow-[3px_3px_0_#141414] ${
                  tile.small
                    ? "size-8 text-sm sm:size-10 sm:text-lg"
                    : "size-9 text-base sm:size-12 sm:text-xl"
                } ${tile.bg}`}
              >
                {tile.char}
              </span>
            </span>
          ))}
        </div>

        <output aria-live="polite" className="space-y-1.5">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 text-xl font-black outline-none sm:text-2xl"
          >
            {isGenre ? "お題を作成しています…" : "お題を解析しています…"}
          </h1>
          <p className="m-0 text-xs font-bold text-foreground/75 sm:text-sm">
            {isGenre
              ? "Gemini 3.5 Flash-Lite がジャンルから秘密のお題を考えています。少々お待ちください。"
              : "AI がお題を特定しています。少々お待ちください。"}
          </p>
        </output>
      </div>
    </WizardShell>
  );
}
