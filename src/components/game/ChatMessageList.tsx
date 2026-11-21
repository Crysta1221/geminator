import { Search } from "lucide-react";
import { motion } from "motion/react";

import { ErrorBanner } from "#/components/game/ErrorBanner";
import { ProbabilityBar } from "#/components/game/ProbabilityBar";
import { ASK_VERDICT_LABELS, GUESS_VERDICT_LABELS, type HistoryEntry } from "#/lib/client-types";
import type { AskVerdict, ErrorCode, GuessVerdict } from "#/lib/contract";

type ChatMessageListProps = {
  history: readonly HistoryEntry[];
  isSubmitting: boolean;
  errorCode: ErrorCode | null;
  onDismissError: () => void;
  onReset: () => void;
};

function askBubbleTone(verdict: AskVerdict): string {
  switch (verdict) {
    case "yes":
      return "bg-accent-green";
    case "partially_yes":
      return "bg-accent-lime";
    case "partially_no":
      return "bg-accent-coral";
    case "no":
      return "bg-accent-pink";
    case "unknown":
      return "bg-accent-gray";
    case "invalid":
      return "border-dashed bg-secondary-background shadow-none";
  }
}

function guessBubbleTone(verdict: GuessVerdict): string {
  switch (verdict) {
    case "correct":
      return "bg-accent-yellow";
    case "close":
      return "bg-accent-yellow/80";
    case "wrong":
      return "bg-accent-pink";
  }
}

const BUBBLE_TRANSITION = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function ChatMessageList({
  history,
  isSubmitting,
  errorCode,
  onDismissError,
  onReset,
}: ChatMessageListProps) {
  return (
    <div
      data-slot="chat-message-list"
      className="flex flex-col gap-3.5 px-3.5 pt-5 pb-6 sm:px-5 sm:pt-5 sm:pb-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="neobrutal-sm flex max-w-[92%] items-start gap-2.5 self-start rounded-bl-[4px] bg-accent-yellow px-3.5 py-2.5 sm:max-w-[84%]">
        <span className="mt-0.5 shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-black text-secondary-background">
          AI
        </span>
        <p className="m-0 text-sm/relaxed font-extrabold sm:text-base">
          お題が決まりました！自由に質問してね。AI が「はい / 部分的に / いいえ /
          わからない」で答えます。わかったらそのまま「〇〇ですね」と送って当てよう！
        </p>
      </div>

      {history.map((entry) => (
        <div key={entry.id} className="flex flex-col gap-2.5">
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={BUBBLE_TRANSITION}
            className="neobrutal-sm flex max-w-[88%] flex-col items-end gap-1 self-end rounded-br-[4px] bg-accent-cyan px-3.5 py-2.5 sm:max-w-[78%]"
          >
            <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-black text-secondary-background">
              {entry.kind === "ask" ? "質問" : "回答"}
            </span>
            <p className="m-0 text-sm/snug font-extrabold wrap-break-word sm:text-base">
              {entry.text}
            </p>
          </motion.div>

          {entry.kind === "ask" ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={BUBBLE_TRANSITION}
              className={`neobrutal-sm flex max-w-[92%] flex-col gap-1.5 self-start rounded-bl-[4px] px-3.5 py-2.5 sm:max-w-[84%] ${askBubbleTone(entry.verdict)}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-black text-secondary-background">
                  AI
                </span>
                <span
                  className={
                    entry.verdict === "invalid"
                      ? "text-sm font-extrabold sm:text-base"
                      : "text-lg font-black sm:text-xl"
                  }
                >
                  {ASK_VERDICT_LABELS[entry.verdict]}
                </span>
                {entry.searched && (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2 py-0.5 text-[11px] font-extrabold">
                    <Search className="size-3" aria-hidden="true" />
                    検索して調べました
                  </span>
                )}
              </div>
              {entry.verdict !== "invalid" && (
                <ProbabilityBar probabilities={entry.probabilities} />
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={BUBBLE_TRANSITION}
              className={`neobrutal-sm flex max-w-[92%] items-center gap-2.5 self-start rounded-bl-[4px] px-3.5 py-2.5 sm:max-w-[84%] ${guessBubbleTone(entry.verdict)}`}
            >
              <span className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-black text-secondary-background">
                AI
              </span>
              <span
                className={
                  entry.verdict === "correct"
                    ? "text-xl font-black sm:text-2xl"
                    : "text-lg font-black sm:text-xl"
                }
              >
                {GUESS_VERDICT_LABELS[entry.verdict]}
              </span>
            </motion.div>
          )}
        </div>
      ))}

      {isSubmitting && (
        <motion.output
          initial={{ opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={BUBBLE_TRANSITION}
          className="neobrutal-sm flex items-center gap-2.5 self-start rounded-bl-[4px] bg-secondary-background px-3.5 py-2.5"
        >
          <span className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-black text-secondary-background">
            AI
          </span>
          <span className="thinking-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="sr-only">考え中</span>
        </motion.output>
      )}

      {errorCode && <ErrorBanner code={errorCode} onDismiss={onDismissError} onReset={onReset} />}
    </div>
  );
}
