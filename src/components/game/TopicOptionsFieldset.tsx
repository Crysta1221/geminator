import { Search } from "lucide-react";

import { type LimitMode, QuestionLimitField } from "#/components/game/QuestionLimitField";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";

type TopicOptionsFieldsetProps = {
  idPrefix: string;
  useSearch: boolean;
  onUseSearchChange: (checked: boolean) => void;
  limitMode: LimitMode;
  customLimitText: string;
  isCustomInvalid: boolean;
  onLimitModeChange: (mode: LimitMode) => void;
  onCustomLimitTextChange: (text: string) => void;
};

export function TopicOptionsFieldset({
  idPrefix,
  useSearch,
  onUseSearchChange,
  limitMode,
  customLimitText,
  isCustomInvalid,
  onLimitModeChange,
  onCustomLimitTextChange,
}: TopicOptionsFieldsetProps) {
  const switchId = `${idPrefix}-use-search`;

  return (
    <fieldset className="m-0 space-y-2.5 rounded-xl border-[2.5px] border-border bg-background px-3 py-2.5 [@media(max-height:700px)]:space-y-1.5 [@media(max-height:700px)]:py-2">
      <legend className="sr-only">オプション</legend>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <Label
            htmlFor={switchId}
            className="flex items-center gap-1.5 text-xs font-black sm:text-sm"
          >
            <Search className="size-3.5 shrink-0" aria-hidden="true" />
            わからないときに Google 検索を使う
          </Label>
          <p className="m-0 text-[11px] leading-snug font-bold text-foreground/80 [@media(max-height:700px)]:hidden">
            ON なら Google 検索、OFF なら無料の Wikipedia
            を使って補い、終了後に参考文献を表示します。
          </p>
        </div>
        <Switch
          id={switchId}
          checked={useSearch}
          onCheckedChange={onUseSearchChange}
          aria-label="わからないときに Google 検索を使う"
        />
      </div>

      <div className="border-t-2 border-border/15 pt-2 [@media(max-height:700px)]:pt-1.5">
        <QuestionLimitField
          mode={limitMode}
          customText={customLimitText}
          isCustomInvalid={isCustomInvalid}
          onModeChange={onLimitModeChange}
          onCustomTextChange={onCustomLimitTextChange}
        />
      </div>
    </fieldset>
  );
}
