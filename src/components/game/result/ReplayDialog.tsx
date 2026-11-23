import { ArrowRight, Dices, PenLine, Shuffle } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import type { ActiveSessionConfig } from "#/lib/client-types";

type ReplayDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionConfig: ActiveSessionConfig;
  onReplaySameMode: () => void;
  onSwitchMode: () => void;
};

export function ReplayDialog({
  open,
  onOpenChange,
  sessionConfig,
  onReplaySameMode,
  onSwitchMode,
}: ReplayDialogProps) {
  const isGenre = sessionConfig.mode === "genre";
  const hasGenre = isGenre && sessionConfig.genre.trim().length > 0;
  const SameModeIcon = isGenre ? Dices : PenLine;

  const sameModeBadge = hasGenre
    ? `ジャンル「${sessionConfig.genre}」`
    : isGenre
      ? "ジャンルから AI が考える"
      : "自由にお題を決める";

  const sameModeDesc = hasGenre
    ? `同じモード・同じジャンル「${sessionConfig.genre}」のまま、新しいお題ですぐにスタートします。`
    : isGenre
      ? "同じモード（ジャンルから AI が考える）でジャンルを設定してスタートします。"
      : "同じモード（自由にお題を決める）・同じ設定のまま、次のお題を入力してスタートします。";

  const sameModeHint = hasGenre
    ? "さっき出たお題は自動で除外されます"
    : "質問回数や検索の設定を引き継ぎます";

  const sameModeCardBg = isGenre
    ? "bg-accent-yellow/35 hover:bg-accent-yellow/55"
    : "bg-accent-cyan/30 hover:bg-accent-cyan/45";
  const sameModeBadgeBg = isGenre ? "bg-accent-yellow" : "bg-accent-cyan";

  const otherModeCardBg = isGenre
    ? "bg-accent-cyan/30 hover:bg-accent-cyan/45"
    : "bg-accent-yellow/35 hover:bg-accent-yellow/55";
  const otherModeBadgeBg = isGenre ? "bg-accent-cyan" : "bg-accent-yellow";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-[3px] bg-secondary-background p-4 sm:max-w-[740px] sm:p-6"
      >
        <DialogHeader className="space-y-1 text-center sm:text-center">
          <DialogTitle className="text-xl font-black sm:text-2xl">
            もう一度どうやって遊ぶ？
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-balance text-foreground/80 sm:text-sm">
            {hasGenre
              ? `同じモード・ジャンル「${sessionConfig.genre}」ですぐ続けるか、別のモードを試すか選べます。`
              : "同じモードのまま続けて遊ぶか、別のモードを選び直すか決めよう。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onReplaySameMode();
            }}
            className={`group flex cursor-pointer flex-col justify-between gap-4 rounded-2xl border-[3px] border-border p-4 text-left shadow-[5px_5px_0_#141414] transition-all hover:-translate-0.5 hover:shadow-[7px_7px_0_#141414] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-border active:translate-[3px] active:shadow-[2px_2px_0_#141414] sm:p-5 ${sameModeCardBg}`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-border bg-secondary-background shadow-[3px_3px_0_#141414]">
                  <SameModeIcon className="size-5 sm:size-6" aria-hidden="true" />
                </span>
                <span
                  className={`max-w-[190px] truncate rounded-full border-2 border-border px-3 py-0.5 text-xs font-black shadow-[2px_2px_0_#141414] ${sameModeBadgeBg}`}
                  title={sameModeBadge}
                >
                  {sameModeBadge}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="m-0 text-lg font-black sm:text-xl">同じモードで遊ぶ！</h2>
                <p className="m-0 text-xs/relaxed font-bold text-foreground/85 sm:text-sm">
                  {sameModeDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t-2 border-border/15 pt-2.5">
              <span className="text-[11px] font-extrabold text-foreground/75 sm:text-xs">
                {sameModeHint}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-border bg-secondary-background px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_#141414]">
                <span>すぐ遊ぶ</span>
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSwitchMode();
            }}
            className={`group flex cursor-pointer flex-col justify-between gap-4 rounded-2xl border-[3px] border-border p-4 text-left shadow-[5px_5px_0_#141414] transition-all hover:-translate-0.5 hover:shadow-[7px_7px_0_#141414] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-border active:translate-[3px] active:shadow-[2px_2px_0_#141414] sm:p-5 ${otherModeCardBg}`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-border bg-secondary-background shadow-[3px_3px_0_#141414]">
                  <Shuffle className="size-5 sm:size-6" aria-hidden="true" />
                </span>
                <span
                  className={`rounded-full border-2 border-border px-3 py-0.5 text-xs font-black shadow-[2px_2px_0_#141414] ${otherModeBadgeBg}`}
                >
                  モード選択へ
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="m-0 text-lg font-black sm:text-xl">別のモードを試す！</h2>
                <p className="m-0 text-xs/relaxed font-bold text-foreground/85 sm:text-sm">
                  「自由にお題を決める」や「ジャンルから AI が考える」を選び直して新しく遊びます。
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t-2 border-border/15 pt-2.5">
              <span className="text-[11px] font-extrabold text-foreground/75 sm:text-xs">
                トップには戻らずモード選択へ
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-border bg-secondary-background px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_#141414]">
                <span>選ぶ</span>
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
          </button>
        </div>

        <DialogFooter className="pt-1 sm:justify-center">
          <DialogClose
            render={
              <Button
                type="button"
                variant="neutral"
                className="min-h-10 cursor-pointer border-[2.5px] px-6 font-black"
              >
                結果画面にもどる
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
