import { AlertTriangle, ArrowLeft, ArrowRight, ExternalLink, Server } from "lucide-react";
import { useEffect, useRef } from "react";

import { ApiKeyConnectionPanel } from "#/components/game/setup/ApiKeyConnectionPanel";
import { CUSTOM_STEPS, GENRE_STEPS, WizardShell } from "#/components/game/shared/WizardShell";
import { Button } from "#/components/ui/button";
import { useFocusHeading } from "#/hooks/use-focus-heading";
import type { ConnectionCheckState, TopicMode } from "#/lib/client-types";
import type { ErrorCode } from "#/lib/contract";

type ConnectScreenProps = {
  topicMode: TopicMode;
  serverHasKey: boolean;
  apiKey: string;
  useSearch: boolean;
  connection: ConnectionCheckState;
  errorCode: ErrorCode | null;
  onApiKeyChange: (value: string) => void;
  onClearApiKey: () => void;
  onTestConnection: () => void;
  onDismissError: () => void;
  onBack: () => void;
  onStart: () => void;
  onStartWithoutSearch: () => void;
};

export function ConnectScreen({
  topicMode,
  serverHasKey,
  apiKey,
  useSearch,
  connection,
  errorCode,
  onApiKeyChange,
  onClearApiKey,
  onTestConnection,
  onDismissError,
  onBack,
  onStart,
  onStartWithoutSearch,
}: ConnectScreenProps) {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const autoStartedRef = useRef(false);
  const autoSkippedRef = useRef(false);

  const hasKey = serverHasKey || apiKey.trim().length > 0;
  const needsTest =
    connection.decisions.status === "idle" ||
    connection.text.status === "idle" ||
    (useSearch && connection.search.status === "idle");

  const corePassed = connection.decisions.status === "ok" && connection.text.status === "ok";
  const searchFailedOnly = corePassed && useSearch && connection.search.status === "fail";
  const canStart =
    corePassed && (!useSearch || connection.search.status === "ok") && !connection.isTesting;

  useEffect(() => {
    if (!errorCode && hasKey && needsTest && !autoStartedRef.current && !connection.isTesting) {
      autoStartedRef.current = true;
      onTestConnection();
    }
  }, [errorCode, hasKey, needsTest, connection.isTesting, onTestConnection]);

  useEffect(() => {
    if (autoStartedRef.current && !autoSkippedRef.current && canStart) {
      autoSkippedRef.current = true;
      onStart();
    }
  }, [canStart, onStart]);

  return (
    <WizardShell
      step={topicMode === "genre" ? 2 : 3}
      steps={topicMode === "genre" ? GENRE_STEPS : CUSTOM_STEPS}
    >
      <div className="flex flex-col gap-4 [@media(max-height:700px)]:gap-2.5">
        <div className="flex flex-col gap-2.5 rounded-2xl border-[3px] border-border bg-accent-purple/30 p-4 shadow-[4px_4px_0_#141414] sm:flex-row sm:items-center sm:justify-between sm:gap-4 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:p-2.5">
          <div className="min-w-0 space-y-1">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="m-0 text-xl/snug font-black outline-none sm:text-2xl [@media(max-height:700px)]:text-base"
            >
              API キーと接続テスト
            </h1>
            {serverHasKey ? (
              <p className="m-0 flex items-center gap-1.5 text-sm font-black">
                <Server className="size-4 shrink-0" aria-hidden="true" />
                このサーバーのキーを使います
              </p>
            ) : (
              <p className="m-0 text-xs/snug font-bold text-balance text-foreground/85 sm:text-sm [@media(max-height:660px)]:hidden">
                キーはこのブラウザにだけ保存され、サーバーには保存されません。
              </p>
            )}
            <p className="m-0 text-xs font-bold text-balance text-foreground/75 [@media(max-height:700px)]:hidden">
              「質問の判定」と「お題の特定」の両方が成功すると次へ進めます。
            </p>
          </div>

          {!serverHasKey && (
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-secondary-background px-3.5 py-2 text-xs font-black text-foreground shadow-[3px_3px_0_#141414] transition-transform hover:translate-[2px] hover:shadow-none sm:text-sm [@media(max-height:700px)]:min-h-9 [@media(max-height:700px)]:py-1.5"
            >
              <span>キーの取得 (Google AI Studio)</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          )}
        </div>

        <ApiKeyConnectionPanel
          serverHasKey={serverHasKey}
          apiKey={apiKey}
          useSearch={useSearch}
          connection={connection}
          errorCode={errorCode}
          layout="responsive-split"
          idPrefix="connect"
          onApiKeyChange={onApiKeyChange}
          onClearApiKey={onClearApiKey}
          onTestConnection={onTestConnection}
          onDismissError={onDismissError}
        />

        {searchFailedOnly && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border-[2.5px] border-border bg-accent-yellow/75 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="m-0 text-xs/snug font-black text-balance sm:text-sm">
                検索は使えませんでした（無料枠のキーなど）。検索なしで続けますか？
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="neutral"
              onClick={onStartWithoutSearch}
              className="min-h-11 shrink-0 cursor-pointer border-2 bg-secondary-background font-black"
            >
              検索なしで続ける
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-0.5">
          <Button
            type="button"
            variant="neutral"
            onClick={onBack}
            disabled={connection.isTesting}
            className="min-h-11 cursor-pointer border-[2.5px] px-5 font-black"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            もどる
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!canStart}
            onClick={onStart}
            className="group min-h-11 cursor-pointer border-[3px] px-7 text-base font-black"
          >
            <span>次へ</span>
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
    </WizardShell>
  );
}
