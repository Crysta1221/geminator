import { Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { LIMITS } from "#/lib/contract";
import { cn } from "#/lib/utils";

type ApiKeyFieldProps = {
  apiKey: string;
  disabled: boolean;
  idPrefix?: string;
  className?: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export function ApiKeyField({
  apiKey,
  disabled,
  idPrefix,
  className,
  onChange,
  onClear,
}: ApiKeyFieldProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const generatedId = useId();
  const inputId = idPrefix ? `${idPrefix}-api-key` : generatedId;

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-2 rounded-xl border-[2.5px] border-border bg-accent-cyan/25 p-3 [@media(max-height:700px)]:p-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={inputId} className="flex items-center gap-1.5 text-sm font-black">
          <KeyRound className="size-4 shrink-0" aria-hidden="true" />
          Gemini API キー
        </Label>
        <Button
          type="button"
          size="sm"
          variant="neutral"
          onClick={onClear}
          disabled={disabled || apiKey.length === 0}
          className="min-h-11 cursor-pointer border-2 px-3 text-xs font-black [@media(max-height:700px)]:min-h-9"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          キーを消す
        </Button>
      </div>
      <div className="flex gap-3.5">
        <Input
          id={inputId}
          type={showApiKey ? "text" : "password"}
          value={apiKey}
          onChange={(e) => onChange(e.target.value)}
          maxLength={LIMITS.apiKey}
          placeholder="AIza..."
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className="h-11 border-[2.5px] bg-secondary-background font-mono text-sm"
        />
        <Button
          type="button"
          size="icon"
          variant="neutral"
          onClick={() => setShowApiKey((prev) => !prev)}
          aria-label={showApiKey ? "API キーを隠す" : "API キーを表示する"}
          disabled={disabled}
          className="size-11 shrink-0 cursor-pointer border-[2.5px]"
        >
          {showApiKey ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
