import { PlugZap } from "lucide-react";

import { ApiKeyField } from "#/components/game/ApiKeyField";
import { ConnectionChecklist } from "#/components/game/ConnectionChecklist";
import { ErrorBanner } from "#/components/game/ErrorBanner";
import { Button } from "#/components/ui/button";
import type { ConnectionCheckState } from "#/lib/client-types";
import type { ErrorCode } from "#/lib/contract";

type ApiKeyConnectionPanelProps = {
  serverHasKey: boolean;
  apiKey: string;
  useSearch: boolean;
  connection: ConnectionCheckState;
  errorCode: ErrorCode | null;
  layout?: "stacked" | "responsive-split";
  idPrefix?: string;
  onApiKeyChange: (value: string) => void;
  onClearApiKey: () => void;
  onTestConnection: () => void;
  onDismissError: () => void;
};

export function ApiKeyConnectionPanel({
  serverHasKey,
  apiKey,
  useSearch,
  connection,
  errorCode,
  layout = "stacked",
  idPrefix,
  onApiKeyChange,
  onClearApiKey,
  onTestConnection,
  onDismissError,
}: ApiKeyConnectionPanelProps) {
  const canTest = !connection.isTesting && (serverHasKey || apiKey.trim().length > 0);

  const isSplit = layout === "responsive-split" && !serverHasKey;

  return (
    <div className="space-y-3 [@media(max-height:700px)]:space-y-2">
      {errorCode && <ErrorBanner code={errorCode} onDismiss={onDismissError} />}

      <div
        className={
          isSplit
            ? "grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-5 [@media(max-height:700px)]:gap-2"
            : "flex flex-col gap-3 [@media(max-height:700px)]:gap-2"
        }
      >
        {!serverHasKey && (
          <div className="flex h-full flex-col justify-between gap-3 [@media(max-height:700px)]:gap-2">
            <ApiKeyField
              apiKey={apiKey}
              disabled={connection.isTesting}
              idPrefix={idPrefix}
              className={isSplit ? "flex-1" : undefined}
              onChange={onApiKeyChange}
              onClear={onClearApiKey}
            />
            <Button
              type="button"
              variant="neutral"
              disabled={!canTest}
              onClick={onTestConnection}
              className="min-h-11 w-full shrink-0 cursor-pointer border-[2.5px] font-black [@media(max-height:700px)]:min-h-10"
            >
              <PlugZap className="size-4" aria-hidden="true" />
              {connection.isTesting ? "テスト中…" : "接続テスト"}
            </Button>
          </div>
        )}

        <div className="flex h-full flex-col gap-2 [@media(max-height:700px)]:gap-1.5">
          {serverHasKey && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black sm:text-sm">接続チェック</span>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={!canTest}
                onClick={onTestConnection}
                className="min-h-11 cursor-pointer border-[2.5px] px-4 text-sm font-black [@media(max-height:700px)]:min-h-9"
              >
                <PlugZap className="size-4" aria-hidden="true" />
                {connection.isTesting ? "テスト中…" : "接続テスト"}
              </Button>
            </div>
          )}
          <ConnectionChecklist connection={connection} useSearch={useSearch} stretch={isSplit} />
        </div>
      </div>
    </div>
  );
}
