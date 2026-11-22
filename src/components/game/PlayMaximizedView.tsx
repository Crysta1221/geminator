import {
  Loader2,
  MessageCircleQuestion,
  Mic,
  Search,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { ErrorBanner } from "#/components/game/ErrorBanner";
import { ProbabilityBar } from "#/components/game/ProbabilityBar";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  ASK_VERDICT_LABELS,
  GUESS_VERDICT_LABELS,
  type HistoryEntry,
  type PendingHistoryEntry,
} from "#/lib/client-types";
import { type AskVerdict, type ErrorCode, type GuessVerdict, LIMITS } from "#/lib/contract";
import { useVoiceInput } from "#/lib/use-voice-input";

type PlayMaximizedViewProps = {
  history: readonly HistoryEntry[];
  pendingEntry: PendingHistoryEntry | null;
  isGuessOnly: boolean;
  isSubmitting: boolean;
  apiKey?: string;
  errorCode: ErrorCode | null;
  onChat: (message: string) => Promise<boolean>;
  onGuess: (guess: string) => Promise<boolean>;
  onDismissError: () => void;
  onReset: () => void;
  onListeningChange?: (listening: boolean) => void;
};

type InputMode = "ask" | "guess";

type OutcomeVisual = {
  symbol: "◯" | "△" | "✕";
  badgeClass: string;
  symbolLabel: string;
};

function getAskOutcomeVisual(verdict: AskVerdict): OutcomeVisual {
  switch (verdict) {
    case "yes":
      return {
        symbol: "◯",
        badgeClass: "bg-accent-green text-foreground",
        symbolLabel: "マル",
      };
    case "partially_yes":
      return {
        symbol: "△",
        badgeClass: "bg-accent-lime text-foreground",
        symbolLabel: "サンカク",
      };
    case "partially_no":
      return {
        symbol: "△",
        badgeClass: "bg-accent-coral text-foreground",
        symbolLabel: "サンカク",
      };
    case "unknown":
      return {
        symbol: "△",
        badgeClass: "bg-accent-gray text-foreground",
        symbolLabel: "サンカク",
      };
    case "no":
    case "invalid":
      return {
        symbol: "✕",
        badgeClass: "bg-accent-pink text-foreground",
        symbolLabel: "バツ",
      };
  }
}

function getGuessOutcomeVisual(verdict: GuessVerdict): OutcomeVisual {
  switch (verdict) {
    case "correct":
      return {
        symbol: "◯",
        badgeClass: "bg-accent-green text-foreground",
        symbolLabel: "マル",
      };
    case "close":
      return {
        symbol: "△",
        badgeClass: "bg-accent-yellow text-foreground",
        symbolLabel: "サンカク",
      };
    case "wrong":
      return {
        symbol: "✕",
        badgeClass: "bg-accent-pink text-foreground",
        symbolLabel: "バツ",
      };
  }
}

export function PlayMaximizedView({
  history,
  pendingEntry,
  isGuessOnly,
  isSubmitting,
  apiKey,
  errorCode,
  onChat,
  onGuess,
  onDismissError,
  onReset,
  onListeningChange,
}: PlayMaximizedViewProps) {
  const [inputMode, setInputMode] = useState<InputMode>("ask");
  const [text, setText] = useState("");

  const effectiveMode: InputMode = isGuessOnly ? "guess" : inputMode;
  const maxLen = effectiveMode === "guess" ? LIMITS.guess : LIMITS.question;

  const submitValue = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || isSubmitting) return;
      setText("");
      const ok = effectiveMode === "guess" ? await onGuess(trimmed) : await onChat(trimmed);
      if (!ok) {
        setText(trimmed);
      }
    },
    [effectiveMode, isSubmitting, onChat, onGuess],
  );

  const voice = useVoiceInput({
    apiKey,
    maxLength: maxLen,
    disabled: isSubmitting,
    onInterimText: (nextText) => setText(nextText),
    onComplete: submitValue,
  });

  const isBusy = isSubmitting || voice.isTranscribing;
  const canSubmit = text.trim().length > 0 && !isBusy && !voice.isListening;

  useEffect(() => {
    onListeningChange?.(voice.isListening);
  }, [voice.isListening, onListeningChange]);

  // Ensure BGM ducking is cleared if this view unmounts while listening
  useEffect(() => {
    return () => {
      onListeningChange?.(false);
    };
  }, [onListeningChange]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (voice.isListening || isBusy) return;
    await submitValue(text);
  };

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const outcomeVisual =
    latest === null
      ? null
      : latest.kind === "ask"
        ? getAskOutcomeVisual(latest.verdict)
        : getGuessOutcomeVisual(latest.verdict);
  const verdictLabel =
    latest === null
      ? null
      : latest.kind === "ask"
        ? ASK_VERDICT_LABELS[latest.verdict]
        : GUESS_VERDICT_LABELS[latest.verdict];

  return (
    <div
      data-slot="play-maximized-view"
      className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden"
    >
      {errorCode && (
        <div className="shrink-0 px-3.5 pt-3 sm:px-5">
          <ErrorBanner code={errorCode} onDismiss={onDismissError} onReset={onReset} />
        </div>
      )}

      {/* Center stage: latest outcome only, thinking state, or initial prompt */}
      <div
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-4 py-3 text-center sm:gap-4 sm:px-6"
      >
        {isSubmitting || pendingEntry ? (
          <motion.div
            key="thinking-stage"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3"
          >
            {pendingEntry && (
              <p className="neobrutal-sm m-0 max-w-md bg-accent-cyan px-3.5 py-1.5 text-sm font-black wrap-break-word">
                {pendingEntry.kind === "guess" ? "回答" : "質問"}: 「{pendingEntry.text}」
              </p>
            )}
            <div className="neobrutal-stage flex size-24 items-center justify-center rounded-full bg-accent-yellow sm:size-28">
              <span className="thinking-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
            <p className="m-0 text-lg font-black sm:text-xl">考え中…</p>
          </motion.div>
        ) : latest && outcomeVisual && verdictLabel ? (
          <motion.div
            key={latest.id}
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full max-w-md flex-col items-center gap-2.5 sm:gap-3"
          >
            <p className="neobrutal-sm m-0 max-w-full truncate bg-accent-cyan/70 px-3 py-1 text-xs font-black sm:text-sm">
              {latest.kind === "guess" ? "回答" : "質問"}: 「{latest.text}」
            </p>

            <div
              aria-label={`判定: ${outcomeVisual.symbolLabel}`}
              className={`neobrutal-stage flex size-24 items-center justify-center rounded-full text-5xl leading-none font-black select-none sm:size-28 sm:text-6xl ${outcomeVisual.badgeClass}`}
            >
              {outcomeVisual.symbol}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <p
                className={
                  latest.kind === "ask" && latest.verdict === "invalid"
                    ? "m-0 text-base font-black sm:text-lg"
                    : "m-0 text-2xl font-black font-heading sm:text-3xl"
                }
              >
                {verdictLabel}
              </p>
              {latest.kind === "ask" && latest.searched && (
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-background px-2.5 py-0.5 text-[11px] font-extrabold">
                  <Search className="size-3" aria-hidden="true" />
                  検索して調べました
                </span>
              )}
            </div>

            {latest.kind === "ask" && latest.verdict !== "invalid" && (
              <div className="w-full rounded-2xl border-2 border-border bg-background/80 px-3.5 py-2.5 text-left">
                <ProbabilityBar probabilities={latest.probabilities} />
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-3">
            <div className="neobrutal-stage flex size-24 items-center justify-center rounded-full bg-accent-yellow sm:size-28">
              <Mic className="size-10 sm:size-12" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="m-0 text-xl font-black font-heading sm:text-2xl">
                マイクを押して質問しよう
              </p>
              <p className="m-0 text-xs/relaxed font-bold text-foreground/75 sm:text-sm">
                声で質問すると、AI が ◯ / △ / ✕ で大きく答えます
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Voice-first input section with compact mode switch and fallback text input */}
      <div className="shrink-0 border-t-[3px] border-border bg-background px-3.5 pt-2.5 pb-[calc(14px+env(safe-area-inset-bottom))] sm:px-5">
        <div className="mx-auto flex max-w-xl flex-col gap-2.5">
          {/* Mode switch + status */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isGuessOnly ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-accent-yellow px-3 py-1 text-xs font-black">
                <Sparkles className="size-3.5" aria-hidden="true" />
                答えるモード（質問回数に達しました）
              </span>
            ) : (
              <div
                role="group"
                aria-label="入力モードの切り替え"
                className="inline-flex rounded-xl border-2 border-border bg-secondary-background p-0.5 shadow-[2px_2px_0_#141414]"
              >
                <button
                  type="button"
                  disabled={isBusy || voice.isListening}
                  aria-pressed={effectiveMode === "ask"}
                  onClick={() => setInputMode("ask")}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    effectiveMode === "ask"
                      ? "bg-accent-cyan text-foreground"
                      : "text-foreground/75 hover:bg-black/5"
                  }`}
                >
                  <MessageCircleQuestion className="size-3.5" aria-hidden="true" />
                  質問する
                </button>
                <button
                  type="button"
                  disabled={isBusy || voice.isListening}
                  aria-pressed={effectiveMode === "guess"}
                  onClick={() => setInputMode("guess")}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    effectiveMode === "guess"
                      ? "bg-accent-yellow text-foreground"
                      : "text-foreground/75 hover:bg-black/5"
                  }`}
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  答える
                </button>
              </div>
            )}

            {(voice.isListening || voice.isTranscribing) && (
              <output
                aria-live="polite"
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-accent-pink/35 px-2.5 py-0.5 text-[11px] font-black"
              >
                {voice.isListening ? (
                  <>
                    <span className="size-2 shrink-0 animate-pulse rounded-full bg-[#e8385d]" />
                    <span>聞き取り中…</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />
                    <span>文字起こし中…</span>
                  </>
                )}
              </output>
            )}
          </div>

          {voice.voiceError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-xl border-2 border-border bg-accent-coral px-3 py-1.5 text-xs font-black"
            >
              <span>{voice.voiceError}</span>
              <button
                type="button"
                onClick={voice.clearVoiceError}
                aria-label="音声入力のエラーを閉じる"
                className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-black/10"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Primary tactile microphone button */}
          <Button
            type="button"
            variant={voice.isListening ? "default" : "neutral"}
            disabled={isBusy}
            aria-pressed={voice.isListening}
            aria-label={voice.isListening ? "録音を停止して送信" : "音声で入力する"}
            onClick={() => void voice.toggle(text)}
            className={`h-14 w-full cursor-pointer border-[3px] text-base font-black shadow-[4px_4px_0_#141414] sm:h-16 sm:text-lg ${
              voice.isListening
                ? "bg-accent-pink text-foreground"
                : effectiveMode === "guess"
                  ? "bg-accent-yellow text-foreground"
                  : "bg-accent-cyan text-foreground"
            }`}
          >
            {voice.isTranscribing ? (
              <>
                <Loader2 className="size-5 animate-spin sm:size-6" aria-hidden="true" />
                <span>音声を文字に起こしています…</span>
              </>
            ) : voice.isListening ? (
              <>
                <Square className="size-5 fill-current sm:size-6" aria-hidden="true" />
                <span>話し終わると自動送信（タップで送信）</span>
              </>
            ) : (
              <>
                <Mic className="size-5 sm:size-6" aria-hidden="true" />
                <span>{effectiveMode === "guess" ? "マイクで答える" : "マイクで質問する"}</span>
              </>
            )}
          </Button>

          {/* Compact fallback text input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Label htmlFor="play-maximized-input" className="sr-only">
              {effectiveMode === "guess" ? "答えを入力" : "質問を入力"}
            </Label>
            <Input
              id="play-maximized-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={maxLen}
              disabled={isBusy}
              readOnly={voice.isListening}
              autoComplete="off"
              placeholder={
                voice.isListening
                  ? "お話しください…"
                  : effectiveMode === "guess"
                    ? "テキストで答える..."
                    : "テキストで質問（例：生き物ですか？）"
              }
              className="h-10 min-w-0 flex-1 border-2 bg-secondary-background text-xs font-bold shadow-[2px_2px_0_#141414] sm:text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="h-10 shrink-0 cursor-pointer border-2 px-3 text-xs font-black sm:px-4"
            >
              <Send className="size-3.5" aria-hidden="true" />
              <span>{effectiveMode === "guess" ? "答える" : "送信"}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
