import { RefreshCw, RotateCcw, Search, Trophy } from "lucide-react";
import { motion } from "motion/react";

import { ConfettiBurst } from "#/components/game/ConfettiBurst";
import { ErrorBanner } from "#/components/game/ErrorBanner";
import { ProbabilityBar } from "#/components/game/ProbabilityBar";
import { ReferenceDetails, ReferenceList } from "#/components/game/ReferenceList";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import {
  ASK_VERDICT_LABELS,
  type GameOutcome,
  GUESS_VERDICT_LABELS,
  type HistoryEntry,
} from "#/lib/client-types";
import type { ErrorCode, RevealResult } from "#/lib/contract";
import { useFocusHeading } from "#/lib/use-focus-heading";

type ResultScreenProps = {
  outcome: GameOutcome;
  questionCount: number;
  questionLimit: number | null;
  history: readonly HistoryEntry[];
  reveal: RevealResult | null;
  isLoadingReveal: boolean;
  errorCode: ErrorCode | null;
  onDismissError: () => void;
  onRetryReveal: () => void;
  onRestart: () => void;
};

export function ResultScreen({
  outcome,
  questionCount,
  questionLimit,
  history,
  reveal,
  isLoadingReveal,
  errorCode,
  onDismissError,
  onRetryReveal,
  onRestart,
}: ResultScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const isCorrect = outcome === "correct";
  const references = reveal?.references ?? [];

  const usedRefIndices = new Set<number>();
  let refCursor = 0;
  const historyWithRefs = history.map((entry) => {
    if (entry.kind !== "ask" || !entry.searched) {
      return { entry, reference: undefined };
    }
    const idx = references.findIndex(
      (ref, i) => i >= refCursor && !usedRefIndices.has(i) && ref.question === entry.text,
    );
    if (idx !== -1) {
      usedRefIndices.add(idx);
      refCursor = idx + 1;
      return { entry, reference: references[idx] };
    }
    return { entry, reference: undefined };
  });
  const unmatchedReferences = references.filter((_, i) => !usedRefIndices.has(i));

  return (
    <section className="mx-auto flex size-full min-h-0 max-w-[1040px] flex-col gap-3 p-3 sm:gap-4 sm:p-6 lg:p-7 [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:p-2.5">
      {isCorrect && <ConfettiBurst />}

      {errorCode && (
        <div className="shrink-0">
          <ErrorBanner code={errorCode} onDismiss={onDismissError} onReset={onRestart} />
        </div>
      )}

      <div
        className={`neobrutal-stage shrink-0 p-4 sm:p-5 [@media(max-height:700px)]:p-3 ${
          isCorrect ? "bg-accent-yellow" : "bg-accent-gray"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6 [@media(max-height:700px)]:gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-col lg:items-start">
            <div className="flex items-center gap-2">
              {isCorrect && <Trophy className="size-6 sm:size-7" aria-hidden="true" />}
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="m-0 flex items-center gap-1.5 text-2xl font-black outline-none sm:text-3xl [@media(max-height:700px)]:text-xl"
              >
                {isCorrect ? "正解！" : "ギブアップ"}
              </h1>
            </div>
            <span className="rounded-full border-2 border-border bg-secondary-background px-3 py-0.5 text-xs font-black tabular-nums sm:text-sm">
              {questionLimit !== null
                ? `質問 ${questionCount} / ${questionLimit}`
                : `質問数 ${questionCount} 回`}
            </span>
          </div>

          <div className="min-w-0 flex-1" style={{ perspective: "900px" }}>
            {isLoadingReveal ? (
              <output className="flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-secondary-background px-4 py-3">
                <span className="thinking-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="text-sm font-black">答えを読み込み中…</span>
              </output>
            ) : reveal ? (
              <motion.div
                initial={{ rotateY: 88, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border-[3px] border-border bg-secondary-background px-4 py-3 shadow-[4px_4px_0_#141414] [@media(max-height:700px)]:px-3 [@media(max-height:700px)]:py-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-xs font-extrabold text-foreground/70">答え</span>
                  <p className="m-0 text-xl/tight font-black sm:text-2xl [@media(max-height:700px)]:text-lg">
                    {reveal.identified.name}
                  </p>
                  {reveal.answer !== reveal.identified.name && (
                    <span className="text-xs font-bold text-foreground/75">
                      （入力：{reveal.answer}）
                    </span>
                  )}
                </div>
                {reveal.notes && (
                  <p className="m-0 mt-1 line-clamp-2 text-xs font-bold text-foreground/85 sm:text-sm [@media(max-height:700px)]:line-clamp-1">
                    補足：{reveal.notes}
                  </p>
                )}
              </motion.div>
            ) : (
              <Button
                type="button"
                variant="neutral"
                onClick={onRetryReveal}
                className="min-h-11 cursor-pointer border-[2.5px] bg-secondary-background font-black"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                答えを再読み込み
              </Button>
            )}
          </div>

          <Button
            type="button"
            size="lg"
            variant="neutral"
            onClick={onRestart}
            className="min-h-11 shrink-0 cursor-pointer border-[3px] bg-secondary-background px-5 text-sm font-black sm:text-base"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            もう一度遊ぶ
          </Button>
        </div>
      </div>

      <div className="neobrutal-stage flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary-background p-3 sm:p-4 [@media(max-height:700px)]:p-2.5">
        <div className="mb-2.5 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-border/15 pb-2">
          <h2 className="m-0 text-sm font-black sm:text-base">質問の履歴（{history.length}）</h2>
          {references.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-accent-cyan/40 px-2.5 py-0.5 text-xs font-black">
              <Search className="size-3.5" aria-hidden="true" />
              検索 {references.length}件
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1">
          <ScrollArea className="size-full pr-2.5">
            {historyWithRefs.length === 0 && unmatchedReferences.length === 0 ? (
              <p className="m-0 py-6 text-center text-sm font-bold text-foreground/70">
                まだ質問や回答はありませんでした。
              </p>
            ) : (
              <div className="space-y-2.5 pb-2">
                {historyWithRefs.length > 0 && (
                  <ol className="m-0 list-none space-y-2.5 p-0">
                    {historyWithRefs.map(({ entry, reference }) => (
                      <li
                        key={entry.id}
                        className="space-y-1.5 rounded-xl border-2 border-border bg-background p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Badge
                              variant="neutral"
                              className={
                                entry.kind === "ask"
                                  ? "bg-accent-cyan font-black"
                                  : "bg-accent-yellow font-black"
                              }
                            >
                              {entry.kind === "ask" ? "質問" : "回答"}
                            </Badge>
                            <span className="text-sm font-extrabold wrap-break-word">
                              {entry.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md border-2 border-border bg-secondary-background px-2 py-0.5 text-xs font-black">
                              {entry.kind === "ask"
                                ? ASK_VERDICT_LABELS[entry.verdict]
                                : GUESS_VERDICT_LABELS[entry.verdict]}
                            </span>
                            {entry.kind === "ask" && entry.searched && (
                              <span className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2 py-0.5 text-[11px] font-extrabold">
                                <Search className="size-3" aria-hidden="true" />
                                検索
                              </span>
                            )}
                          </div>
                        </div>
                        {entry.kind === "ask" && entry.verdict !== "invalid" && (
                          <ProbabilityBar probabilities={entry.probabilities} animateBars={false} />
                        )}
                        {entry.kind === "ask" &&
                          entry.searched &&
                          (reference ? (
                            <ReferenceDetails reference={reference} />
                          ) : isLoadingReveal ? (
                            <p className="m-0 pt-1 text-xs font-bold text-foreground/70">
                              参考文献を読み込み中…
                            </p>
                          ) : null)}
                      </li>
                    ))}
                  </ol>
                )}

                {unmatchedReferences.length > 0 && (
                  <ReferenceList references={unmatchedReferences} />
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}
