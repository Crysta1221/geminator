import { CheckCircle2, Cpu, ExternalLink, GitBranch, Search, Sparkles, Zap } from "lucide-react";

import { ProbabilityBar } from "#/components/game/shared/ProbabilityBar";
import { ScrollArea } from "#/components/ui/scroll-area";
import { ASK_VERDICT_LABELS, GUESS_VERDICT_LABELS, PROBABILITY_ORDER } from "#/lib/client-types";
import type { InspectChatResult } from "#/lib/contract";

export type InspectHistoryItem = {
  id: string;
  text: string;
  result: InspectChatResult;
};

type ClassifierTracePanelProps = {
  item: InspectHistoryItem | null;
  isSubmitting: boolean;
  pendingText: string | null;
};

function formatPct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function getRouteSummary(result: InspectChatResult): {
  label: string;
  toneClass: string;
  verdictText: string;
} {
  const verdictText =
    result.final.kind === "ask"
      ? ASK_VERDICT_LABELS[result.final.verdict]
      : GUESS_VERDICT_LABELS[result.final.verdict];

  if (result.stringMatch.matched) {
    return {
      label: "文字列ショートカットで即正解",
      toneClass: "bg-accent-yellow",
      verdictText,
    };
  }
  if (result.final.kind === "guess") {
    return {
      label: "予想ルート (intent = guess)",
      toneClass: "bg-accent-purple/55",
      verdictText,
    };
  }
  if (result.final.verdict === "invalid") {
    return {
      label: "質問ルート → 妥当性しきい値未満 (invalid)",
      toneClass: "bg-accent-pink/60",
      verdictText,
    };
  }
  if (result.searchStep?.succeeded && result.searchStep.rejudged) {
    return {
      label: "質問ルート → 不明のため検索して再判定",
      toneClass: "bg-accent-mint/70",
      verdictText,
    };
  }
  return {
    label: "質問ルート (intent = question)",
    toneClass: "bg-accent-cyan/60",
    verdictText,
  };
}

export function ClassifierTracePanel({
  item,
  isSubmitting,
  pendingText,
}: ClassifierTracePanelProps) {
  if (isSubmitting && pendingText) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="neobrutal-sm bg-accent-yellow px-4 py-2 text-xs font-black sm:text-sm">
          「{pendingText}」を解析中…
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
          <span className="thinking-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Decisions API の4分類器を実行しています</span>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl border-[3px] border-border bg-accent-purple/35 shadow-[4px_4px_0_#141414]">
          <Cpu className="size-7" aria-hidden="true" />
        </span>
        <div className="max-w-sm space-y-1.5">
          <p className="m-0 text-base font-black sm:text-lg">
            質問を送ると分類器の裏側が表示されます
          </p>
          <p className="m-0 text-xs/relaxed font-bold text-foreground/75 sm:text-sm">
            左のチャットから「生き物ですか？」「こんにちは」「〇〇ですね」などを試すと、4つの分類器の確率分布やしきい値判定をリアルタイムで確認できます。
          </p>
        </div>
      </div>
    );
  }

  const { result } = item;
  const route = getRouteSummary(result);
  const snapshot = result.decisions?.snapshot;
  const isGuessRoute = snapshot?.intent.choice === "guess";
  const isAskValid = snapshot ? !isGuessRoute && snapshot.askable.passed : false;

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-3.5 p-3.5 sm:p-4">
        {/* Summary header */}
        <div className="rounded-xl border-[2.5px] border-border bg-background p-3 shadow-[3px_3px_0_#141414]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border-2 border-border px-2.5 py-0.5 text-[11px] font-black ${route.toneClass}`}
            >
              <GitBranch className="size-3" aria-hidden="true" />
              {route.label}
            </span>
            <span className="rounded-md border-2 border-border bg-secondary-background px-2 py-0.5 text-[11px] font-black tabular-nums">
              合計 {result.totalMs} ms
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="m-0 text-sm font-black wrap-break-word sm:text-base">
              発言：「{item.text}」
            </p>
            <span className="rounded-lg border-2 border-border bg-accent-yellow px-2.5 py-0.5 text-xs font-black sm:text-sm">
              最終判定：{route.verdictText}
            </span>
          </div>
        </div>

        {/* Stage 1: String Match */}
        <section className="rounded-xl border-[2.5px] border-border bg-secondary-background p-3 shadow-[3px_3px_0_#141414]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 flex items-center gap-1.5 text-xs font-black sm:text-sm">
              <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-border bg-accent-yellow text-[11px]">
                1
              </span>
              文字列正規化＆一致チェック（API呼び出し前）
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full border-2 border-border px-2 py-0.5 text-[11px] font-black ${
                result.stringMatch.matched ? "bg-accent-green" : "bg-background"
              }`}
            >
              {result.stringMatch.matched ? (
                <>
                  <Zap className="size-3" aria-hidden="true" />
                  一致（APIスキップで即正解）
                </>
              ) : (
                "不一致 → Decisions API へ"
              )}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs font-bold sm:grid-cols-2">
            <div className="rounded-lg border-2 border-border/20 bg-background px-2.5 py-1.5">
              <span className="text-[10px] font-black text-foreground/65">
                正規化（カナ統一・記号除去）
              </span>
              <p className="m-0 font-mono text-xs font-extrabold break-all">
                {result.stringMatch.normalizedMessage || "(空)"}
              </p>
            </div>
            <div className="rounded-lg border-2 border-border/20 bg-background px-2.5 py-1.5">
              <span className="text-[10px] font-black text-foreground/65">
                「〇〇ですね」等の枠を外した候補
              </span>
              <p className="m-0 font-mono text-xs font-extrabold break-all">
                {result.stringMatch.extractedCandidate || "(なし)"}
              </p>
            </div>
          </div>
        </section>

        {/* Stage 2: Decisions API 4 classifiers */}
        {result.decisions && snapshot && (
          <section className="space-y-3 rounded-xl border-[2.5px] border-border bg-secondary-background p-3 shadow-[3px_3px_0_#141414]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 flex items-center gap-1.5 text-xs font-black sm:text-sm">
                <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-border bg-accent-purple/60 text-[11px]">
                  2
                </span>
                Gemini Decisions API（4分類器を1回で同時実行）
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-black">
                  {result.models.decisions}
                </span>
                <span className="rounded-md border border-border bg-accent-cyan/40 px-2 py-0.5 text-[10px] font-black tabular-nums">
                  {result.decisions.durationMs} ms
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* Classifier 1: intent */}
              <div className="rounded-xl border-2 border-border bg-accent-cyan/15 p-2.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black">① intent（意図分類）</span>
                  <span className="rounded-md border border-border bg-accent-cyan px-1.5 py-0.5 text-[10px] font-black">
                    choice・採用
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 text-xs font-bold tabular-nums">
                  {(
                    [
                      { key: "question", label: "質問 (question)", bar: "bg-accent-cyan" },
                      { key: "guess", label: "予想 (guess)", bar: "bg-accent-purple" },
                    ] as const
                  ).map((row) => {
                    const p = snapshot.intent.probabilities[row.key];
                    const isWinner = snapshot.intent.choice === row.key;
                    return (
                      <div key={row.key} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={isWinner ? "font-black" : "text-foreground/75"}>
                            {isWinner ? "▶ " : ""}
                            {row.label}
                          </span>
                          <span className={isWinner ? "font-black" : "text-foreground/75"}>
                            {formatPct(p)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full border border-border bg-secondary-background">
                          <div
                            className={`h-full ${row.bar}`}
                            style={{ width: `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Classifier 2: askable */}
              <div
                className={`rounded-xl border-2 border-border p-2.5 ${
                  isGuessRoute
                    ? "bg-background/60 opacity-65"
                    : snapshot.askable.passed
                      ? "bg-accent-mint/25"
                      : "bg-accent-pink/25"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black">② askable（質問妥当性）</span>
                  <span
                    className={`rounded-md border border-border px-1.5 py-0.5 text-[10px] font-black ${
                      isGuessRoute
                        ? "bg-secondary-background"
                        : snapshot.askable.passed
                          ? "bg-accent-mint"
                          : "bg-accent-pink"
                    }`}
                  >
                    {isGuessRoute
                      ? "noul・参考値"
                      : snapshot.askable.passed
                        ? "noul・有効"
                        : "noul・無効"}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs font-black tabular-nums">
                    <span>スコア：{formatScore(snapshot.askable.score)}</span>
                    <span className="text-[11px] font-bold text-foreground/75">
                      しきい値 ≥ {formatScore(snapshot.askable.threshold)}
                    </span>
                  </div>
                  <div className="relative h-3.5 w-full overflow-hidden rounded-full border-2 border-border bg-secondary-background">
                    <div
                      className={`h-full ${
                        snapshot.askable.passed ? "bg-[#22b455]" : "bg-[#e8385d]"
                      }`}
                      style={{
                        width: `${Math.round(Math.max(0, Math.min(1, snapshot.askable.score)) * 100)}%`,
                      }}
                    />
                    <div
                      aria-hidden="true"
                      title={`しきい値 ${snapshot.askable.threshold}`}
                      style={{ left: `${snapshot.askable.threshold * 100}%` }}
                      className="absolute inset-y-0 w-0.5 bg-foreground"
                    />
                  </div>
                  <p className="m-0 text-[11px] font-bold text-foreground/75">
                    {isGuessRoute
                      ? "予想ルートが選ばれたため参考値です。"
                      : snapshot.askable.passed
                        ? "「はい / いいえで答えられる質問」と判定されました。"
                        : "しきい値 0.30 未満のため無効な質問（回数カウント外）になります。"}
                  </p>
                </div>
              </div>

              {/* Classifier 3: answer */}
              <div
                className={`rounded-xl border-2 border-border p-2.5 ${
                  isAskValid ? "bg-accent-yellow/25" : "bg-background/60 opacity-65"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black">③ answer（5択回答）</span>
                  <span
                    className={`rounded-md border border-border px-1.5 py-0.5 text-[10px] font-black ${
                      isAskValid ? "bg-accent-yellow" : "bg-secondary-background"
                    }`}
                  >
                    {isAskValid ? "choice・採用" : "choice・参考値"}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] font-bold tabular-nums">
                  {PROBABILITY_ORDER.map((opt) => {
                    const p = snapshot.answer.probabilities[opt.key];
                    const isWinner = snapshot.answer.choice === opt.key;
                    return (
                      <div
                        key={opt.key}
                        className="grid grid-cols-[92px_1fr_34px] items-center gap-1.5"
                      >
                        <span
                          className={`truncate ${isWinner ? "font-black text-foreground" : "text-foreground/75"}`}
                        >
                          {isWinner ? "▶ " : ""}
                          {opt.label}
                        </span>
                        <div className="h-2.5 overflow-hidden rounded-full border border-border bg-secondary-background">
                          <div
                            className={`h-full ${opt.barClass}`}
                            style={{ width: `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-right ${isWinner ? "font-black" : "text-foreground/75"}`}
                        >
                          {formatPct(p)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Classifier 4: guess */}
              <div
                className={`rounded-xl border-2 border-border p-2.5 ${
                  isGuessRoute ? "bg-accent-purple/25" : "bg-background/60 opacity-65"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black">④ guess（正解一致度）</span>
                  <span
                    className={`rounded-md border border-border px-1.5 py-0.5 text-[10px] font-black ${
                      isGuessRoute ? "bg-accent-purple/75" : "bg-secondary-background"
                    }`}
                  >
                    {isGuessRoute ? "choice・採用" : "choice・参考値"}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px] font-bold tabular-nums">
                  {(
                    [
                      { key: "same", label: "同一 (same)", bar: "bg-[#22b455]" },
                      { key: "close", label: "惜しい (close)", bar: "bg-accent-yellow" },
                      { key: "different", label: "別物 (different)", bar: "bg-[#e8385d]" },
                    ] as const
                  ).map((opt) => {
                    const p = snapshot.guess.probabilities[opt.key];
                    const isWinner = snapshot.guess.choice === opt.key;
                    return (
                      <div
                        key={opt.key}
                        className="grid grid-cols-[96px_1fr_34px] items-center gap-1.5"
                      >
                        <span
                          className={`truncate ${isWinner ? "font-black text-foreground" : "text-foreground/75"}`}
                        >
                          {isWinner ? "▶ " : ""}
                          {opt.label}
                        </span>
                        <div className="h-2.5 overflow-hidden rounded-full border border-border bg-secondary-background">
                          <div
                            className={`h-full ${opt.bar}`}
                            style={{ width: `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-right ${isWinner ? "font-black" : "text-foreground/75"}`}
                        >
                          {formatPct(p)}
                        </span>
                      </div>
                    );
                  })}
                  <p className="m-0 pt-0.5 text-[11px] text-foreground/75">
                    確信度 {formatPct(snapshot.guess.confidence)}（正解・惜しい認定には{" "}
                    {formatPct(snapshot.guess.threshold)} 以上が必要）
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Stage 3: Fallback search & rejudge */}
        {result.searchStep ? (
          <section className="space-y-2.5 rounded-xl border-[2.5px] border-border bg-accent-mint/20 p-3 shadow-[3px_3px_0_#141414]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 flex items-center gap-1.5 text-xs font-black sm:text-sm">
                <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-border bg-accent-mint text-[11px]">
                  3
                </span>
                「わからない」検出 → 外部検索＆再判定
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2 py-0.5 text-[11px] font-black">
                <Search className="size-3" aria-hidden="true" />
                {result.searchStep.provider === "google_search" ? "Google 検索" : "Wikipedia API"}・
                {result.searchStep.durationMs} ms
              </span>
            </div>

            {result.searchStep.succeeded && result.searchStep.reference ? (
              <div className="space-y-2.5">
                <div className="rounded-lg border-2 border-border bg-secondary-background p-2.5 text-xs font-bold">
                  <p className="m-0 text-[11px] font-black text-foreground/70">
                    取得した事実（共有入力に追記して2回目の判定へ）
                  </p>
                  <p className="m-0 mt-1 leading-relaxed whitespace-pre-wrap">
                    {result.searchStep.reference.text}
                  </p>
                  {result.searchStep.reference.sources.length > 0 && (
                    <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
                      {result.searchStep.reference.sources.map((src) => (
                        <li key={src.uri}>
                          <a
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-black text-foreground underline"
                          >
                            <span className="max-w-[180px] truncate">{src.title ?? src.uri}</span>
                            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {result.searchStep.rejudged && (
                  <div className="rounded-lg border-2 border-border bg-secondary-background p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-black">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        2回目の Decisions 再判定 →{" "}
                        {ASK_VERDICT_LABELS[result.searchStep.rejudged.verdict]}
                      </span>
                      <span className="text-[11px] font-black text-foreground/70 tabular-nums">
                        {result.searchStep.rejudged.durationMs} ms
                      </span>
                    </div>
                    <ProbabilityBar
                      probabilities={result.searchStep.rejudged.answer.probabilities}
                      animateBars={false}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="m-0 text-xs font-bold text-foreground/80">
                外部検索で記事・事実を取得できなかったため、1回目の「わからない」をそのまま返しました。
              </p>
            )}
          </section>
        ) : (
          result.decisions && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border/50 bg-background/70 px-3 py-2 text-xs font-bold text-foreground/75">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>
                1回目の判定で「わからない」にならなかったため、Wikipedia / Google
                検索のフォールバックは実行されませんでした。
              </span>
            </div>
          )
        )}
      </div>
    </ScrollArea>
  );
}
