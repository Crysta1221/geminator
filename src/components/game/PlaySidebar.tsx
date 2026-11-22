import { Flag, HelpCircle, Lightbulb, Maximize2, MessageSquare } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "#/components/ui/button";
import { PROBABILITY_ORDER } from "#/lib/client-types";

type PlaySidebarProps = {
  questionCount: number;
  questionLimit: number | null;
  isGuessOnly: boolean;
  isSubmitting: boolean;
  confirmGiveUp: boolean;
  viewMode: "chat" | "maximized";
  onChangeViewMode: (mode: "chat" | "maximized") => void;
  onRequestGiveUp: () => void;
  onCancelGiveUp: () => void;
  onConfirmGiveUp: () => void;
};

export function PlaySidebar({
  questionCount,
  questionLimit,
  isGuessOnly,
  isSubmitting,
  confirmGiveUp,
  viewMode,
  onChangeViewMode,
  onRequestGiveUp,
  onCancelGiveUp,
  onConfirmGiveUp,
}: PlaySidebarProps) {
  const remaining = questionLimit !== null ? Math.max(0, questionLimit - questionCount) : null;
  const isLow = remaining !== null && remaining <= 3;
  const ratio =
    questionLimit !== null && questionLimit > 0
      ? Math.max(0, Math.min(1, (remaining ?? 0) / questionLimit))
      : 1;

  return (
    <aside
      aria-label="ゲーム情報"
      className="hidden min-h-0 flex-col justify-between gap-4 lg:flex"
    >
      <div className="flex flex-col gap-3.5">
        <div
          className={`neobrutal-stage space-y-2.5 px-5 py-4 ${
            isLow ? "animate-low-turns bg-accent-pink" : "bg-accent-cyan"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="m-0 text-xs font-black text-foreground/85">質問</p>
              {remaining !== null && (
                <span
                  className={`mt-0.5 inline-block rounded-full border-2 border-border px-2 py-0.5 text-[11px] font-black tabular-nums ${
                    isLow
                      ? "bg-accent-yellow text-foreground"
                      : "bg-secondary-background text-foreground"
                  }`}
                >
                  残り {remaining} 回
                </span>
              )}
            </div>
            <motion.p
              key={questionCount}
              initial={{ scale: 0.72 }}
              animate={{ scale: [0.72, 1.16, 1] }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              aria-live="polite"
              className="m-0 text-4xl leading-none font-black font-heading tabular-nums"
            >
              {questionLimit === null ? (
                <>
                  <span className="mr-1 text-base">質問 </span>
                  {questionCount}
                </>
              ) : (
                <>
                  {questionCount}
                  <span className="ml-0.5 text-xl text-foreground/75"> / {questionLimit}</span>
                </>
              )}
            </motion.p>
          </div>

          {questionLimit !== null && (
            <div
              role="progressbar"
              aria-label="残りの質問回数"
              aria-valuemin={0}
              aria-valuemax={questionLimit}
              aria-valuenow={remaining ?? 0}
              className="h-3.5 w-full overflow-hidden rounded-full border-2 border-border bg-secondary-background"
            >
              <motion.div
                initial={false}
                animate={{ scaleX: ratio }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "left" }}
                className={`size-full ${isLow ? "bg-[#e8385d]" : "bg-accent-yellow"}`}
              />
            </div>
          )}

          {isGuessOnly && (
            <output
              aria-live="polite"
              className="block rounded-xl border-2 border-border bg-secondary-background px-3 py-2 text-xs/snug font-black text-balance"
            >
              質問の回数に達しました。答えを入力してください
            </output>
          )}
        </div>

        <div className="neobrutal-box bg-secondary-background p-3">
          <div role="group" aria-label="表示モード" className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "chat" ? "default" : "neutral"}
              aria-pressed={viewMode === "chat"}
              onClick={() => onChangeViewMode("chat")}
              className={`min-h-10 cursor-pointer border-2 px-2 text-xs font-black ${
                viewMode === "chat" ? "bg-accent-yellow" : "bg-secondary-background"
              }`}
            >
              <MessageSquare className="size-3.5" aria-hidden="true" />
              チャット表示
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "maximized" ? "default" : "neutral"}
              aria-pressed={viewMode === "maximized"}
              onClick={() => onChangeViewMode("maximized")}
              className={`min-h-10 cursor-pointer border-2 px-2 text-xs font-black ${
                viewMode === "maximized" ? "bg-accent-yellow" : "bg-secondary-background"
              }`}
            >
              <Maximize2 className="size-3.5" aria-hidden="true" />
              最大化表示
            </Button>
          </div>
        </div>

        <div className="neobrutal-box space-y-2.5 bg-secondary-background p-4">
          <h2 className="m-0 text-sm font-black">答えの色分け</h2>
          <ul className="m-0 list-none space-y-1.5 p-0 text-xs font-extrabold">
            {PROBABILITY_ORDER.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span
                  className={`inline-block size-3.5 shrink-0 rounded-full border-2 border-border ${item.dotClass}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="neobrutal-box space-y-2 bg-secondary-background p-4">
          <h2 className="m-0 flex items-center gap-1.5 text-sm font-black">
            {isGuessOnly ? (
              <>
                <Lightbulb className="size-4" aria-hidden="true" />
                答えるモード
              </>
            ) : (
              <>
                <HelpCircle className="size-4" aria-hidden="true" />
                質問と回答
              </>
            )}
          </h2>
          <p className="m-0 text-xs/relaxed font-bold text-foreground/80">
            {isGuessOnly
              ? "「答える」は何度でも試せます。わからなければ下のボタンから答えを見られます。"
              : "質問すると AI が「はい / 部分的に / いいえ / わからない」で答えます。「〇〇ですね」「〇〇ですか？」と名前を当てるとそのまま結果へ進みます。"}
          </p>
        </div>
      </div>

      <div className="neobrutal-box bg-secondary-background p-3.5">
        {isGuessOnly ? (
          <Button
            type="button"
            variant="neutral"
            disabled={isSubmitting}
            onClick={onConfirmGiveUp}
            className="min-h-11 w-full cursor-pointer border-[2.5px] bg-accent-pink/40 font-black"
          >
            <Flag className="size-4" aria-hidden="true" />
            わからない
          </Button>
        ) : !confirmGiveUp ? (
          <Button
            type="button"
            variant="neutral"
            disabled={isSubmitting}
            onClick={onRequestGiveUp}
            className="min-h-11 w-full cursor-pointer border-[2.5px] font-black"
          >
            <Flag className="size-4" aria-hidden="true" />
            ギブアップして答えを見る
          </Button>
        ) : (
          <div className="space-y-3 text-center">
            <p className="m-0 text-xs font-black">本当にギブアップしますか？</p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                size="sm"
                variant="neutral"
                disabled={isSubmitting}
                onClick={onCancelGiveUp}
                className="min-h-11 cursor-pointer border-2 font-black"
              >
                続ける
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={onConfirmGiveUp}
                className="min-h-11 cursor-pointer border-2 bg-accent-pink font-black"
              >
                答えを見る
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
