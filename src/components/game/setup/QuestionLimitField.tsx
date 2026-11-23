import { Hash } from "lucide-react";

import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

export type LimitMode = "none" | "10" | "20" | "30" | "custom";

const SEGMENTS: readonly { value: LimitMode; label: string }[] = [
  { value: "none", label: "なし" },
  { value: "10", label: "10回" },
  { value: "20", label: "20回" },
  { value: "30", label: "30回" },
  { value: "custom", label: "自由に入力" },
] as const;

export function inferLimitMode(limit: number | null): {
  mode: LimitMode;
  customText: string;
} {
  if (limit === null) return { mode: "none", customText: "15" };
  if (limit === 10) return { mode: "10", customText: "15" };
  if (limit === 20) return { mode: "20", customText: "15" };
  if (limit === 30) return { mode: "30", customText: "15" };
  return { mode: "custom", customText: String(limit) };
}

export function resolveQuestionLimit(
  mode: LimitMode,
  customText: string,
): { valid: boolean; value: number | null } {
  if (mode === "none") return { valid: true, value: null };
  if (mode === "10") return { valid: true, value: 10 };
  if (mode === "20") return { valid: true, value: 20 };
  if (mode === "30") return { valid: true, value: 30 };
  const trimmed = customText.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return { valid: false, value: null };
  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1 || parsed > 99) return { valid: false, value: null };
  return { valid: true, value: parsed };
}

type QuestionLimitFieldProps = {
  mode: LimitMode;
  customText: string;
  isCustomInvalid: boolean;
  onModeChange: (mode: LimitMode) => void;
  onCustomTextChange: (text: string) => void;
};

export function QuestionLimitField({
  mode,
  customText,
  isCustomInvalid,
  onModeChange,
  onCustomTextChange,
}: QuestionLimitFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span
          id="question-limit-label"
          className="flex items-center gap-1.5 text-xs font-black sm:text-sm"
        >
          <Hash className="size-3.5 shrink-0" aria-hidden="true" />
          質問回数の上限
        </span>
        <span className="text-[11px] font-bold text-foreground/75 [@media(max-height:660px)]:hidden">
          質問するたびに1回カウントされます。
        </span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="question-limit-label"
        className="grid grid-cols-5 gap-1 rounded-xl border-2 border-border bg-secondary-background p-1"
      >
        {SEGMENTS.map((seg) => {
          const active = mode === seg.value;
          return (
            <label
              key={seg.value}
              className={`flex min-h-9 cursor-pointer items-center justify-center rounded-lg border-2 p-1 text-center text-[11px] leading-tight font-black transition-colors has-focus-visible:outline-[3px] has-focus-visible:outline-offset-2 has-focus-visible:outline-border sm:min-h-10 sm:text-xs ${
                active
                  ? "border-border bg-main text-foreground shadow-[2px_2px_0_#141414]"
                  : "border-transparent bg-transparent text-foreground/80 hover:bg-background"
              }`}
            >
              <input
                type="radio"
                name="question-limit-mode"
                value={seg.value}
                checked={active}
                onChange={() => onModeChange(seg.value)}
                className="sr-only"
              />
              <span>{seg.label}</span>
            </label>
          );
        })}
      </div>

      {mode === "custom" && (
        <div className="flex items-center gap-2 pt-0.5">
          <Label htmlFor="topic-limit-custom" className="shrink-0 text-xs font-black">
            回数（1〜99）
          </Label>
          <Input
            id="topic-limit-custom"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            step={1}
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            aria-invalid={isCustomInvalid}
            className="h-9 w-24 border-2 bg-secondary-background text-center text-sm font-black tabular-nums"
          />
          <span className="text-xs font-bold text-foreground/80">回</span>
          {isCustomInvalid && (
            <span role="alert" className="text-xs font-black text-[#c91c48]">
              1〜99の整数を入力してください
            </span>
          )}
        </div>
      )}
    </div>
  );
}
