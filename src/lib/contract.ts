/**
 * クライアントとサーバーで共有する契約。
 * ここには server 専用の import を置かないこと(ブラウザにバンドルされる)。
 * この型を変えるときは、サーバー側とクライアント側の両方に影響するため、
 * オーケストレーター(親)の承認を取ること。
 */
import { z } from "zod";

/** 質問への答え。Decisions の choice 1問で決める。 */
export const VERDICTS = ["yes", "partially_yes", "partially_no", "no", "unknown"] as const;
export type Verdict = (typeof VERDICTS)[number];

/** 質問の判定結果。invalid は「事実で答えられる質問ではない」。回数に数えない。 */
export type AskVerdict = Verdict | "invalid";

/** 最終回答の判定。close は「惜しい」(上位・下位の概念、同シリーズなど)。 */
export type GuessVerdict = "correct" | "close" | "wrong";

export type Probabilities = Record<Verdict, number>;

/** 入力の上限。クライアントとサーバーで同じ値を使う。 */
export const LIMITS = {
  answer: 100,
  notes: 500,
  genre: 100,
  question: 200,
  guess: 100,
  apiKey: 200,
} as const;

/** サーバーが投げるエラーの種類。Error.message にこの文字列だけを入れる。 */
export const ERROR_CODES = [
  "missing_api_key", // キーがサーバー環境にも、リクエストにもない
  "invalid_api_key", // Google から 400/401/403 相当が返った
  "rate_limited", // Google から 429 が返った
  "bad_token", // 復号に失敗した、または改ざんされた
  "bad_input", // 入力検証に失敗した
  "upstream", // それ以外の Google 側の失敗
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export function toErrorCode(e: unknown): ErrorCode {
  const m = e instanceof Error ? e.message : "";
  return (ERROR_CODES as readonly string[]).includes(m) ? (m as ErrorCode) : "upstream";
}

// ---------------- 入力スキーマ(サーバー関数の validator と、クライアントの型の両方に使う)

const apiKey = z.string().trim().min(1).max(LIMITS.apiKey).optional();
const token = z.string().min(10).max(8000);

export const registerInput = z.object({
  answer: z.string().trim().min(1).max(LIMITS.answer),
  notes: z.string().trim().max(LIMITS.notes).default(""),
  /** true のとき、「わからない」の質問に限って Google 検索を使う。 */
  useSearch: z.boolean().default(false),
  apiKey,
});
export type RegisterInput = z.input<typeof registerInput>;

export const generateTopicInput = z.object({
  genre: z.string().trim().min(1).max(LIMITS.genre),
  useSearch: z.boolean().default(false),
  excludeNames: z.array(z.string().trim().min(1).max(LIMITS.answer)).max(30).default([]),
  apiKey,
});
export type GenerateTopicInput = z.input<typeof generateTopicInput>;

export const askInput = z.object({
  token,
  question: z.string().trim().min(1).max(LIMITS.question),
  apiKey,
});
export type AskInput = z.input<typeof askInput>;

export const guessInput = z.object({
  token,
  guess: z.string().trim().min(1).max(LIMITS.guess),
  apiKey,
});
export type GuessInput = z.input<typeof guessInput>;

export const chatInput = z.object({
  token,
  message: z.string().trim().min(1).max(LIMITS.question),
  apiKey,
});
export type ChatInput = z.input<typeof chatInput>;

export const revealInput = z.object({
  token,
  /** ask の戻り値 referenceBlob を、質問順に並べたもの。 */
  // 1件の上限は余裕を持たせる。検索の本文と Search Suggestions の HTML を暗号化して base64 にするため、
  // 数十KBになりうる。上限を超えるとここで検証に失敗し、結果画面が出なくなる。
  referenceBlobs: z.array(z.string().max(200_000)).max(500).default([]),
});
export type RevealInput = z.input<typeof revealInput>;

export const testConnectionInput = z.object({
  apiKey,
  /** true のとき、Google 検索(grounding)も試す。検索は1回あたり課金される。 */
  checkSearch: z.boolean().default(false),
});
export type TestConnectionInput = z.input<typeof testConnectionInput>;

export const transcribeInput = z.object({
  audioBase64: z.string().min(1).max(4_000_000),
  mimeType: z
    .string()
    .regex(/^audio\/[a-z0-9.+-]+(?:\s*;\s*codecs=[^;\s]+)?$/i)
    .max(100),
  apiKey,
});
export type TranscribeInput = z.input<typeof transcribeInput>;

// ---------------- 戻り値

export type ConfigResult = {
  /** サーバー環境に GEMINI_API_KEY がある。true なら画面にキー入力欄を出さない。 */
  serverHasKey: boolean;
};

export type Identified = {
  /** 正式名称 */
  name: string;
  aliases: string[];
  /** 出題者に見せる確認用の短い説明(200字程度)。 */
  summary: string;
  /** モデルがこの対象を知っていると判断したか。false なら出題者に注意を出す。 */
  confident: boolean;
};

export type RegisterResult = {
  /** 暗号化された出題。回答者の端末が保持し、質問のたびに送り返す。 */
  token: string;
  identified: Identified;
};

export type GenerateTopicResult = {
  /** 暗号化された出題。回答者にも答えを見せないため、identified は返さない。 */
  token: string;
};

export type AskResult = {
  verdict: AskVerdict;
  /** invalid のときは全部 0。 */
  probabilities: Probabilities;
  /** 「わからない」を受けて Google 検索を使った。 */
  searched: boolean;
  /** 検索したときだけ入る。暗号化済みで、回答者は中身を読めない。終了後 revealAnswer に渡す。 */
  referenceBlob?: string;
};

export type GuessResult = {
  verdict: GuessVerdict;
};

export type ChatResult = ({ kind: "ask" } & AskResult) | ({ kind: "guess" } & GuessResult);

export type Reference = {
  /** 検索のきっかけになった質問 */
  question: string;
  /** 検索結果を要約した本文(そのまま表示する) */
  text: string;
  sources: { title?: string; uri: string }[];
  /** Google が返す Search Suggestions の HTML(そのまま表示する) */
  searchSuggestionsHtml?: string;
  queries: string[];
};

export type RevealResult = {
  identified: Identified;
  /** 出題者が入力した答えと補足 */
  answer: string;
  notes: string;
  references: Reference[];
};

/** 接続テストの1項目の結果。失敗のときは ErrorCode を返す。 */
export type ProbeResult = { ok: true; ms: number } | { ok: false; error: ErrorCode };

export type TestConnectionResult = {
  /** 質問の判定(Decisions) */
  decisions: ProbeResult;
  /** お題の特定(Flash-Lite) */
  text: ProbeResult;
  /** Google 検索。checkSearch が true のときだけ入る。 */
  search?: ProbeResult;
};

export type TranscribeResult = {
  text: string;
};
