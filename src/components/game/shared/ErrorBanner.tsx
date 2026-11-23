import { AlertTriangle, RotateCcw, X } from "lucide-react";

import { Button } from "#/components/ui/button";
import { ERROR_MESSAGES } from "#/lib/client-types";
import type { ErrorCode } from "#/lib/contract";

type ErrorBannerProps = {
  code: ErrorCode;
  onDismiss: () => void;
  onReset?: () => void;
};

export function ErrorBanner({ code, onDismiss, onReset }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="neobrutal-sm bg-accent-coral p-3 text-foreground"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="m-0 text-xs/snug font-black sm:text-sm">{ERROR_MESSAGES[code]}</p>
          {code === "bad_token" && onReset && (
            <Button
              type="button"
              size="sm"
              variant="neutral"
              onClick={onReset}
              className="min-h-11 cursor-pointer border-2 bg-secondary-background font-black"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              最初からやり直す
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="エラーを閉じる"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-black/10"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
