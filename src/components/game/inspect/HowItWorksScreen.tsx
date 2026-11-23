import { ArrowLeft, Cpu, Eye, GitBranch, MessageSquare, RotateCcw, Send } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import {
  ClassifierTracePanel,
  type InspectHistoryItem,
} from "#/components/game/inspect/ClassifierTracePanel";
import { InspectSetupView } from "#/components/game/inspect/InspectSetupView";
import {
  type ActiveInspectTopic,
  InspectTopicCard,
} from "#/components/game/inspect/InspectTopicCard";
import { ErrorBanner } from "#/components/game/shared/ErrorBanner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { ScrollArea } from "#/components/ui/scroll-area";
import { useFocusHeading } from "#/hooks/use-focus-heading";
import { submitInspectChat, submitTopic } from "#/lib/client-api";
import { ASK_VERDICT_LABELS, GUESS_VERDICT_LABELS } from "#/lib/client-types";
import { type ErrorCode, LIMITS, toErrorCode } from "#/lib/contract";

type HowItWorksScreenProps = {
  serverHasKey: boolean;
  apiKey: string;
  activeApiKey?: string;
  onApiKeyChange: (value: string) => void;
  onClearApiKey: () => void;
  onBack: () => void;
};

function createInspectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function HowItWorksScreen({
  serverHasKey,
  apiKey,
  activeApiKey,
  onApiKeyChange,
  onClearApiKey,
  onBack,
}: HowItWorksScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const [answer, setAnswer] = useState("");
  const [notes, setNotes] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [topic, setTopic] = useState<ActiveInspectTopic | null>(null);
  const [history, setHistory] = useState<InspectHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "trace">("chat");
  const [mobileTopicOpen, setMobileTopicOpen] = useState(false);

  const hasKey = serverHasKey || apiKey.trim().length > 0;
  const canStart = answer.trim().length > 0 && hasKey && !isRegistering;

  const selectedItem = useMemo(() => {
    if (history.length === 0) return null;
    if (selectedId) {
      const found = history.find((entry) => entry.id === selectedId);
      if (found) return found;
    }
    return history[history.length - 1];
  }, [history, selectedId]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer || !hasKey || isRegistering) return;

    setIsRegistering(true);
    setErrorCode(null);
    try {
      const res = await submitTopic({
        answer: trimmedAnswer,
        notes: notes.trim(),
        useSearch,
        apiKey: activeApiKey,
      });
      setTopic({
        token: res.token,
        answer: trimmedAnswer,
        notes: notes.trim(),
        useSearch,
        identified: res.identified,
      });
      setHistory([]);
      setSelectedId(null);
      setMessageInput("");
      setMobileTab("chat");
      setMobileTopicOpen(false);
    } catch (err) {
      setErrorCode(toErrorCode(err));
    } finally {
      setIsRegistering(false);
    }
  };

  const sendMessage = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || !topic || isSubmitting) return;

    setMessageInput("");
    setPendingText(trimmed);
    setIsSubmitting(true);
    setErrorCode(null);
    try {
      const res = await submitInspectChat({
        token: topic.token,
        message: trimmed,
        apiKey: activeApiKey,
      });
      const item: InspectHistoryItem = {
        id: createInspectId(),
        text: trimmed,
        result: res,
      };
      setHistory((prev) => [...prev, item]);
      setSelectedId(item.id);
      setMobileTab("trace");
    } catch (err) {
      setMessageInput(trimmed);
      setErrorCode(toErrorCode(err));
    } finally {
      setPendingText(null);
      setIsSubmitting(false);
    }
  };

  const handleSendSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(messageInput);
  };

  const handleResetTopic = () => {
    setTopic(null);
    setHistory([]);
    setSelectedId(null);
    setMessageInput("");
    setPendingText(null);
    setErrorCode(null);
  };

  if (!topic) {
    return (
      <InspectSetupView
        answer={answer}
        notes={notes}
        useSearch={useSearch}
        serverHasKey={serverHasKey}
        apiKey={apiKey}
        isRegistering={isRegistering}
        canStart={canStart}
        errorCode={errorCode}
        onAnswerChange={setAnswer}
        onNotesChange={setNotes}
        onUseSearchChange={setUseSearch}
        onApiKeyChange={onApiKeyChange}
        onClearApiKey={onClearApiKey}
        onDismissError={() => setErrorCode(null)}
        onSubmit={handleRegister}
        onBack={onBack}
      />
    );
  }

  const sampleQuestions = [
    { label: "生き物ですか？", hint: "通常質問" },
    { label: "日本に関係がありますか？", hint: "部分的かも" },
    { label: "こんにちは", hint: "無効質問" },
    { label: `${topic.identified.name}ですね`, hint: "即正解" },
  ];

  return (
    <section className="mx-auto flex size-full min-h-0 max-w-[1320px] flex-col gap-3 p-3 sm:p-5 lg:p-6">
      {/* Top header */}
      <header className="neobrutal-box flex shrink-0 flex-wrap items-center justify-between gap-2.5 bg-secondary-background px-3.5 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={onBack}
            className="min-h-9 cursor-pointer border-2 px-3 text-xs font-black"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            トップへ
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-accent-purple/45 px-3 py-0.5 text-xs font-black">
            <Cpu className="size-3.5" aria-hidden="true" />
            仕組みを見る
          </span>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-accent-yellow px-3 py-0.5 text-xs font-black outline-none sm:text-sm"
          >
            <Eye className="size-3.5 shrink-0" aria-hidden="true" />
            <span>お題：{topic.identified.name}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="表示切り替え"
            className="inline-flex rounded-lg border-2 border-border bg-background p-0.5 lg:hidden"
          >
            <button
              type="button"
              onClick={() => setMobileTab("chat")}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black ${
                mobileTab === "chat" ? "bg-accent-cyan" : ""
              }`}
            >
              <MessageSquare className="size-3.5" aria-hidden="true" />
              質問
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("trace")}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black ${
                mobileTab === "trace" ? "bg-accent-purple/60" : ""
              }`}
            >
              <GitBranch className="size-3.5" aria-hidden="true" />
              分類器
            </button>
          </div>

          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={handleResetTopic}
            className="min-h-9 cursor-pointer border-2 px-3 text-xs font-black"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            お題を変える
          </Button>
        </div>
      </header>

      {errorCode && (
        <div className="shrink-0">
          <ErrorBanner code={errorCode} onDismiss={() => setErrorCode(null)} />
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.25fr)]">
        {/* Left: Visible Topic Card + Interactive Question Chat */}
        <div
          className={`min-h-0 flex-col gap-3 ${mobileTab === "chat" ? "flex" : "hidden lg:flex"}`}
        >
          <InspectTopicCard
            topic={topic}
            mobileOpen={mobileTopicOpen}
            onToggleMobileOpen={() => setMobileTopicOpen((prev) => !prev)}
          />

          <div className="neobrutal-stage flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary-background">
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2.5 p-3.5">
                {history.length === 0 ? (
                  <div className="space-y-2.5 rounded-xl border-2 border-dashed border-border/40 bg-background/70 p-3.5 text-center">
                    <p className="m-0 text-xs font-black sm:text-sm">
                      下のサンプルや自由な質問を送ってみよう！
                    </p>
                    <p className="m-0 text-[11px] font-bold text-foreground/75">
                      送った質問ごとに、右側のパネルで4つの分類器のスコアを見比べられます。
                    </p>
                  </div>
                ) : (
                  history.map((entry) => {
                    const isSelected = selectedItem?.id === entry.id;
                    const verdictLabel =
                      entry.result.final.kind === "ask"
                        ? ASK_VERDICT_LABELS[entry.result.final.verdict]
                        : GUESS_VERDICT_LABELS[entry.result.final.verdict];
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(entry.id);
                          setMobileTab("trace");
                        }}
                        className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border-[2.5px] border-border p-3 text-left transition-all ${
                          isSelected
                            ? "bg-accent-cyan/35 shadow-[4px_4px_0_#141414]"
                            : "bg-background hover:bg-accent-cyan/15"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Badge
                              variant="neutral"
                              className={
                                entry.result.final.kind === "ask"
                                  ? "bg-accent-cyan font-black"
                                  : "bg-accent-yellow font-black"
                              }
                            >
                              {entry.result.final.kind === "ask" ? "質問" : "予想"}
                            </Badge>
                            <span className="truncate text-sm font-black">{entry.text}</span>
                          </div>
                          <span className="shrink-0 rounded-md border-2 border-border bg-secondary-background px-2 py-0.5 text-xs font-black">
                            {verdictLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-foreground/75">
                          <span>
                            {entry.result.stringMatch.matched
                              ? "文字列一致ショートカット"
                              : entry.result.searchStep?.succeeded
                                ? "Decisions + 検索再判定"
                                : "Decisions 4分類器"}
                          </span>
                          <span className="tabular-nums">
                            {entry.result.totalMs} ms {isSelected ? "・観察中" : "・タップで詳細"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}

                {isSubmitting && pendingText && (
                  <div className="rounded-xl border-2 border-border bg-accent-yellow/35 px-3 py-2.5 text-xs font-black">
                    「{pendingText}」を送信中…
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Sample prompt chips + Input form */}
            <div className="shrink-0 space-y-2 border-t-[3px] border-border bg-background p-3">
              <div className="flex flex-wrap gap-1.5">
                {sampleQuestions.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void sendMessage(sample.label)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5 text-[11px] font-black transition-colors hover:bg-accent-yellow disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{sample.label}</span>
                    <span className="text-[10px] text-foreground/65">({sample.hint})</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendSubmit} className="flex gap-2">
                <Label htmlFor="inspect-chat-input" className="sr-only">
                  質問や予想を入力
                </Label>
                <Input
                  id="inspect-chat-input"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  maxLength={LIMITS.question}
                  disabled={isSubmitting}
                  autoComplete="off"
                  placeholder="質問や予想を入力して分類器を試す…"
                  className="h-10 min-w-0 flex-1 border-[2.5px] bg-secondary-background text-sm font-bold shadow-[2px_2px_0_#141414]"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || isSubmitting}
                  className="h-10 shrink-0 cursor-pointer border-[2.5px] px-4 font-black"
                >
                  <Send className="size-4" aria-hidden="true" />
                  <span>判定</span>
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Right: Classifier Trace Panel */}
        <div
          className={`neobrutal-stage min-h-0 flex-col overflow-hidden bg-secondary-background ${
            mobileTab === "trace" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b-[2.5px] border-border bg-accent-purple/25 px-4 py-2.5">
            <h2 className="m-0 flex items-center gap-1.5 text-sm font-black sm:text-base">
              <GitBranch className="size-4" aria-hidden="true" />
              分類器の裏側（リアルタイム解析）
            </h2>
            {selectedItem && (
              <span className="rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5 text-[11px] font-black tabular-nums">
                {history.findIndex((e) => e.id === selectedItem.id) + 1} / {history.length} 件目
              </span>
            )}
          </div>

          <ClassifierTracePanel
            item={selectedItem}
            isSubmitting={isSubmitting}
            pendingText={pendingText}
          />
        </div>
      </div>
    </section>
  );
}
