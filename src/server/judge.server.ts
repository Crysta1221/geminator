/**
 * 質問・最終回答の判定ロジックと文字列正規化(サーバー専用、純粋関数)。
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
 * 文字列照合用の正規化:
 * 1. NFKC 正規化(全角英数・半角カナなどを統一)
 * 2. 小文字化
 * 3. ひらがなをカタカナに統一
 * 4. 空白と記号・句読点を除去
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
 * 「〇〇ですね」「答えは〇〇」「〇〇ですか？」のような発話から回答候補部分を取り出す。
 */
export function extractGuessCandidate(input: string): string {
  const trimmed = input.trim();
  const withoutSuffix = trimmed.replace(GUESS_SUFFIX_RE, "").trim();
  const withoutPrefix = withoutSuffix.replace(GUESS_PREFIX_RE, "").trim();
  return withoutPrefix;
}

/**
 * 最終回答が正解の名前または別名のいずれかと正規化後に一致するか判定する。
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
 * 元の入力または「〇〇ですね / 〇〇ですか？」等の枠を取り除いた候補が
 * 正解の名前・別名と一致するか判定する。
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
 * 5択の確率マップを完全な Probabilities に正規化する。
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
 * Decisions の応答(askable + answer)から質問の判定結果を決める。
 * - askable の noul が 0.3 未満なら invalid(確率は全部 0)
 * - それ以外は、最大確率の選択肢をそのまま採用する。確率による切り捨てはしない。
 *   「部分的に」は確率が低くてもそのまま返す。「わからない」は、どの選択肢にも
 *   当てはまらない(情報がない)ときに Decisions が最大にしたものだけを指す。
 *   検索を使わない設定でも、Decisions の判定(モデルの知識)をそのまま使う。
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
 * Decisions の応答(same / close / different)から最終回答の判定を決める。
 * - same が最大かつ confidence >= 0.6 なら correct
 * - close が最大かつ confidence >= 0.6 なら close
 * - それ以外は wrong
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
 * 統合チャット用の Decisions 応答(intent + ask + guess)から質問/回答のどちらかを判定する。
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
 * Decisions の共有 input 用に正解の情報を短い見出し付きテキストにまとめる。
 * 検索結果(searchContext)があるときは末尾に一時的に追加する。
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
