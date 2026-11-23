/**
 * Response parsing, candidate selection, and upstream error mapping for Gemini APIs (server-only).
 */
import type { Decisions, GenerateContentResponse } from "@google/genai";
import type { z } from "zod";

import { type ErrorCode, type Identified, VERDICTS, type Verdict } from "#/lib/contract";

import {
  CHAT_INTENTS,
  type ChatDecision,
  type ChatIntent,
  GUESS_CHOICES,
  type GuessChoice,
  type GuessDecision,
  matchesAnswerOrAlias,
  normalizeProbabilities,
  type QuestionDecision,
} from "../judge.server";
import { dossierResponseSchema, genreTopicResponseSchema } from "./prompts.server";

export type SearchFactsResult = {
  text: string;
  sources: { title?: string; uri: string }[];
  searchSuggestionsHtml?: string;
  queries: string[];
};

/**
 * Extract the HTTP status code from an SDK error object (e.g., `ApiError` / `APIError`).
 */
export function extractHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") {
    return undefined;
  }
  const record = err as Record<string, unknown>;
  if (typeof record.status === "number" && Number.isFinite(record.status)) {
    return record.status;
  }
  if (typeof record.statusCode === "number" && Number.isFinite(record.statusCode)) {
    return record.statusCode;
  }
  if (typeof record.httpStatus === "number" && Number.isFinite(record.httpStatus)) {
    return record.httpStatus;
  }
  if (
    record.rawResponse &&
    typeof record.rawResponse === "object" &&
    typeof (record.rawResponse as Record<string, unknown>).status === "number"
  ) {
    return (record.rawResponse as Record<string, unknown>).status as number;
  }
  if (record.cause && record.cause !== err) {
    return extractHttpStatus(record.cause);
  }
  return undefined;
}

/**
 * Map a Google error to a contract `ErrorCode`.
 * 400/401/403 -> `invalid_api_key`, 429 -> `rate_limited`, others -> `upstream`.
 */
export function mapGoogleError(err: unknown): ErrorCode {
  const status = extractHttpStatus(err);
  if (status === 401 || status === 403) {
    return "invalid_api_key";
  }
  if (status === 400) {
    // 400 can also be returned for malformed requests; treat as `invalid_api_key` only when it mentions the key.
    const message = err instanceof Error ? err.message : "";
    return /api[\s_-]?key/i.test(message) ? "invalid_api_key" : "upstream";
  }
  if (status === 429) {
    return "rate_limited";
  }
  return "upstream";
}

/**
 * Log Google-side errors on the server (for debugging).
 * Logs only the status and Google's message, redacting the API key.
 */
export function logUpstreamError(context: string, err: unknown, apiKey?: string): void {
  const status = extractHttpStatus(err);
  let message = err instanceof Error ? err.message : String(err);
  if (apiKey) {
    message = message.split(apiKey).join("***");
  }
  console.error(`[ai] ${context} failed`, {
    status,
    message: message.slice(0, 500),
  });
}

export function extractSearchFactsResult(
  response: Pick<GenerateContentResponse, "text" | "candidates">,
): SearchFactsResult {
  const text = (response.text ?? "").trim();
  const metadata = response.candidates?.[0]?.groundingMetadata;

  const seenUris = new Set<string>();
  const sources: { title?: string; uri: string }[] = [];
  for (const chunk of metadata?.groundingChunks ?? []) {
    const uri = chunk.web?.uri?.trim();
    if (!uri || seenUris.has(uri)) {
      continue;
    }
    seenUris.add(uri);
    const title = chunk.web?.title?.trim();
    sources.push(title ? { title, uri } : { uri });
  }

  const renderedContent = metadata?.searchEntryPoint?.renderedContent;
  const searchSuggestionsHtml =
    typeof renderedContent === "string" && renderedContent.length > 0 ? renderedContent : undefined;

  const queries = (metadata?.webSearchQueries ?? [])
    .map((q) => q.trim())
    .filter((q) => q.length > 0);

  return {
    text,
    sources,
    ...(searchSuggestionsHtml ? { searchSuggestionsHtml } : {}),
    queries,
  };
}

function toIdentified(
  parsed: z.infer<typeof dossierResponseSchema>,
  fallbackAnswer: string,
): Identified {
  const name = parsed.canonicalName.trim() || fallbackAnswer;
  const aliases = Array.from(
    new Set(parsed.aliases.map((a) => a.trim()).filter((a) => a.length > 0 && a !== name)),
  ).slice(0, 8);
  const summary = parsed.summary.trim().slice(0, 200);
  return {
    name,
    aliases,
    summary,
    confident: parsed.confident,
  };
}

export function parseDossierText(rawText: string | undefined, fallbackAnswer: string): Identified {
  if (!rawText) {
    throw new Error("upstream");
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error("upstream");
  }
  const parsed = dossierResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("upstream");
  }
  return toIdentified(parsed.data, fallbackAnswer);
}

function randomIndex(length: number): number {
  if (length <= 1) return 0;
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % length;
  }
  return Math.floor(Math.random() * length);
}

export function pickGenreTopicCandidate(
  rawText: string | undefined,
  genre: string,
  excludeNames: readonly string[] = [],
  pickFn: (length: number) => number = randomIndex,
): Identified {
  if (!rawText) {
    throw new Error("upstream");
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error("upstream");
  }
  const parsed = genreTopicResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("upstream");
  }

  const normalizedGenre = genre.trim();
  const valid = parsed.data.candidates
    .map((item) => toIdentified(item, ""))
    .filter((item) => item.name.length > 0 && item.name !== normalizedGenre);

  if (valid.length === 0) {
    throw new Error("upstream");
  }

  const confidentPool = valid.filter((item) => item.confident);
  const basePool = confidentPool.length > 0 ? confidentPool : valid;

  const filteredPool =
    excludeNames.length > 0
      ? basePool.filter(
          (item) =>
            !matchesAnswerOrAlias(item.name, excludeNames) &&
            !item.aliases.some((alias) => matchesAnswerOrAlias(alias, excludeNames)),
        )
      : basePool;

  const finalPool = filteredPool.length > 0 ? filteredPool : basePool;
  const idx = Math.max(0, Math.min(finalPool.length - 1, pickFn(finalPool.length)));
  return finalPool[idx];
}

function parseChoiceProbabilities<T extends string>(
  keys: readonly T[],
  raw: Partial<Record<string, number>> | undefined,
): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const key of keys) {
    const val = raw?.[key];
    out[key] = typeof val === "number" && Number.isFinite(val) ? val : 0;
  }
  return out;
}

export function parseQuestionDecisionResponse(
  response: Decisions.CreateDecisionResponse,
): QuestionDecision {
  const answer = response.answers?.answer;
  const askable = response.answers?.askable;
  if (!answer || answer.type !== "choice" || !askable || askable.type !== "noul") {
    throw new Error("upstream");
  }
  const answerProbabilities = normalizeProbabilities(answer.probabilities);
  const answerChoice: Verdict = (VERDICTS as readonly string[]).includes(answer.choice)
    ? (answer.choice as Verdict)
    : "unknown";
  return {
    askableNoul: askable.noul,
    answerChoice,
    answerConfidence: answer.confidence,
    answerProbabilities,
  };
}

function parseGuessAnswer(guess: Decisions.Answer | undefined): GuessDecision {
  if (!guess || guess.type !== "choice") {
    throw new Error("upstream");
  }
  const probabilities = parseChoiceProbabilities(GUESS_CHOICES, guess.probabilities);
  const choice: GuessChoice = (GUESS_CHOICES as readonly string[]).includes(guess.choice)
    ? (guess.choice as GuessChoice)
    : "different";
  return {
    choice,
    confidence: guess.confidence,
    probabilities,
  };
}

export function parseGuessDecisionResponse(
  response: Decisions.CreateDecisionResponse,
): GuessDecision {
  return parseGuessAnswer(response.answers?.guess);
}

export function parseChatDecisionResponse(
  response: Decisions.CreateDecisionResponse,
): ChatDecision {
  const intent = response.answers?.intent;
  if (!intent || intent.type !== "choice") {
    throw new Error("upstream");
  }
  const intentProbabilities = parseChoiceProbabilities(CHAT_INTENTS, intent.probabilities);
  const intentChoice: ChatIntent = (CHAT_INTENTS as readonly string[]).includes(intent.choice)
    ? (intent.choice as ChatIntent)
    : "question";
  const question = parseQuestionDecisionResponse(response);
  const guess = parseGuessAnswer(response.answers?.guess);
  return {
    intentChoice,
    intentProbabilities,
    ...question,
    guessChoice: guess.choice,
    guessConfidence: guess.confidence,
    guessProbabilities: guess.probabilities,
  };
}
