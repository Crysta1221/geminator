import { Loader2, Mic, Send, Square, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useVoiceInput } from "#/hooks/use-voice-input";
import { LIMITS } from "#/lib/contract";

type PlayInputDockProps = {
  isGuessOnly: boolean;
  isSubmitting: boolean;
  apiKey?: string;
  onSubmitText: (text: string) => Promise<boolean>;
  onListeningChange?: (listening: boolean) => void;
};

export function PlayInputDock({
  isGuessOnly,
  isSubmitting,
  apiKey,
  onSubmitText,
  onListeningChange,
}: PlayInputDockProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasBusyRef = useRef(false);

  const maxLen = isGuessOnly ? LIMITS.guess : LIMITS.question;

  const submitValue = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || isSubmitting) return;
      setText("");
      const ok = await onSubmitText(trimmed);
      if (!ok) {
        setText(trimmed);
      }
    },
    [isSubmitting, onSubmitText],
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

  // Automatically restore focus to the input when submission or transcription finishes and it becomes enabled again
  useEffect(() => {
    if (wasBusyRef.current && !isBusy) {
      inputRef.current?.focus();
    }
    wasBusyRef.current = isBusy;
  }, [isBusy]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (voice.isListening || isBusy) return;
    await submitValue(text);
  };

  return (
    <div
      data-slot="play-input-dock"
      className="shrink-0 border-t-[3px] border-border bg-background px-3 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-4 sm:pt-3.5 sm:pb-[calc(16px+env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-col gap-3">
        {(voice.isListening || voice.isTranscribing) && (
          <output
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border-2 border-border bg-accent-pink/35 px-3 py-1.5 text-xs font-black"
          >
            {voice.isListening ? (
              <>
                <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-[#e8385d]" />
                <span>聞き取り中… 話し終わると自動で送信されます</span>
              </>
            ) : (
              <>
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                <span>音声を文字に起こしています…</span>
              </>
            )}
          </output>
        )}

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

        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          <Label htmlFor="play-input" className="sr-only">
            {isGuessOnly ? "答えを入力" : "質問や予想を入力"}
          </Label>
          <Input
            ref={inputRef}
            id="play-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={maxLen}
            disabled={isBusy}
            readOnly={voice.isListening}
            autoComplete="off"
            placeholder={
              voice.isListening
                ? "お話しください…"
                : isGuessOnly
                  ? "答えを入力..."
                  : "質問や予想を入力（例：生き物ですか？ / ピカチュウですね）"
            }
            className="h-11 min-w-0 flex-1 border-[3px] bg-secondary-background text-sm font-bold shadow-[3px_3px_0_#141414] sm:text-base"
          />
          <Button
            type="button"
            size="icon"
            variant={voice.isListening ? "default" : "neutral"}
            disabled={isBusy}
            aria-pressed={voice.isListening}
            aria-label={voice.isListening ? "録音を停止して送信" : "音声で入力する"}
            onClick={() => void voice.toggle(text)}
            className={`size-11 shrink-0 cursor-pointer border-[3px] ${
              voice.isListening ? "bg-accent-pink" : "bg-secondary-background"
            }`}
          >
            {voice.isTranscribing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : voice.isListening ? (
              <Square className="size-4 fill-current" aria-hidden="true" />
            ) : (
              <Mic className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 shrink-0 cursor-pointer border-[3px] px-3 font-black sm:min-w-[84px] sm:px-4"
          >
            <Send className="size-4" aria-hidden="true" />
            <span>{isGuessOnly ? "答える" : "送信"}</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
