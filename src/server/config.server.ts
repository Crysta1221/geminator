/**
 * Server configuration, constants, and environment variable loading (server-only).
 * Environment variables are read from `process.env` (populated on Cloudflare Workers via `nodejs_compat`).
 */

/** Evaluation thresholds (per DESIGN.md). */
export const THRESHOLDS = {
  /** Return `invalid` when `askable` (noul) is below this value. */
  askableMin: 0.3,
  /** Return `correct` when `same` is highest in `guess` (choice) and confidence >= this value. */
  guessSameConfidenceMin: 0.6,
  /** Return `close` when `close` is highest in `guess` (choice) and confidence >= this value (avoid marking wild guesses as close). */
  guessCloseConfidenceMin: 0.6,
} as const;

export const DEFAULT_DECISIONS_MODEL = "gemini-decision-1";
export const DEFAULT_TEXT_MODEL = "gemini-3.5-flash-lite";

const DEV_FALLBACK_TOKEN_SECRET = "dev-only-insecure-token-secret-do-not-use-in-production";

let warnedMissingTokenSecret = false;
let devModeOverrideForTest: boolean | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function isDevMode(): boolean {
  if (devModeOverrideForTest !== null) {
    return devModeOverrideForTest;
  }
  return Boolean(import.meta.env?.DEV);
}

/** For testing: override DEV mode detection and reset the warning flag. */
export function setDevModeForTest(isDev: boolean | null): void {
  devModeOverrideForTest = isDev;
  warnedMissingTokenSecret = false;
}

export function getServerApiKey(): string | undefined {
  return readEnv("GEMINI_API_KEY");
}

/**
 * Use the request's `apiKey` if provided; otherwise fall back to `process.env.GEMINI_API_KEY`.
 * Throws `Error("missing_api_key")` if neither is available.
 */
export function resolveApiKey(requestApiKey?: string): string {
  const fromRequest = requestApiKey?.trim();
  if (fromRequest) {
    return fromRequest;
  }
  const fromEnv = getServerApiKey();
  if (fromEnv) {
    return fromEnv;
  }
  throw new Error("missing_api_key");
}

export function getDecisionsModel(): string {
  return readEnv("DECISIONS_MODEL") ?? DEFAULT_DECISIONS_MODEL;
}

export function getTextModel(): string {
  return readEnv("TEXT_MODEL") ?? DEFAULT_TEXT_MODEL;
}

/**
 * Return the secret used to encrypt tokens.
 * In development (`import.meta.env.DEV`), falls back to a fixed dev value with a one-time warning if unset.
 * In production, logs an internal error and throws `Error("upstream")` if unset.
 */
export function getTokenSecret(): string {
  const secret = readEnv("TOKEN_SECRET");
  if (secret) {
    return secret;
  }
  if (isDevMode()) {
    if (!warnedMissingTokenSecret) {
      warnedMissingTokenSecret = true;
      console.warn(
        "[config] TOKEN_SECRET が未設定のため、開発用の固定値を使用します。本番環境では必ず設定してください。",
      );
    }
    return DEV_FALLBACK_TOKEN_SECRET;
  }
  console.error("[config] TOKEN_SECRET が設定されていません。本番環境では起動前に設定が必要です。");
  throw new Error("upstream");
}
