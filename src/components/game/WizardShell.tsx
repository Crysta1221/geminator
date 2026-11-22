import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

export const CUSTOM_STEPS = ["モード", "出題者へ", "お題", "接続確認", "交代"] as const;
export const GENRE_STEPS = ["モード", "ジャンル", "接続確認"] as const;
export const MODE_SELECT_STEPS = ["モード", "設定", "接続確認"] as const;

type WizardShellProps = {
  /** Step index; omit to hide the step dots. */
  step?: number;
  steps?: readonly string[];
  children: ReactNode;
  className?: string;
};

export function WizardShell({
  step,
  steps = CUSTOM_STEPS,
  children,
  className = "",
}: WizardShellProps) {
  return (
    <div className="mx-auto flex size-full max-w-[1040px] flex-col justify-center p-4 sm:p-6 lg:p-8 [@media(max-height:700px)]:py-2.5">
      {/* Keep justify-center on the outer wrapper so tall cards scroll from the top instead of clipping */}
      <div
        className={cn(
          "neobrutal-stage flex max-h-full min-h-0 w-full flex-col gap-3.5 overflow-y-auto overscroll-contain bg-secondary-background p-4 sm:gap-5 sm:p-6 lg:p-8 [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:p-3.5",
          className,
        )}
      >
        {step !== undefined && (
          <ol
            aria-label="進行状況"
            className="m-0 flex shrink-0 list-none items-center justify-center gap-2 p-0"
          >
            {steps.map((label, idx) => {
              const isCurrent = idx === step;
              const isDone = idx < step;
              return (
                <li key={label} className="flex items-center">
                  <span
                    title={label}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`block rounded-full border-2 border-border transition-transform ${
                      isCurrent
                        ? "h-3 w-7 bg-main shadow-[2px_2px_0_#141414]"
                        : isDone
                          ? "size-2.5 bg-accent-mint"
                          : "size-2.5 bg-background"
                    }`}
                  >
                    <span className="sr-only">
                      {label}
                      {isCurrent ? "（現在）" : isDone ? "（完了）" : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {children}
      </div>
    </div>
  );
}
