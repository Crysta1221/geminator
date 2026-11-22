/**
 * Question/guess evaluation logic and string normalization (server-only, pure functions).
 */
import {
  type AskVerdict,
  type GuessVerdict,
  type Identified,
  type Probabilities,
  VERDICTS,
  type Verdict,
} from "#/lib/contract";

import { THRESHOLDS } from "./config.server";

export type TopicContext = {
  answer: string;
  notes: string;
  identified: Identified;
};

export type GuessChoice = "same" | "close" | "different";

export const GUESS_CHOICES = ["same", "close", "different"] as const;

export type ChatIntent = "question" | "guess";

export const CHAT_INTENTS = ["question", "guess"] as const;

export type QuestionDecision = {
  askableNoul: number;
  answerChoice: Verdict;
  answerConfidence: number;
  answerProbabilities: Probabilities;
};

export type GuessDecision = {
  choice: GuessChoice;
  confidence: number;
  probabilities: Record<GuessChoice, number>;
};

export type ChatDecision = {
  intentChoice: ChatIntent;
  intentProbabilities: Record<ChatIntent, number>;
  askableNoul: number;
  answerChoice: Verdict;
  answerConfidence: number;
  answerProbabilities: Probabilities;
  guessChoice: GuessChoice;
  guessConfidence: number;
  guessProbabilities: Record<GuessChoice, number>;
};

export type ChatEvaluated =
  | { kind: "ask"; verdict: AskVerdict; probabilities: Probabilities }
  | { kind: "guess"; verdict: GuessVerdict };

export const ZERO_PROBABILITIES: Probabilities = {
  yes: 0,
  partially_yes: 0,
  partially_no: 0,
  no: 0,
  unknown: 0,
};

/**
 * Normalization for string matching:
 * 1. NFKC normalization (unify full-width alphanumerics, half-width kana, etc.)
 * 2. Lowercase
 * 3. Convert hiragana to katakana
 * 4. Strip whitespace, punctuation, and symbols
 */
export function normalizeForMatch(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

const GUESS_PREFIX_RE =
  /^(?:答えは|正解は|もしかして|たぶん|おそらく|きっと|それって|これは|それは|あれは)\s*/;
const GUESS_SUFFIX_RE =
  /\s*(?:じゃないですか|でしょうか|ですね|ですか|だよね|だと思う|と思います|かな|です|だ)?[？?！!。.]*$/;

/**
 * Extract the guess candidate from utterances like "〇〇ですね", "答えは〇〇", or "〇〇ですか？".
 */
export function extractGuessCandidate(input: string): string {
  const trimmed = input.trim();
  const withoutSuffix = trimmed.replace(GUESS_SUFFIX_RE, "").trim();
  const withoutPrefix = withoutSuffix.replace(GUESS_PREFIX_RE, "").trim();
  return withoutPrefix;
}

/**
 * Check whether the final guess matches the canonical name or any alias after normalization.
 */
export function matchesAnswerOrAlias(guess: string, candidates: readonly string[]): boolean {
  const normalizedGuess = normalizeForMatch(guess);
  if (!normalizedGuess) {
    return false;
  }
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeForMatch(candidate);
    if (normalizedCandidate && normalizedCandidate === normalizedGuess) {
      return true;
    }
  }
  return false;
}

/**
 * Check whether the raw input or the candidate with framing (e.g. "〇〇ですね / 〇〇ですか？")
 * stripped matches the canonical name or any alias.
 */
export function matchesGuessCandidate(input: string, candidates: readonly string[]): boolean {
  if (matchesAnswerOrAlias(input, candidates)) {
    return true;
  }
  const stripped = extractGuessCandidate(input);
  if (!stripped || stripped === input.trim()) {
    return false;
  }
  return matchesAnswerOrAlias(stripped, candidates);
}

/**
 * Normalize a 5-choice probability map into a complete `Probabilities` object.
 */
export function normalizeProbabilities(
  raw: Partial<Record<string, number>> | undefined,
): Probabilities {
  return {
    yes: toFiniteProb(raw?.yes),
    partially_yes: toFiniteProb(raw?.partially_yes),
    partially_no: toFiniteProb(raw?.partially_no),
    no: toFiniteProb(raw?.no),
    unknown: toFiniteProb(raw?.unknown),
  };
}

function toFiniteProb(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function pickMaxKey<T extends string>(
  keys: readonly T[],
  probabilities: Record<T, number>,
  preferredChoice?: string,
  fallback?: T,
): T {
  let best: T = fallback ?? keys[0];
  let bestProb = -1;
  for (const key of keys) {
    const p = probabilities[key];
    if (p > bestProb) {
      bestProb = p;
      best = key;
    }
  }
  if (
    preferredChoice &&
    (keys as readonly string[]).includes(preferredChoice) &&
    probabilities[preferredChoice as T] === bestProb
  ) {
    return preferredChoice as T;
  }
  return best;
}

/**
 * Determine the question verdict from Decisions output (`askable` + `answer`).
 * - If `askable` noul < 0.3, return `invalid` (all probabilities 0).
 * - Otherwise, pick the highest-probability choice directly without a probability cutoff.
 *   "Partially" verdicts are returned even at low probability. `unknown` refers only to
 *   cases where Decisions gives `unknown` the highest probability due to missing information.
 *   Even when search is disabled, rely directly on Decisions' judgment (model knowledge).
 */
export function evaluateAskDecision(decision: QuestionDecision): {
  verdict: AskVerdict;
  probabilities: Probabilities;
} {
  if (decision.askableNoul < THRESHOLDS.askableMin) {
    return {
      verdict: "invalid",
      probabilities: { ...ZERO_PROBABILITIES },
    };
  }
  const probabilities = normalizeProbabilities(decision.answerProbabilities);
  const best = pickMaxKey(VERDICTS, probabilities, decision.answerChoice, "unknown");
  return {
    verdict: best,
    probabilities,
  };
}

/**
 * Determine the final guess verdict from Decisions output (`same` / `close` / `different`).
 * - `correct` if `same` is highest and `confidence >= 0.6`
 * - `close` if `close` is highest and `confidence >= 0.6`
 * - `wrong` otherwise
 */
export function evaluateGuessDecision(decision: GuessDecision): GuessVerdict {
  const best = pickMaxKey(GUESS_CHOICES, decision.probabilities, decision.choice, "different");
  if (best === "same" && decision.confidence >= THRESHOLDS.guessSameConfidenceMin) {
    return "correct";
  }
  if (best === "close" && decision.confidence >= THRESHOLDS.guessCloseConfidenceMin) {
    return "close";
  }
  return "wrong";
}

/**
 * Evaluate a unified chat Decisions response (`intent` + `ask` + `guess`) as either a question or a guess.
 */
export function evaluateChatDecision(decision: ChatDecision): ChatEvaluated {
  const intent = pickMaxKey(
    CHAT_INTENTS,
    decision.intentProbabilities,
    decision.intentChoice,
    "question",
  );
  if (intent === "guess") {
    return {
      kind: "guess",
      verdict: evaluateGuessDecision({
        choice: decision.guessChoice,
        confidence: decision.guessConfidence,
        probabilities: decision.guessProbabilities,
      }),
    };
  }
  const ask = evaluateAskDecision({
    askableNoul: decision.askableNoul,
    answerChoice: decision.answerChoice,
    answerConfidence: decision.answerConfidence,
    answerProbabilities: decision.answerProbabilities,
  });
  return {
    kind: "ask",
    verdict: ask.verdict,
    probabilities: ask.probabilities,
  };
}

/**
 * Format the secret answer information as short titled text for Decisions' shared `input`.
 * Temporarily appends `searchContext` at the end when present.
 */
export function buildTopicInput(topic: TopicContext, searchContext?: string): string {
  const lines: string[] = ["# 正解の対象", `正式名称: ${topic.identified.name}`];
  if (topic.answer && topic.answer !== topic.identified.name) {
    lines.push(`出題者の入力名: ${topic.answer}`);
  }
  if (topic.identified.aliases.length > 0) {
    lines.push(`別名・略称: ${topic.identified.aliases.join(" / ")}`);
  }
  if (topic.notes) {
    lines.push(`出題者の補足: ${topic.notes}`);
  }
  lines.push(`概要: ${topic.identified.summary}`);
  const extra = searchContext?.trim();
  if (extra) {
    lines.push("", "# 追加の調査結果(今回の質問に関する事実)", extra);
  }
  return lines.join("\n");
}
