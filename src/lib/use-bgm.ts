import { useEffect, useRef } from "react";

const BGM_SRC = "/audio/heaven-and-hell.m4a";
const CORRECT_SFX_SRC = "/audio/cheer-applause.mp3";

type UseBgmOptions = {
  active: boolean;
  enabled: boolean;
  volume: number;
  ducked?: boolean;
};

/** 質問フェーズ中に BGM をループ再生する。音量調整・マイク録音中のダッキング・自動再生ブロック時のフォールバックを備える。 */
export function useBgm({ active, enabled, volume, ducked = false }: UseBgmOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveVolume = Math.max(0, Math.min(1, ducked ? volume * 0.2 : volume));

  useEffect(() => {
    if (typeof Audio === "undefined") return;
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = effectiveVolume;
  }, [effectiveVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!active || !enabled) {
      audio.pause();
      if (!active) {
        audio.currentTime = 0;
      }
      return;
    }

    let cancelled = false;
    let detachUnlock: (() => void) | null = null;

    const tryPlay = () => {
      if (cancelled) return;
      audio.volume = effectiveVolume;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          if (cancelled || detachUnlock) return;
          const handleGesture = () => {
            detachUnlock?.();
            detachUnlock = null;
            if (!cancelled) {
              void audio.play().catch(() => {});
            }
          };
          window.addEventListener("pointerdown", handleGesture, { passive: true });
          window.addEventListener("keydown", handleGesture, { passive: true });
          detachUnlock = () => {
            window.removeEventListener("pointerdown", handleGesture);
            window.removeEventListener("keydown", handleGesture);
          };
        });
      }
    };

    tryPlay();

    return () => {
      cancelled = true;
      detachUnlock?.();
    };
  }, [active, enabled, effectiveVolume]);
}

/** 正解時の結果画面で歓声と拍手の効果音を 1 回再生する。 */
export function useCorrectSound(active: boolean, enabled: boolean, volume: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clampedVolume = Math.max(0, Math.min(1, volume));
  const volumeRef = useRef(clampedVolume);
  volumeRef.current = clampedVolume;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, [clampedVolume]);

  useEffect(() => {
    if (!active || !enabled || typeof Audio === "undefined") {
      return;
    }

    const audio = new Audio(CORRECT_SFX_SRC);
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    void audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.src = "";
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [active, enabled]);
}
