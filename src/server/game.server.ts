/**
 * ゲームの処理本体(サーバー専用)。
 * 設計メモ(docs/DESIGN.md)に従って register / ask / guess / reveal / config / testConnection を処理する。
 */
import { z } from "zod";

import {
  type AskResult,
  type askInput,
  type ChatResult,
  type chatInput,
  type ConfigResult,
  type GenerateTopicResult,
  type generateTopicInput,
  type GuessResult,
  type guessInput,
  type ProbeResult,
  type Reference,
  type RegisterResult,
  type RevealResult,
  type registerInput,
  type revealInput,
  type TestConnectionResult,
  type testConnectionInput,
  type TranscribeResult,
  type transcribeInput,
  toErrorCode,
} from "#/lib/contract";

import { type AI, createAI, type ProbeKind } from "./ai.server";
import { getServerApiKey, getTokenSecret } from "./config.server";
import { openJson, sealJson } from "./crypto.server";
import {
  evaluateAskDecision,
  evaluateChatDecision,
  evaluateGuessDecision,
  matchesGuessCandidate,
} from "./judge.server";

const identifiedSchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()),
  summary: z.string(),
  confident: z.boolean(),
});

const topicTokenSchema = z.object({
  answer: z.string(),
  notes: z.string(),
  identified: identifiedSchema,
  useSearch: z.boolean(),
});
type TopicTokenPayload = z.infer<typeof topicTokenSchema>;

const referenceSchema = z.object({
  question: z.string(),
  text: z.string(),
  sources: z.array(
    z.object({
      title: z.string().optional(),
      uri: z.string(),
    }),
  ),
  searchSuggestionsHtml: z.string().optional(),
  queries: z.array(z.string()),
});

async function openTopicToken(token: string, secret: string): Promise<TopicTokenPayload> {
  const raw = await openJson<unknown>(token, secret);
  const parsed = topicTokenSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("bad_token");
  }
  return parsed.data;
}

async function openReferenceBlob(blob: string, secret: string): Promise<Reference> {
  const raw = await openJson<unknown>(blob, secret);
  const parsed = referenceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("bad_token");
  }
  return parsed.data;
}

export function handleConfig(): ConfigResult {
  return {
    serverHasKey: Boolean(getServerApiKey()),
  };
}

export async function handleRegister(
  data: z.output<typeof registerInput>,
): Promise<RegisterResult> {
  const secret = getTokenSecret();
  const ai = createAI(data.apiKey);
  const identified = await ai.makeDossier(data.answer, data.notes);
  const payload: TopicTokenPayload = {
    answer: data.answer,
    notes: data.notes,
    identified,
    useSearch: data.useSearch,
  };
  const token = await sealJson(payload, secret);
  return { token, identified };
}

export async function handleGenerateTopic(
  data: z.output<typeof generateTopicInput>,
): Promise<GenerateTopicResult> {
  const secret = getTokenSecret();
  const ai = createAI(data.apiKey);
  const identified = await ai.generateTopicFromGenre(data.genre, data.excludeNames);
  const payload: TopicTokenPayload = {
    answer: identified.name,
    notes: `ジャンル: ${data.genre}`,
    identified,
    useSearch: data.useSearch,
  };
  const token = await sealJson(payload, secret);
  return { token };
}

async function resolveUnknownWithSearch(
  ai: AI,
  topic: TopicTokenPayload,
  question: string,
  secret: string,
  initial: Pick<AskResult, "verdict" | "probabilities">,
): Promise<AskResult> {
  if (initial.verdict !== "unknown") {
    return {
      verdict: initial.verdict,
      probabilities: initial.probabilities,
      searched: false,
    };
  }

  // Google 検索が有効なら Grounding with Google Search、無効なら無料の Wikipedia API で補う。
  // 検索や記事取得に失敗しても質問全体は失敗させず、「検索なしの unknown」として返す。
  let facts: Awaited<ReturnType<typeof ai.searchFacts>>;
  try {
    facts = topic.useSearch
      ? await ai.searchFacts(topic, question)
      : await ai.searchWikipediaFacts(topic, question);
  } catch {
    return {
      verdict: initial.verdict,
      probabilities: initial.probabilities,
      searched: false,
    };
  }

  const reference: Reference = {
    question,
    text: facts.text,
    sources: facts.sources,
    ...(facts.searchSuggestionsHtml ? { searchSuggestionsHtml: facts.searchSuggestionsHtml } : {}),
    queries: facts.queries,
  };
  const referenceBlob = await sealJson(reference, secret);

  const secondDecision = await ai.judgeQuestion(topic, question, facts.text);
  const rejudged = evaluateAskDecision(secondDecision);

  return {
    verdict: rejudged.verdict,
    probabilities: rejudged.probabilities,
    searched: true,
    referenceBlob,
  };
}

export async function handleAsk(data: z.output<typeof askInput>): Promise<AskResult> {
  const secret = getTokenSecret();
  const topic = await openTopicToken(data.token, secret);
  const ai = createAI(data.apiKey);

  const firstDecision = await ai.judgeQuestion(topic, data.question);
  // 判定は Decisions の最大確率をそのまま採用する(確率による切り捨てはしない)。
  // 検索を使う設定のときだけ、「わからない」を検索に回す。
  const judged = evaluateAskDecision(firstDecision);
  return resolveUnknownWithSearch(ai, topic, data.question, secret, judged);
}

export async function handleGuess(data: z.output<typeof guessInput>): Promise<GuessResult> {
  const secret = getTokenSecret();
  const topic = await openTopicToken(data.token, secret);

  const candidates = [topic.answer, topic.identified.name, ...topic.identified.aliases];
  if (matchesGuessCandidate(data.guess, candidates)) {
    return { verdict: "correct" };
  }

  const ai = createAI(data.apiKey);
  const decision = await ai.judgeGuess(topic, data.guess);
  return { verdict: evaluateGuessDecision(decision) };
}

export async function handleChat(data: z.output<typeof chatInput>): Promise<ChatResult> {
  const secret = getTokenSecret();
  const topic = await openTopicToken(data.token, secret);

  const candidates = [topic.answer, topic.identified.name, ...topic.identified.aliases];
  if (matchesGuessCandidate(data.message, candidates)) {
    return { kind: "guess", verdict: "correct" };
  }

  const ai = createAI(data.apiKey);
  const decision = await ai.judgeChat(topic, data.message);
  const evaluated = evaluateChatDecision(decision);
  if (evaluated.kind === "guess") {
    return { kind: "guess", verdict: evaluated.verdict };
  }

  const askResult = await resolveUnknownWithSearch(ai, topic, data.message, secret, evaluated);
  return { kind: "ask", ...askResult };
}

export async function handleReveal(data: z.output<typeof revealInput>): Promise<RevealResult> {
  const secret = getTokenSecret();
  const topic = await openTopicToken(data.token, secret);

  const references: Reference[] = [];
  for (const blob of data.referenceBlobs) {
    try {
      const ref = await openReferenceBlob(blob, secret);
      references.push(ref);
    } catch {
      // 復号できないものは捨てる
    }
  }

  return {
    identified: topic.identified,
    answer: topic.answer,
    notes: topic.notes,
    references,
  };
}

async function measureProbe(ai: AI, kind: ProbeKind): Promise<number> {
  const start = performance.now();
  await ai.probe(kind);
  return Math.max(0, Math.round(performance.now() - start));
}

function toProbeResult(settled: PromiseSettledResult<number>): ProbeResult {
  if (settled.status === "fulfilled") {
    return { ok: true, ms: settled.value };
  }
  return { ok: false, error: toErrorCode(settled.reason) };
}

export async function handleTestConnection(
  data: z.output<typeof testConnectionInput>,
): Promise<TestConnectionResult> {
  const ai = createAI(data.apiKey);

  if (data.checkSearch) {
    const [decisions, text, search] = await Promise.allSettled([
      measureProbe(ai, "decisions"),
      measureProbe(ai, "text"),
      measureProbe(ai, "search"),
    ]);
    return {
      decisions: toProbeResult(decisions),
      text: toProbeResult(text),
      search: toProbeResult(search),
    };
  }

  const [decisions, text] = await Promise.allSettled([
    measureProbe(ai, "decisions"),
    measureProbe(ai, "text"),
  ]);
  return {
    decisions: toProbeResult(decisions),
    text: toProbeResult(text),
  };
}

export async function handleTranscribe(
  data: z.output<typeof transcribeInput>,
): Promise<TranscribeResult> {
  const ai = createAI(data.apiKey);
  const text = await ai.transcribeAudio(data.audioBase64, data.mimeType);
  return { text };
}
