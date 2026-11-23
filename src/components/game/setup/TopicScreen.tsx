import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import { type FormEvent, useState } from "react";

import {
  inferLimitMode,
  type LimitMode,
  resolveQuestionLimit,
} from "#/components/game/setup/QuestionLimitField";
import { TopicOptionsFieldset } from "#/components/game/setup/TopicOptionsFieldset";
import { WizardShell } from "#/components/game/shared/WizardShell";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { useFocusHeading } from "#/hooks/use-focus-heading";
import type { DraftSetup } from "#/lib/client-types";
import { LIMITS } from "#/lib/contract";

type TopicScreenProps = {
  initialDraft: DraftSetup;
  onBack: () => void;
  onNext: (draft: DraftSetup) => void;
};

const EXAMPLES = [
  { answer: "さくら", notes: "春に咲く花" },
  { answer: "マリオ", notes: "任天堂のゲームの主人公" },
  { answer: "東京タワー", notes: "東京都港区にある赤い電波塔" },
] as const;

export function TopicScreen({ initialDraft, onBack, onNext }: TopicScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const initialLimit = inferLimitMode(initialDraft.questionLimit);
  const [answer, setAnswer] = useState(initialDraft.answer);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [useSearch, setUseSearch] = useState(initialDraft.useSearch);
  const [limitMode, setLimitMode] = useState<LimitMode>(initialLimit.mode);
  const [customLimitText, setCustomLimitText] = useState(initialLimit.customText);

  const resolvedLimit = resolveQuestionLimit(limitMode, customLimitText);
  const isCustomInvalid = limitMode === "custom" && !resolvedLimit.valid;
  const canSubmit = answer.trim().length > 0 && resolvedLimit.valid;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onNext({
      mode: "custom",
      answer: answer.trim(),
      notes: notes.trim(),
      genre: "",
      useSearch,
      questionLimit: resolvedLimit.value,
    });
  };

  return (
    <WizardShell step={2}>
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
            お題と補足を決めよう
          </h1>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="topic-answer" className="text-sm font-black">
                お題（答え）
              </Label>
              <span className="text-xs font-bold text-foreground/70 tabular-nums">
                {answer.length} / {LIMITS.answer}
              </span>
            </div>
            <Input
              id="topic-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={LIMITS.answer}
              placeholder="例：ピカチュウ、東京タワー、織田信長"
              required
              autoComplete="off"
              aria-describedby="topic-answer-hint"
              className="h-10 border-[2.5px] text-sm font-bold sm:h-11 sm:text-base [@media(max-height:700px)]:h-9"
            />
            <p
              id="topic-answer-hint"
              className="m-0 text-[11px] font-bold text-foreground/75 sm:text-xs"
            >
              答えは正式名称で入力してください。
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="topic-notes" className="text-sm font-black">
                補足（任意）
              </Label>
              <span className="text-xs font-bold text-foreground/70 tabular-nums">
                {notes.length} / {LIMITS.notes}
              </span>
            </div>
            <Textarea
              id="topic-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={LIMITS.notes}
              placeholder="例：1996年に発売されたゲームのキャラクター など"
              rows={2}
              aria-describedby="topic-notes-hint"
              className="min-h-[54px] resize-none border-[2.5px] text-sm font-bold sm:min-h-[68px] [@media(max-height:700px)]:min-h-[42px]"
            />
            <p
              id="topic-notes-hint"
              className="m-0 text-[11px] leading-snug font-bold text-balance text-foreground/75 sm:text-xs"
            >
              同じ名前の別の人物・作品・物などが複数考えられる場合は、どれを指すかを補足に書いてください。
            </p>
          </div>

          <TopicOptionsFieldset
            idPrefix="topic"
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
              <span>つぎへ</span>
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Button>
          </div>
        </form>

        <aside
          aria-label="書き方のコツ"
          className="hidden flex-col justify-between gap-3 rounded-2xl border-[3px] border-border bg-accent-yellow/35 p-4 shadow-[4px_4px_0_#141414] lg:flex"
        >
          <div className="space-y-3">
            <h2 className="m-0 flex items-center gap-2 text-base font-black sm:text-lg">
              <span className="inline-flex size-8 items-center justify-center rounded-lg border-2 border-border bg-main">
                <Lightbulb className="size-4" aria-hidden="true" />
              </span>
              書き方のコツ
            </h2>
            <p className="m-0 text-xs/relaxed font-bold text-foreground/85 sm:text-sm">
              同名が多い言葉は、補足をひと言添えるだけで AI の判定がぐっと安定します。
            </p>
            <ul className="m-0 list-none space-y-2 p-0">
              {EXAMPLES.map((ex) => (
                <li
                  key={ex.answer}
                  className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded-xl border-2 border-border bg-secondary-background px-3 py-2 text-xs font-bold shadow-[2px_2px_0_#141414] sm:text-sm"
                >
                  <span className="shrink-0 font-black">「{ex.answer}」</span>
                  <span className="shrink-0 text-foreground/60">→</span>
                  <span className="wrap-break-word">補足「{ex.notes}」</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="m-0 text-[11px] font-bold text-foreground/70">
            ※ 入力したお題と補足は、回答者の画面には表示されません。
          </p>
        </aside>
      </div>
    </WizardShell>
  );
}
