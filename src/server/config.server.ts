/**
 * サーバー設定・定数・環境変数の読み込み(サーバー専用)。
 * 環境変数は process.env から読む(Cloudflare Workers は nodejs_compat で反映される)。
 */

/** 判定のしきい値(DESIGN.md に準拠) */
export const THRESHOLDS = {
  /** askable(noul) がこの値未満なら invalid */
  askableMin: 0.3,
  /** guess(choice) で same が最大かつ confidence がこの値以上なら correct */
  guessSameConfidenceMin: 0.6,
  /** guess(choice) で close が最大かつ confidence がこの値以上なら close（見当違いを惜しいにしない） */
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

/** テスト用: DEV モード判定の上書きと警告フラグのリセット */
export function setDevModeForTest(isDev: boolean | null): void {
  devModeOverrideForTest = isDev;
  warnedMissingTokenSecret = false;
}

export function getServerApiKey(): string | undefined {
  return readEnv("GEMINI_API_KEY");
}

/**
 * リクエストの apiKey があればそれを、なければ process.env.GEMINI_API_KEY を使う。
 * どちらもなければ Error("missing_api_key") を投げる。
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
 * token 暗号化用のシークレットを返す。
 * 開発時(import.meta.env.DEV)に未設定なら固定の開発用の値を使い警告を1回出す。
 * 本番で未設定なら内部エラーをログに出して Error("upstream") を投げる。
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
