import { ArrowLeft, ArrowRight, Cpu, Eye, Globe, Loader2, Sparkles } from "lucide-react";
import type { FormEvent } from "react";

import { ApiKeyField } from "#/components/game/shared/ApiKeyField";
import { ErrorBanner } from "#/components/game/shared/ErrorBanner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { useFocusHeading } from "#/hooks/use-focus-heading";
import { type ErrorCode, LIMITS } from "#/lib/contract";

const SAMPLE_TOPICS = [
  { answer: "ピカチュウ", notes: "ポケットモンスターの電気タイプのキャラクター" },
  { answer: "東京タワー", notes: "東京都港区にある赤い電波塔" },
  { answer: "織田信長", notes: "戦国時代の武将" },
  { answer: "ドラえもん", notes: "未来から来たネコ型ロボット" },
] as const;

const PIPELINE_STEPS = [
  {
    num: "1",
    title: "お題をプロフィール化",
    desc: "Gemini 3.5 Flash-Lite が正式名称・別名・概要を JSON で整理し、分類器への共有入力を作ります。",
    bg: "bg-accent-cyan/30",
  },
  {
    num: "2",
    title: "文字列一致ショートカット",
    desc: "「〇〇ですね」等の枠と記号を外して正規化し、正解や別名と一致すれば API を呼ばず即正解にします。",
    bg: "bg-accent-yellow/35",
  },
  {
    num: "3",
    title: "4分類器を1回で同時実行",
    desc: "Gemini Decisions API が「意図・質問妥当性・5択回答・正解一致度」の4つを1リクエストで並列計算します。",
    bg: "bg-accent-purple/30",
  },
  {
    num: "4",
    title: "不明時だけ検索して再判定",
    desc: "1回目で「わからない」が最大のときだけ Wikipedia / Google 検索で事実を取得し、追記して再分類します。",
    bg: "bg-accent-mint/40",
  },
] as const;

type InspectSetupViewProps = {
  answer: string;
  notes: string;
  useSearch: boolean;
  serverHasKey: boolean;
  apiKey: string;
  isRegistering: boolean;
  canStart: boolean;
  errorCode: ErrorCode | null;
  onAnswerChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onUseSearchChange: (checked: boolean) => void;
  onApiKeyChange: (value: string) => void;
  onClearApiKey: () => void;
  onDismissError: () => void;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
};

export function InspectSetupView({
  answer,
  notes,
  useSearch,
  serverHasKey,
  apiKey,
  isRegistering,
  canStart,
  errorCode,
  onAnswerChange,
  onNotesChange,
  onUseSearchChange,
  onApiKeyChange,
  onClearApiKey,
  onDismissError,
  onSubmit,
  onBack,
}: InspectSetupViewProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();

  return (
    <section className="mx-auto flex size-full max-w-[1120px] flex-col justify-center p-3 sm:p-6 lg:p-8 [@media(max-height:700px)]:py-2.5">
      <div className="neobrutal-stage flex max-h-full min-h-0 w-full flex-col gap-4 overflow-y-auto overscroll-contain bg-secondary-background p-4 sm:gap-5 sm:p-6 lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border/15 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-border bg-accent-purple/45 shadow-[3px_3px_0_#141414]">
              <Cpu className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="m-0 text-lg font-black outline-none sm:text-2xl"
              >
                仕組みを見る
              </h1>
              <p className="m-0 text-xs font-bold text-foreground/75 sm:text-sm">
                お題を表示したまま自分で質問して、分類器の裏側をリアルタイム観察できます
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={onBack}
            className="min-h-10 cursor-pointer border-[2.5px] px-4 font-black"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            トップへもどる
          </Button>
        </div>

        {errorCode && <ErrorBanner code={errorCode} onDismiss={onDismissError} />}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)] lg:gap-7">
          <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="inspect-answer" className="text-sm font-black">
                  試してみるお題（答え）
                </Label>
                <span className="text-xs font-bold text-foreground/70 tabular-nums">
                  {answer.length} / {LIMITS.answer}
                </span>
              </div>
              <Input
                id="inspect-answer"
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                maxLength={LIMITS.answer}
                placeholder="例：ピカチュウ、東京タワー、織田信長"
                required
                disabled={isRegistering}
                autoComplete="off"
                className="h-10 border-[2.5px] text-sm font-bold sm:h-11 sm:text-base"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-black text-foreground/70">サンプル：</span>
                {SAMPLE_TOPICS.map((sample) => (
                  <button
                    key={sample.answer}
                    type="button"
                    disabled={isRegistering}
                    onClick={() => {
                      onAnswerChange(sample.answer);
                      onNotesChange(sample.notes);
                    }}
                    className={`cursor-pointer rounded-full border-2 border-border px-2.5 py-0.5 text-[11px] font-black transition-colors sm:text-xs ${
                      answer.trim() === sample.answer
                        ? "bg-accent-yellow shadow-[2px_2px_0_#141414]"
                        : "bg-background hover:bg-accent-cyan/35"
                    }`}
                  >
                    {sample.answer}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="inspect-notes" className="text-sm font-black">
                  補足（任意）
                </Label>
                <span className="text-xs font-bold text-foreground/70 tabular-nums">
                  {notes.length} / {LIMITS.notes}
                </span>
              </div>
              <Textarea
                id="inspect-notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                maxLength={LIMITS.notes}
                disabled={isRegistering}
                rows={2}
                placeholder="例：ポケットモンスターの電気タイプのキャラクター など"
                className="min-h-[56px] resize-none border-[2.5px] text-sm font-bold"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border-[2.5px] border-border bg-accent-cyan/20 px-3.5 py-2.5">
              <div className="min-w-0">
                <Label
                  htmlFor="inspect-use-search"
                  className="flex items-center gap-1.5 text-xs font-black sm:text-sm"
                >
                  <Globe className="size-4 shrink-0" aria-hidden="true" />
                  不明時に Google 検索を使う
                </Label>
                <p className="m-0 text-[11px] font-bold text-foreground/75">
                  OFF の場合は無料の Wikipedia API で補完します
                </p>
              </div>
              <Switch
                id="inspect-use-search"
                checked={useSearch}
                disabled={isRegistering}
                onCheckedChange={onUseSearchChange}
              />
            </div>

            {!serverHasKey && (
              <ApiKeyField
                apiKey={apiKey}
                disabled={isRegistering}
                idPrefix="inspect"
                onChange={onApiKeyChange}
                onClear={onClearApiKey}
              />
            )}

            <Button
              type="submit"
              size="lg"
              disabled={!canStart}
              className="group min-h-12 cursor-pointer border-[3px] px-6 text-base font-black"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  <span>お題プロフィールを作成中…</span>
                </>
              ) : (
                <>
                  <Eye className="size-5" aria-hidden="true" />
                  <span>お題を出したまま仕組みを見る</span>
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </>
              )}
            </Button>
          </form>

          <aside
            aria-label="判定の仕組み"
            className="flex flex-col justify-between gap-3 rounded-2xl border-[3px] border-border bg-background p-4 shadow-[4px_4px_0_#141414]"
          >
            <div className="space-y-2.5">
              <h2 className="m-0 flex items-center gap-2 text-base font-black">
                <Sparkles className="size-4" aria-hidden="true" />
                1回の質問で裏側がやっていること
              </h2>
              <ol className="m-0 list-none space-y-2 p-0">
                {PIPELINE_STEPS.map((step) => (
                  <li
                    key={step.num}
                    className={`rounded-xl border-2 border-border p-2.5 shadow-[2px_2px_0_#141414] ${step.bg}`}
                  >
                    <p className="m-0 flex items-center gap-1.5 text-xs font-black sm:text-sm">
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-[11px]">
                        {step.num}
                      </span>
                      <span>{step.title}</span>
                    </p>
                    <p className="m-0 mt-1 text-[11px]/relaxed font-bold text-foreground/85 sm:text-xs">
                      {step.desc}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
