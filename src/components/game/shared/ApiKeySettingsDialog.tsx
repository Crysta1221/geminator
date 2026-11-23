import { FolderOpen, Music, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";
import { type ChangeEvent, useRef } from "react";

import { ApiKeyField } from "#/components/game/shared/ApiKeyField";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Slider } from "#/components/ui/slider";
import { Switch } from "#/components/ui/switch";
import { clearCustomBgm, saveCustomBgm, useCustomBgm } from "#/lib/bgm-store";
import type { BgmSettings } from "#/lib/storage";

const DEFAULT_BGM_LABEL = "天国と地獄（デフォルト）";

type ApiKeySettingsDialogProps = {
  serverHasKey: boolean;
  apiKey: string;
  bgmSettings: BgmSettings;
  onApiKeyChange: (value: string) => void;
  onClearApiKey: () => void;
  onBgmEnabledChange: (enabled: boolean) => void;
  onBgmVolumeChange: (volume: number) => void;
};

export function ApiKeySettingsDialog({
  serverHasKey,
  apiKey,
  bgmSettings,
  onApiKeyChange,
  onClearApiKey,
  onBgmEnabledChange,
  onBgmVolumeChange,
}: ApiKeySettingsDialogProps) {
  const volumePercent = Math.round(bgmSettings.volume * 100);
  const { fileName: customBgmName } = useCustomBgm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTrackName = customBgmName ?? DEFAULT_BGM_LABEL;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset input value so selecting the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;
    void saveCustomBgm(file);
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-lg"
            variant="neutral"
            data-slot="settings-gear-button"
            aria-label="設定を開く"
            className="size-12 cursor-pointer border-[3px] bg-secondary-background shadow-[4px_4px_0_#141414]"
          >
            <Settings className="size-5" aria-hidden="true" />
          </Button>
        }
      />

      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-[3px] bg-secondary-background p-4 sm:max-w-[520px] sm:p-6"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-black">設定</DialogTitle>
          {!serverHasKey && (
            <DialogDescription className="text-xs/relaxed font-bold text-balance text-foreground/80 sm:text-sm">
              キーはこのブラウザにだけ保存され、サーバーには保存されません。
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {!serverHasKey && (
            <ApiKeyField
              apiKey={apiKey}
              disabled={false}
              idPrefix="dialog"
              onChange={onApiKeyChange}
              onClear={onClearApiKey}
            />
          )}

          <div className="space-y-3 rounded-xl border-[2.5px] border-border bg-accent-yellow/25 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <Label
                  htmlFor="settings-bgm-enabled"
                  className="flex items-center gap-1.5 text-sm font-black"
                >
                  <Music className="size-4 shrink-0" aria-hidden="true" />
                  BGM
                </Label>
                <p className="m-0 text-xs font-bold text-foreground/75">
                  質問中に BGM を再生します
                </p>
              </div>
              <Switch
                id="settings-bgm-enabled"
                checked={bgmSettings.enabled}
                onCheckedChange={(checked) => onBgmEnabledChange(checked)}
                aria-label="BGM を再生する"
              />
            </div>

            <div className="flex items-center gap-3 border-t-2 border-border/15 pt-2.5">
              <span
                id="settings-bgm-volume-label"
                className="flex shrink-0 items-center gap-1.5 text-xs font-black"
              >
                {bgmSettings.enabled && volumePercent > 0 ? (
                  <Volume2 className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <VolumeX className="size-4 shrink-0 text-foreground/60" aria-hidden="true" />
                )}
                音量
              </span>
              <Slider
                id="settings-bgm-volume"
                aria-labelledby="settings-bgm-volume-label"
                min={0}
                max={100}
                step={5}
                value={volumePercent}
                disabled={!bgmSettings.enabled}
                onValueChange={(nextValue) => {
                  const num = Array.isArray(nextValue) ? (nextValue[0] ?? 0) : nextValue;
                  onBgmVolumeChange(num / 100);
                }}
                className="flex-1"
              />
              <span className="w-10 shrink-0 text-right text-xs font-black tabular-nums">
                {volumePercent}%
              </span>
            </div>

            <div className="space-y-2 border-t-2 border-border/15 pt-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-xs font-black">再生中の曲</span>
                <span
                  className="min-w-0 truncate text-xs font-bold text-foreground/80"
                  title={activeTrackName}
                >
                  {activeTrackName}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                aria-label="BGM の音声ファイルを選択"
                onChange={handleFileChange}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-9 cursor-pointer border-[2.5px] font-black"
                >
                  <FolderOpen className="size-4" aria-hidden="true" />
                  BGMを変更
                </Button>
                {customBgmName && (
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={() => void clearCustomBgm()}
                    className="min-h-9 cursor-pointer border-[2.5px] font-black"
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    デフォルトに戻す
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button
                type="button"
                variant="neutral"
                className="min-h-11 cursor-pointer border-[2.5px] px-6 font-black"
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
