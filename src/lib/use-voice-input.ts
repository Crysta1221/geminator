import { useCallback, useEffect, useRef, useState } from "react";

import { submitAudioTranscription } from "#/lib/client-api";
import { toErrorCode } from "#/lib/contract";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

export type VoiceStatus = "idle" | "listening" | "transcribing";

const SILENCE_AUTO_SUBMIT_MS = 1800;
const VOICE_RMS_THRESHOLD = 0.02;
const VOICE_POLL_INTERVAL_MS = 100;

type UseVoiceInputOptions = {
  apiKey?: string;
  maxLength: number;
  disabled: boolean;
  onInterimText: (text: string) => void;
  onComplete: (text: string) => Promise<void> | void;
};

function getSpeechRecognitionCtor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function canUseMediaRecorder(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices && "getUserMedia" in navigator.mediaDevices)
  );
}

function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "audio/webm";
  }
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("failed_to_read_audio"));
        return;
      }
      const commaIdx = reader.result.indexOf(",");
      resolve(commaIdx >= 0 ? reader.result.slice(commaIdx + 1) : reader.result);
    };
    reader.onerror = () => reject(new Error("failed_to_read_audio"));
    reader.readAsDataURL(blob);
  });
}

function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "audio-capture":
      return "マイクの使用が許可されていません。ブラウザの設定を確認してください。";
    case "no-speech":
      return "音声が聞き取れませんでした。もう一度お試しください。";
    default:
      return "音声認識に失敗しました。もう一度お試しください。";
  }
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? win.webkitAudioContext ?? null;
}

function attachMediaSilenceDetector(
  stream: MediaStream,
  onSilence: () => void,
): (() => void) | null {
  const AudioCtx = getAudioContextCtor();
  if (!AudioCtx) return null;

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return null;
  }

  let intervalId: number | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    try {
      source?.disconnect();
    } catch {
      // 無視
    }
    void ctx.close().catch(() => {});
  };

  try {
    source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let hasSpoken = false;
    let lastVoiceAt = Date.now();

    intervalId = window.setInterval(() => {
      if (cleaned) return;
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const s = buffer[i] ?? 0;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / buffer.length);
      if (rms >= VOICE_RMS_THRESHOLD) {
        hasSpoken = true;
        lastVoiceAt = Date.now();
        return;
      }
      if (hasSpoken && Date.now() - lastVoiceAt >= SILENCE_AUTO_SUBMIT_MS) {
        cleanup();
        onSilence();
      }
    }, VOICE_POLL_INTERVAL_MS);
  } catch {
    cleanup();
    return null;
  }

  return cleanup;
}

/**
 * 音声入力フック。
 * ブラウザの Web Speech API（API コスト 0）を優先し、非対応環境やネットワーク不可時のみ
 * MediaRecorder + Gemini Flash-Lite の文字起こしへフォールバックする。
 * 発話後の無音が一定時間続くと自動的に送信する。
 */
export function useVoiceInput({
  apiKey,
  maxLength,
  disabled,
  onInterimText,
  onComplete,
}: UseVoiceInputOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const statusRef = useRef<VoiceStatus>("idle");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechTranscriptRef = useRef("");
  const speechInterimRef = useRef("");
  const lastSpeechRawRef = useRef("");
  const stopRequestedRef = useRef(false);
  const speechEndTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioMonitorCleanupRef = useRef<(() => void) | null>(null);

  const baseTextRef = useRef("");
  const maxLengthRef = useRef(maxLength);
  maxLengthRef.current = maxLength;

  const callbacksRef = useRef({ apiKey, onInterimText, onComplete });
  callbacksRef.current = { apiKey, onInterimText, onComplete };

  const updateStatus = useCallback((next: VoiceStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const stopAudioMonitor = useCallback(() => {
    if (audioMonitorCleanupRef.current) {
      audioMonitorCleanupRef.current();
      audioMonitorCleanupRef.current = null;
    }
  }, []);

  const stopMediaTracks = useCallback(() => {
    stopAudioMonitor();
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
  }, [stopAudioMonitor]);

  const clearSpeechTimers = useCallback(() => {
    if (speechEndTimerRef.current !== null) {
      window.clearTimeout(speechEndTimerRef.current);
      speechEndTimerRef.current = null;
    }
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearSpeechTimers();
    stopRequestedRef.current = false;
    lastSpeechRawRef.current = "";
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.abort();
      } catch {
        // 無視
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // 無視
      }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    stopMediaTracks();
    updateStatus("idle");
  }, [clearSpeechTimers, stopMediaTracks, updateStatus]);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  const startMediaRecorder = useCallback(async () => {
    if (!canUseMediaRecorder()) {
      setVoiceError("このブラウザは音声入力に対応していません。");
      updateStatus("idle");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceError("マイクの使用が許可されていません。ブラウザの設定を確認してください。");
      updateStatus("idle");
      return;
    }

    mediaStreamRef.current = stream;
    audioChunksRef.current = [];
    const preferredMime = pickSupportedAudioMimeType();
    const recorder = preferredMime
      ? new MediaRecorder(stream, { mimeType: preferredMime })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || preferredMime || "audio/webm";
      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      stopMediaTracks();

      if (chunks.length === 0) {
        setVoiceError("音声が録音されませんでした。もう一度お試しください。");
        updateStatus("idle");
        return;
      }

      updateStatus("transcribing");
      try {
        const blob = new Blob(chunks, { type: mimeType });
        const audioBase64 = await blobToBase64(blob);
        const res = await submitAudioTranscription({
          audioBase64,
          mimeType,
          apiKey: callbacksRef.current.apiKey,
        });
        const spoken = res.text.trim();
        if (!spoken) {
          setVoiceError("音声が聞き取れませんでした。もう一度お試しください。");
          updateStatus("idle");
          return;
        }
        const combined = baseTextRef.current ? `${baseTextRef.current} ${spoken}` : spoken;
        const clipped = combined.slice(0, maxLengthRef.current).trim();
        updateStatus("idle");
        await callbacksRef.current.onComplete(clipped);
      } catch (err) {
        const code = toErrorCode(err);
        setVoiceError(
          code === "missing_api_key"
            ? "音声の文字起こしには Gemini API キーが必要です。"
            : "音声の文字起こしに失敗しました。もう一度お試しください。",
        );
        updateStatus("idle");
      }
    };

    mediaRecorderRef.current = recorder;
    audioMonitorCleanupRef.current = attachMediaSilenceDetector(stream, () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    });
    recorder.start();
    updateStatus("listening");
  }, [stopMediaTracks, updateStatus]);

  const finishSpeechSession = useCallback(() => {
    clearSpeechTimers();
    recognitionRef.current = null;
    const raw = `${speechTranscriptRef.current} ${speechInterimRef.current}`.trim();
    const combined = baseTextRef.current
      ? raw
        ? `${baseTextRef.current} ${raw}`
        : baseTextRef.current
      : raw;
    const clipped = combined.slice(0, maxLengthRef.current).trim();
    const wasManualStop = stopRequestedRef.current;
    const hasSpoken = Boolean(raw);
    stopRequestedRef.current = false;
    lastSpeechRawRef.current = "";
    updateStatus("idle");

    if (wasManualStop || hasSpoken) {
      if (!clipped) {
        setVoiceError("音声が聞き取れませんでした。もう一度お試しください。");
        return;
      }
      void callbacksRef.current.onComplete(clipped);
    }
  }, [clearSpeechTimers, updateStatus]);

  const triggerSpeechStopAndSubmit = useCallback(() => {
    clearSpeechTimers();
    const recognition = recognitionRef.current;
    if (!recognition) return;
    stopRequestedRef.current = true;
    try {
      recognition.stop();
    } catch {
      finishSpeechSession();
      return;
    }
    speechEndTimerRef.current = window.setTimeout(() => {
      if (recognitionRef.current) {
        finishSpeechSession();
      }
    }, 700);
  }, [clearSpeechTimers, finishSpeechSession]);

  const startSpeechRecognition = useCallback(
    (Ctor: SpeechRecognitionConstructorLike) => {
      const recognition = new Ctor();
      recognition.lang = "ja-JP";
      recognition.continuous = true;
      recognition.interimResults = true;
      speechTranscriptRef.current = "";
      speechInterimRef.current = "";
      lastSpeechRawRef.current = "";
      stopRequestedRef.current = false;

      recognition.onresult = (event) => {
        let finals = "";
        let interims = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = (result[0]?.transcript ?? "").trim();
          if (!chunk) continue;
          if (result.isFinal) {
            finals = finals ? `${finals} ${chunk}` : chunk;
          } else {
            interims = interims ? `${interims} ${chunk}` : chunk;
          }
        }
        speechTranscriptRef.current = finals;
        speechInterimRef.current = interims;
        const speechRaw = [finals, interims].filter(Boolean).join(" ").trim();
        const combined = [baseTextRef.current, speechRaw].filter(Boolean).join(" ");
        callbacksRef.current.onInterimText(combined.slice(0, maxLengthRef.current));

        if (!speechRaw) {
          if (silenceTimerRef.current !== null) {
            window.clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          lastSpeechRawRef.current = "";
          return;
        }

        if (speechRaw !== lastSpeechRawRef.current) {
          lastSpeechRawRef.current = speechRaw;
          if (silenceTimerRef.current !== null) {
            window.clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = window.setTimeout(() => {
            silenceTimerRef.current = null;
            if (statusRef.current === "listening" && recognitionRef.current === recognition) {
              triggerSpeechStopAndSubmit();
            }
          }, SILENCE_AUTO_SUBMIT_MS);
        }
      };

      recognition.onerror = (event) => {
        if (
          (event.error === "network" || event.error === "service-not-allowed") &&
          !stopRequestedRef.current &&
          canUseMediaRecorder()
        ) {
          // Web Speech API が利用できない環境（Brave 等）では録音文字起こしへ切り替える
          clearSpeechTimers();
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
          recognitionRef.current = null;
          void startMediaRecorder();
          return;
        }
        if (event.error !== "aborted") {
          setVoiceError(speechErrorMessage(event.error));
        }
        stopRequestedRef.current = false;
        lastSpeechRawRef.current = "";
        recognitionRef.current = null;
        clearSpeechTimers();
        updateStatus("idle");
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        finishSpeechSession();
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        updateStatus("listening");
      } catch {
        recognitionRef.current = null;
        void startMediaRecorder();
      }
    },
    [
      clearSpeechTimers,
      finishSpeechSession,
      startMediaRecorder,
      triggerSpeechStopAndSubmit,
      updateStatus,
    ],
  );

  const toggle = useCallback(
    async (currentText: string) => {
      if (disabled || statusRef.current === "transcribing") return;
      setVoiceError(null);

      if (statusRef.current === "listening") {
        if (recognitionRef.current) {
          triggerSpeechStopAndSubmit();
          return;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        return;
      }

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setVoiceError("音声入力は localhost または HTTPS 接続で利用できます。");
        return;
      }

      baseTextRef.current = currentText.trim();
      const SpeechCtor = getSpeechRecognitionCtor();
      if (SpeechCtor) {
        startSpeechRecognition(SpeechCtor);
      } else {
        await startMediaRecorder();
      }
    },
    [disabled, startMediaRecorder, startSpeechRecognition, triggerSpeechStopAndSubmit],
  );

  return {
    status,
    isListening: status === "listening",
    isTranscribing: status === "transcribing",
    voiceError,
    clearVoiceError: () => setVoiceError(null),
    toggle,
    cancel,
  };
}
