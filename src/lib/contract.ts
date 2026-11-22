/**
 * Shared contract between client and server.
 * Do not place server-only imports here (this file is bundled into the browser).
 * Modifying these types affects both client and server; obtain coordinator approval first.
 */
import { z } from "zod";

/** Answer to a question, decided by a single Decisions `choice` question. */
export const VERDICTS = ["yes", "partially_yes", "partially_no", "no", "unknown"] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Question evaluation result. `invalid` means not a fact-based yes/no question and is not counted. */
export type AskVerdict = Verdict | "invalid";

/** Final guess evaluation. `close` means close (broader/narrower concept, same series, etc.). */
export type GuessVerdict = "correct" | "close" | "wrong";

export type Probabilities = Record<Verdict, number>;

/** Input length limits shared by client and server. */
export const LIMITS = {
  answer: 100,
  notes: 500,
  genre: 100,
  question: 200,
  guess: 100,
  apiKey: 200,
} as const;

/** Error codes thrown by the server. Only this string is placed in `Error.message`. */
export const ERROR_CODES = [
  "missing_api_key", // No key in server env or request
  "invalid_api_key", // Google returned 400/401/403
  "rate_limited", // Google returned 429
  "bad_token", // Token could not be parsed or has an invalid shape
  "bad_input", // Input validation failed
  "upstream", // Any other Google-side failure
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export function toErrorCode(e: unknown): ErrorCode {
  const m = e instanceof Error ? e.message : "";
  return (ERROR_CODES as readonly string[]).includes(m) ? (m as ErrorCode) : "upstream";
}

// ---------------- Input schemas (used for both server function validators and client types)

const apiKey = z.string().trim().min(1).max(LIMITS.apiKey).optional();
const token = z.string().min(10).max(8000);

export const registerInput = z.object({
  answer: z.string().trim().min(1).max(LIMITS.answer),
  notes: z.string().trim().max(LIMITS.notes).default(""),
  /** When true, use Google Search only for questions answered as `unknown`. */
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
  /** `referenceBlob` values returned by `ask`, ordered by question. */
  // Keep a generous per-item limit: search text + Search Suggestions HTML
  // can reach tens of KB. Exceeding this limit would fail validation and prevent the result screen from rendering.
  referenceBlobs: z.array(z.string().max(200_000)).max(500).default([]),
});
export type RevealInput = z.input<typeof revealInput>;

export const testConnectionInput = z.object({
  apiKey,
  /** When true, also probe Google Search (grounding). Each search incurs a charge. */
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

// ---------------- Return types

export type ConfigResult = {
  /** True when `GEMINI_API_KEY` is configured on the server; hides the UI key input when true. */
  serverHasKey: boolean;
};

export type Identified = {
  /** Canonical name */
  name: string;
  aliases: string[];
  /** Short confirmation summary shown to the host (~200 chars). */
  summary: string;
  /** Whether the model is confident it knows this subject; shows a warning to the host if false. */
  confident: boolean;
};

export type RegisterResult = {
  /** Topic (JSON string) held by the guesser's client and sent back with every question. */
  token: string;
  identified: Identified;
};

export type GenerateTopicResult = {
  /** Topic (JSON string). `identified` is omitted from the response so the UI never shows the answer. */
  token: string;
};

export type AskResult = {
  verdict: AskVerdict;
  /** All zeros when `verdict` is `invalid`. */
  probabilities: Probabilities;
  /** Whether Google Search was used after an initial `unknown` verdict. */
  searched: boolean;
  /** Present only when searched; JSON string. Passed to `revealAnswer` on game end. */
  referenceBlob?: string;
};

export type GuessResult = {
  verdict: GuessVerdict;
};

export type ChatResult = ({ kind: "ask" } & AskResult) | ({ kind: "guess" } & GuessResult);

export type Reference = {
  /** Question that triggered the search. */
  question: string;
  /** Summarized search result text (rendered as-is). */
  text: string;
  sources: { title?: string; uri: string }[];
  /** Search Suggestions HTML returned by Google (rendered as-is). */
  searchSuggestionsHtml?: string;
  queries: string[];
};

export type RevealResult = {
  identified: Identified;
  /** Answer and notes entered by the host. */
  answer: string;
  notes: string;
  references: Reference[];
};

/** Result of a single connection test probe. Returns an `ErrorCode` on failure. */
export type ProbeResult = { ok: true; ms: number } | { ok: false; error: ErrorCode };

export type TestConnectionResult = {
  /** Question evaluation (Decisions) */
  decisions: ProbeResult;
  /** Topic identification (Flash-Lite) */
  text: ProbeResult;
  /** Google Search; present only when `checkSearch` is true. */
  search?: ProbeResult;
};

export type TranscribeResult = {
  text: string;
};
