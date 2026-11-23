import { Check, Copy, RotateCcw, Share2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import type { GameOutcome } from "#/lib/client-types";
import { buildShareText, buildXIntentUrl } from "#/lib/share";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outcome: GameOutcome;
  questionCount: number;
  questionLimit: number | null;
  genre?: string;
  answerName?: string;
  siteUrl?: string;
};

function XMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
  outcome,
  questionCount,
  questionLimit,
  genre,
  answerName,
  siteUrl,
}: ShareDialogProps) {
  const [includeAnswer, setIncludeAnswer] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);

  const resolvedUrl = useMemo(() => {
    const trimmed = siteUrl?.trim();
    if (trimmed) return trimmed;
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [siteUrl]);

  const generatedText = useMemo(
    () =>
      buildShareText({
        outcome,
        questionCount,
        questionLimit,
        genre,
        answerName,
        includeAnswer,
        siteUrl: resolvedUrl,
      }),
    [outcome, questionCount, questionLimit, genre, answerName, includeAnswer, resolvedUrl],
  );

  const shareText = customText ?? generatedText;
  const isEdited = customText !== null && customText !== generatedText;
  const isCorrect = outcome === "correct";

  useEffect(() => {
    setCanWebShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCustomText(null);
    }
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleWebShare = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "じぇみねいたー",
        text: shareText,
      });
    } catch {
      // User dismissed native share sheet
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-[3px] bg-secondary-background p-4 sm:max-w-[540px] sm:p-6"
      >
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-black sm:text-2xl">
            <Share2 className="size-5" aria-hidden="true" />
            結果をシェア
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-foreground/80 sm:text-sm">
            文章はそのままでも、自由に編集してからでもシェアできます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          {/* Compact visual result badge */}
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border-[2.5px] border-border px-3.5 py-2.5 shadow-[3px_3px_0_#141414] ${
              isCorrect ? "bg-accent-yellow" : "bg-accent-gray"
            }`}
          >
            <div className="flex items-center gap-1.5 text-sm font-black sm:text-base">
              {isCorrect && <Trophy className="size-4" aria-hidden="true" />}
              <span>{isCorrect ? "正解！" : "不正解（ギブアップ）"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-black">
              {genre && (
                <span className="rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5">
                  ジャンル「{genre}」
                </span>
              )}
              <span className="rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5 tabular-nums">
                {questionLimit !== null
                  ? `${questionCount} / ${questionLimit}問`
                  : `${questionCount}問`}
              </span>
            </div>
          </div>

          {answerName && (
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-background px-3.5 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="share-include-answer" className="text-xs font-black sm:text-sm">
                  答えの名前を含める
                </Label>
                <p className="m-0 text-[11px] font-bold text-foreground/75">
                  ネタバレを避けたいときは OFF のままにしておけます
                </p>
              </div>
              <Switch
                id="share-include-answer"
                checked={includeAnswer}
                onCheckedChange={(checked) => {
                  setIncludeAnswer(checked);
                  setCustomText(null);
                }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="share-text-area" className="text-xs font-black sm:text-sm">
                シェアする文章
              </Label>
              {isEdited && (
                <button
                  type="button"
                  onClick={() => setCustomText(null)}
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-black text-foreground/75 underline hover:text-foreground"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  元に戻す
                </button>
              )}
            </div>
            <Textarea
              id="share-text-area"
              value={shareText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              className="min-h-[112px] resize-none border-[2.5px] bg-background text-sm/relaxed font-bold shadow-[3px_3px_0_#141414]"
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <a
              href={buildXIntentUrl(shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className: "min-h-11 w-full cursor-pointer border-[3px] font-black",
              })}
            >
              <XMark />
              <span>X でシェア</span>
            </a>

            <Button
              type="button"
              size="lg"
              variant="neutral"
              onClick={() => void handleCopy()}
              className={`min-h-11 w-full cursor-pointer border-[3px] font-black ${
                copied ? "bg-accent-mint" : "bg-accent-cyan/45"
              }`}
            >
              {copied ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  <span>コピーしました！</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden="true" />
                  <span>テキストをコピー</span>
                </>
              )}
            </Button>
          </div>

          {canWebShare && (
            <Button
              type="button"
              variant="neutral"
              onClick={() => void handleWebShare()}
              className="min-h-10 w-full cursor-pointer border-[2.5px] bg-secondary-background font-black"
            >
              <Share2 className="size-4" aria-hidden="true" />
              <span>端末のシェアメニューを開く</span>
            </Button>
          )}
        </div>

        <DialogFooter className="pt-1">
          <DialogClose
            render={
              <Button
                type="button"
                variant="neutral"
                className="min-h-10 cursor-pointer border-[2.5px] px-6 font-black"
              >
                閉じる
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
