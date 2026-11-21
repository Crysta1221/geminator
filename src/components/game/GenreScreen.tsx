import { ArrowLeft, ArrowRight, Dices } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ErrorBanner } from "#/components/game/ErrorBanner";
import {
  inferLimitMode,
  type LimitMode,
  resolveQuestionLimit,
} from "#/components/game/QuestionLimitField";
import { TopicOptionsFieldset } from "#/components/game/TopicOptionsFieldset";
import { GENRE_STEPS, WizardShell } from "#/components/game/WizardShell";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import type { DraftSetup } from "#/lib/client-types";
import { type ErrorCode, LIMITS } from "#/lib/contract";
import { useFocusHeading } from "#/lib/use-focus-heading";

type GenreScreenProps = {
  initialDraft: DraftSetup;
  errorCode: ErrorCode | null;
  onDismissError: () => void;
  onBack: () => void;
  onNext: (draft: DraftSetup) => void;
};

const QUICK_GENRES = [
  "動物",
  "食べ物",
  "アニメ・ゲーム",
  "歴史上の人物",
  "日本の名所",
  "映画",
  "スポーツ",
] as const;

const GENRE_EXAMPLES = [
  { genre: "日本の戦国武将", desc: "有名な武将の中から1人を自動で出題" },
  { genre: "ジブリ映画", desc: "作品名を1つ選んで秘密のまま開始" },
  { genre: "コンビニスイーツ", desc: "細かいジャンルでもOK" },
] as const;

export function GenreScreen({
  initialDraft,
  errorCode,
  onDismissError,
  onBack,
  onNext,
}: GenreScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const initialLimit = inferLimitMode(initialDraft.questionLimit);
  const [genre, setGenre] = useState(initialDraft.genre);
  const [useSearch, setUseSearch] = useState(initialDraft.useSearch);
  const [limitMode, setLimitMode] = useState<LimitMode>(initialLimit.mode);
  const [customLimitText, setCustomLimitText] = useState(initialLimit.customText);

  const resolvedLimit = resolveQuestionLimit(limitMode, customLimitText);
  const isCustomInvalid = limitMode === "custom" && !resolvedLimit.valid;
  const canSubmit = genre.trim().length > 0 && resolvedLimit.valid;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onNext({
      mode: "genre",
      answer: "",
      notes: "",
      genre: genre.trim(),
      useSearch,
      questionLimit: resolvedLimit.value,
    });
  };

  return (
    <WizardShell step={1} steps={GENRE_STEPS}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] lg:gap-7 [@media(max-height:700px)]:gap-2">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:gap-3.5 [@media(max-height:700px)]:gap-1.5"
        >
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 text-xl font-black outline-none sm:text-2xl [@media(max-height:700px)]:text-base"
          >
            ジャンルを決めよう
          </h1>

          {errorCode && <ErrorBanner code={errorCode} onDismiss={onDismissError} />}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="genre-input" className="text-sm font-black">
                お題のジャンル
              </Label>
              <span className="text-xs font-bold text-foreground/70 tabular-nums">
                {genre.length} / {LIMITS.genre}
              </span>
            </div>
            <Input
              id="genre-input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              maxLength={LIMITS.genre}
              placeholder="例：ポケモン、日本の戦国武将、食べ物、映画"
              required
              autoComplete="off"
              aria-describedby="genre-input-hint"
              className="h-10 border-[2.5px] text-sm font-bold sm:h-11 sm:text-base [@media(max-height:700px)]:h-9"
            />
            <p
              id="genre-input-hint"
              className="m-0 text-[11px] font-bold text-foreground/75 sm:text-xs"
            >
              入力したジャンルから Gemini 3.5 Flash-Lite が自動で1つお題を作成します。
            </p>

            <div className="flex flex-wrap gap-1.5 pt-0.5 [@media(max-height:660px)]:hidden">
              {QUICK_GENRES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setGenre(chip)}
                  className={`cursor-pointer rounded-full border-2 border-border px-2.5 py-0.5 text-[11px] font-black transition-colors sm:text-xs ${
                    genre.trim() === chip
                      ? "bg-accent-yellow shadow-[2px_2px_0_#141414]"
                      : "bg-background hover:bg-accent-cyan/35"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <TopicOptionsFieldset
            idPrefix="genre"
            useSearch={useSearch}
            onUseSearchChange={setUseSearch}
            limitMode={limitMode}
            customLimitText={customLimitText}
            isCustomInvalid={isCustomInvalid}
            onLimitModeChange={setLimitMode}
            onCustomLimitTextChange={setCustomLimitText}
          />

          <div className="flex items-center justify-between gap-4 pt-0.5">
            <Button
              type="button"
              variant="neutral"
              onClick={onBack}
              className="min-h-11 cursor-pointer border-[2.5px] px-4 font-black"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              もどる
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit}
              className="group min-h-11 cursor-pointer border-[3px] px-6 text-base font-black"
            >
              <span>お題を作ってはじめる</span>
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Button>
          </div>
        </form>

        <aside
          aria-label="ジャンルのコツ"
          className="hidden flex-col justify-between gap-3 rounded-2xl border-[3px] border-border bg-accent-cyan/25 p-4 shadow-[4px_4px_0_#141414] lg:flex"
        >
          <div className="space-y-3">
            <h2 className="m-0 flex items-center gap-2 text-base font-black sm:text-lg">
              <span className="inline-flex size-8 items-center justify-center rounded-lg border-2 border-border bg-accent-yellow">
                <Dices className="size-4" aria-hidden="true" />
              </span>
              AI おまかせ出題
            </h2>
            <p className="m-0 text-xs/relaxed font-bold text-foreground/85 sm:text-sm">
              好きなジャンルを自由に書くだけで、答えを隠したままゲームをスタートできます。
            </p>
            <ul className="m-0 list-none space-y-2 p-0">
              {GENRE_EXAMPLES.map((ex) => (
                <li
                  key={ex.genre}
                  className="flex flex-col gap-0.5 rounded-xl border-2 border-border bg-secondary-background px-3 py-2 text-xs font-bold shadow-[2px_2px_0_#141414] sm:text-sm"
                >
                  <span className="font-black">「{ex.genre}」</span>
                  <span className="text-xs text-foreground/75">{ex.desc}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="m-0 text-[11px] font-bold text-foreground/70">
            ※ 作成されたお題は暗号化され、正解するかギブアップするまで表示されません。
          </p>
        </aside>
      </div>
    </WizardShell>
  );
}
