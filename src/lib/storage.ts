import { z } from "zod";

import type { PersistedSession } from "#/lib/client-types";
import { LIMITS } from "#/lib/contract";

const API_KEY_STORAGE_KEY = "akinator_decisions_api_key_v1";
const VERIFIED_CONNECTION_STORAGE_KEY = "akinator_decisions_verified_v1";
const BGM_SETTINGS_STORAGE_KEY = "akinator_decisions_bgm_v1";
const SESSION_STORAGE_KEY = "akinator_decisions_session_v1";

export type BgmSettings = {
  enabled: boolean;
  volume: number;
};

export const DEFAULT_BGM_SETTINGS: BgmSettings = {
  enabled: true,
  volume: 0.35,
};

export type VerifiedConnectionRecord = {
  coreOk: boolean;
  searchOk: boolean;
};

const probabilitiesSchema = z.object({
  yes: z.number(),
  partially_yes: z.number(),
  partially_no: z.number(),
  no: z.number(),
  unknown: z.number(),
});

const askHistorySchema = z.object({
  id: z.string(),
  kind: z.literal("ask"),
  text: z.string(),
  verdict: z.enum(["yes", "partially_yes", "partially_no", "no", "unknown", "invalid"]),
  probabilities: probabilitiesSchema,
  searched: z.boolean(),
});

const guessHistorySchema = z.object({
  id: z.string(),
  kind: z.literal("guess"),
  text: z.string(),
  verdict: z.enum(["correct", "close", "wrong"]),
});

const sessionSchema = z.object({
  phase: z.enum(["handoff", "genre_announce", "play", "result"]),
  token: z.string().min(10).max(8000),
  history: z.array(z.union([askHistorySchema, guessHistorySchema])),
  referenceBlobs: z.array(z.string().max(200_000)).max(500),
  questionLimit: z.number().int().min(1).max(99).nullable().optional(),
  outcome: z.enum(["correct", "gave_up"]).optional(),
  mode: z.enum(["custom", "genre"]).optional(),
  genre: z.string().max(LIMITS.genre).optional(),
  useSearch: z.boolean().optional(),
});

const verifiedSchema = z.object({
  signature: z.string(),
  coreOk: z.boolean(),
  searchOk: z.boolean(),
});

const bgmSettingsSchema = z.object({
  enabled: z.boolean(),
  volume: z.number().min(0).max(1),
});

/** Create a short signature to check key equality without duplicating the API key itself. */
function computeKeySignature(keyOrServer: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < keyOrServer.length; i++) {
    const code = keyOrServer.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x85ebca6b);
  }
  return `${keyOrServer.length}:${(h1 >>> 0).toString(36)}:${(h2 >>> 0).toString(36)}`;
}

export function loadApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!raw) return "";
    return raw.slice(0, LIMITS.apiKey);
  } catch {
    return "";
  }
}

export function saveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (!trimmed) {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed.slice(0, LIMITS.apiKey));
    }
  } catch {
    // Silently ignore in environments where localStorage is unavailable
  }
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function loadVerifiedConnection(keyOrServer: string): VerifiedConnectionRecord | null {
  if (typeof window === "undefined" || !keyOrServer) return null;
  try {
    const raw = window.localStorage.getItem(VERIFIED_CONNECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = verifiedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    if (parsed.data.signature !== computeKeySignature(keyOrServer)) return null;
    return { coreOk: parsed.data.coreOk, searchOk: parsed.data.searchOk };
  } catch {
    return null;
  }
}

export function saveVerifiedConnection(
  keyOrServer: string,
  record: VerifiedConnectionRecord,
): void {
  if (typeof window === "undefined" || !keyOrServer) return;
  try {
    window.localStorage.setItem(
      VERIFIED_CONNECTION_STORAGE_KEY,
      JSON.stringify({
        signature: computeKeySignature(keyOrServer),
        coreOk: record.coreOk,
        searchOk: record.searchOk,
      }),
    );
  } catch {
    // Ignore
  }
}

export function clearVerifiedConnection(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(VERIFIED_CONNECTION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function loadBgmSettings(): BgmSettings {
  if (typeof window === "undefined") return DEFAULT_BGM_SETTINGS;
  try {
    const raw = window.localStorage.getItem(BGM_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_BGM_SETTINGS;
    const parsed = bgmSettingsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return DEFAULT_BGM_SETTINGS;
    return parsed.data;
  } catch {
    return DEFAULT_BGM_SETTINGS;
  }
}

export function saveBgmSettings(settings: BgmSettings): void {
  if (typeof window === "undefined") return;
  try {
    const clampedVolume = Math.max(0, Math.min(1, settings.volume));
    window.localStorage.setItem(
      BGM_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        enabled: settings.enabled,
        volume: clampedVolume,
      }),
    );
  } catch {
    // Ignore
  }
}

export function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = sessionSchema.safeParse(parsed);
    if (!result.success) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return result.data;
  } catch {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // 無視
    }
    return null;
  }
}

export function saveSession(session: PersistedSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
