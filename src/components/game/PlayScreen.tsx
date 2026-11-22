import { Flag } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessageList } from "#/components/game/ChatMessageList";
import { PlayInputDock } from "#/components/game/PlayInputDock";
import { PlaySidebar } from "#/components/game/PlaySidebar";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import type { HistoryEntry, PendingHistoryEntry } from "#/lib/client-types";
import type { ErrorCode } from "#/lib/contract";
import { useFocusHeading } from "#/lib/use-focus-heading";

const STICK_THRESHOLD_PX = 80;

type PlayScreenProps = {
  history: readonly HistoryEntry[];
  pendingEntry: PendingHistoryEntry | null;
  questionCount: number;
  questionLimit: number | null;
  isGuessOnly: boolean;
  isSubmitting: boolean;
  apiKey?: string;
  errorCode: ErrorCode | null;
  onChat: (message: string) => Promise<boolean>;
  onGuess: (guess: string) => Promise<boolean>;
  onGiveUp: () => void;
  onDismissError: () => void;
  onReset: () => void;
  onListeningChange?: (listening: boolean) => void;
};

export function PlayScreen({
  history,
  pendingEntry,
  questionCount,
  questionLimit,
  isGuessOnly,
  isSubmitting,
  apiKey,
  errorCode,
  onChat,
  onGuess,
  onGiveUp,
  onDismissError,
  onReset,
  onListeningChange,
}: PlayScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const scrollWrapRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const ignoreScrollRef = useRef(false);

  const remaining = questionLimit !== null ? Math.max(0, questionLimit - questionCount) : null;
  const isLow = remaining !== null && remaining <= 3;
  const ratio =
    questionLimit !== null && questionLimit > 0
      ? Math.max(0, Math.min(1, (remaining ?? 0) / questionLimit))
      : 1;

  const pinToBottom = useCallback(() => {
    const viewport = scrollWrapRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport || !stickToBottomRef.current) return;
    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    if (Math.abs(viewport.scrollTop - maxScrollTop) <= 1) return;
    ignoreScrollRef.current = true;
    viewport.scrollTop = maxScrollTop;
    window.requestAnimationFrame(() => {
      ignoreScrollRef.current = false;
    });
  }, []);

  useEffect(() => {
    const root = scrollWrapRef.current;
    const viewport = root?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    const list = root?.querySelector<HTMLElement>('[data-slot="chat-message-list"]');
    if (!viewport) return;

    const handleScroll = () => {
      if (ignoreScrollRef.current) return;
      const gap = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      stickToBottomRef.current = gap <= STICK_THRESHOLD_PX;
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        pinToBottom();
      }
    });
    resizeObserver.observe(viewport);
    if (list) {
      resizeObserver.observe(list);
    }

    // 初期表示（リロード復元など）でも最下部へ合わせる
    pinToBottom();

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [pinToBottom]);

  useEffect(() => {
    if (isSubmitting) {
      stickToBottomRef.current = true;
    }
    if (!stickToBottomRef.current) return;
    if (history.length === 0 && !isSubmitting && !pendingEntry && !errorCode && !isGuessOnly) {
      return;
    }
    pinToBottom();
    const raf1 = window.requestAnimationFrame(() => {
      pinToBottom();
    });
    return () => window.cancelAnimationFrame(raf1);
  }, [history.length, isSubmitting, pendingEntry, errorCode, isGuessOnly, pinToBottom]);

  const handleSubmitText = (trimmed: string) => {
    return isGuessOnly ? onGuess(trimmed) : onChat(trimmed);
  };

  return (
    <section className="mx-auto flex size-full min-h-0 max-w-[1200px] flex-col p-3 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-6 lg:p-7 [@media(max-height:700px)]:p-2.5">
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        質問して答えを当てよう
      </h1>

      <div className="neobrutal-stage flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary-background">
        <div className="flex shrink-0 flex-col gap-1.5 border-b-2 border-border/20 bg-background/70 px-3 py-2 lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <motion.span
                key={questionCount}
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.15, 1] }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                aria-live="polite"
                className={`inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1 text-xs font-black tabular-nums shadow-[2px_2px_0_#141414] ${
                  isLow ? "animate-low-turns bg-accent-pink" : "bg-accent-cyan"
                }`}
              >
                {questionLimit === null ? (
                  `質問 ${questionCount}`
                ) : (
                  <>
                    <span>
                      {questionCount} / {questionLimit}
                    </span>
                    <span className="rounded-full bg-secondary-background px-1.5 text-[10px]">
                      残り{remaining}
                    </span>
                  </>
                )}
              </motion.span>
              {questionLimit !== null && (
                <div
                  aria-hidden="true"
                  className="hidden h-2.5 w-20 overflow-hidden rounded-full border-2 border-border bg-secondary-background sm:block"
                >
                  <motion.div
                    initial={false}
                    animate={{ scaleX: ratio }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: "left" }}
                    className={`size-full ${isLow ? "bg-[#e8385d]" : "bg-accent-yellow"}`}
                  />
                </div>
              )}
            </div>

            {isGuessOnly ? (
              <Button
                type="button"
                size="sm"
                variant="neutral"
                disabled={isSubmitting}
                onClick={onGiveUp}
                className="min-h-11 cursor-pointer border-2 bg-accent-pink/40 px-3 text-xs font-black [@media(max-height:700px)]:min-h-9"
              >
                <Flag className="size-3.5" aria-hidden="true" />
                わからない
              </Button>
            ) : !confirmGiveUp ? (
              <Button
                type="button"
                size="sm"
                variant="neutral"
                disabled={isSubmitting}
                onClick={() => setConfirmGiveUp(true)}
                className="min-h-11 cursor-pointer border-2 px-3 text-xs font-black [@media(max-height:700px)]:min-h-9"
              >
                <Flag className="size-3.5" aria-hidden="true" />
                ギブアップ
              </Button>
            ) : (
              <div className="flex items-center gap-3.5">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => {
                    setConfirmGiveUp(false);
                    onGiveUp();
                  }}
                  className="min-h-11 cursor-pointer border-2 bg-accent-pink px-3 text-xs font-black [@media(max-height:700px)]:min-h-9"
                >
                  答えを見る
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  disabled={isSubmitting}
                  onClick={() => setConfirmGiveUp(false)}
                  className="min-h-11 cursor-pointer border-2 px-3 text-xs font-black [@media(max-height:700px)]:min-h-9"
                >
                  続ける
                </Button>
              </div>
            )}
          </div>

          {isGuessOnly && (
            <output
              aria-live="polite"
              className="block rounded-lg border-2 border-border bg-accent-yellow/75 px-2.5 py-1 text-[11px] leading-snug font-black text-balance"
            >
              質問の回数に達しました。答えを入力してください
            </output>
          )}
        </div>

        <div ref={scrollWrapRef} className="min-h-0 flex-1">
          <ScrollArea className="size-full">
            <ChatMessageList
              history={history}
              pendingEntry={pendingEntry}
              isSubmitting={isSubmitting}
              errorCode={errorCode}
              onDismissError={onDismissError}
              onReset={onReset}
            />
          </ScrollArea>
        </div>

        <PlayInputDock
          isGuessOnly={isGuessOnly}
          isSubmitting={isSubmitting}
          apiKey={apiKey}
          onSubmitText={handleSubmitText}
          onListeningChange={onListeningChange}
        />
      </div>

      <PlaySidebar
        questionCount={questionCount}
        questionLimit={questionLimit}
        isGuessOnly={isGuessOnly}
        isSubmitting={isSubmitting}
        confirmGiveUp={confirmGiveUp}
        onRequestGiveUp={() => setConfirmGiveUp(true)}
        onCancelGiveUp={() => setConfirmGiveUp(false)}
        onConfirmGiveUp={() => {
          setConfirmGiveUp(false);
          onGiveUp();
        }}
      />
    </section>
  );
}
