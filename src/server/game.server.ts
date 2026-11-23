/**
 * Core game handlers (server-only).
 * Implements register / ask / guess / reveal / config / testConnection per `docs/DESIGN.md`.
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
  type InspectChatResult,
  type InspectDecisionSnapshot,
  type InspectSearchStep,
  type inspectChatInput,
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
import {
  getDecisionsModel,
  getServerApiKey,
  getSiteUrl,
  getTextModel,
  THRESHOLDS,
} from "./config.server";
import {
  buildTopicInput,
  evaluateAskDecision,
  evaluateChatDecision,
  evaluateGuessDecision,
  extractGuessCandidate,
  matchesGuessCandidate,
  normalizeForMatch,
  normalizeProbabilities,
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

function parseJsonOrBadToken(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("bad_token");
  }
}

function openTopicToken(token: string): TopicTokenPayload {
  const parsed = topicTokenSchema.safeParse(parseJsonOrBadToken(token));
  if (!parsed.success) {
    throw new Error("bad_token");
  }
  return parsed.data;
}

function openReferenceBlob(blob: string): Reference {
  const parsed = referenceSchema.safeParse(parseJsonOrBadToken(blob));
  if (!parsed.success) {
    throw new Error("bad_token");
  }
  return parsed.data;
}

export function handleConfig(): ConfigResult {
  const siteUrl = getSiteUrl();
  return {
    serverHasKey: Boolean(getServerApiKey()),
    ...(siteUrl ? { siteUrl } : {}),
  };
}

export async function handleRegister(
  data: z.output<typeof registerInput>,
): Promise<RegisterResult> {
  const ai = createAI(data.apiKey);
  const identified = await ai.makeDossier(data.answer, data.notes);
  const payload: TopicTokenPayload = {
    answer: data.answer,
    notes: data.notes,
    identified,
    useSearch: data.useSearch,
  };
  return { token: JSON.stringify(payload), identified };
}

export async function handleGenerateTopic(
  data: z.output<typeof generateTopicInput>,
): Promise<GenerateTopicResult> {
  const ai = createAI(data.apiKey);
  const identified = await ai.generateTopicFromGenre(data.genre, data.excludeNames);
  const payload: TopicTokenPayload = {
    answer: identified.name,
    notes: `ジャンル: ${data.genre}`,
    identified,
    useSearch: data.useSearch,
  };
  return { token: JSON.stringify(payload) };
}

async function resolveUnknownWithSearch(
  ai: AI,
  topic: TopicTokenPayload,
  question: string,
  initial: Pick<AskResult, "verdict" | "probabilities">,
): Promise<AskResult> {
  if (initial.verdict !== "unknown") {
    return {
      verdict: initial.verdict,
      probabilities: initial.probabilities,
      searched: false,
    };
  }

  // Use Grounding with Google Search when enabled; otherwise fall back to the free Wikipedia API.
  // Even if search or article retrieval fails, do not fail the whole question—return `unknown` without search.
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
  const referenceBlob = JSON.stringify(reference);

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
  const topic = openTopicToken(data.token);
  const ai = createAI(data.apiKey);

  const firstDecision = await ai.judgeQuestion(topic, data.question);
  // Pick the highest-probability choice from Decisions directly (no probability cutoff).
  // Only trigger search for `unknown` when search is configured.
  const judged = evaluateAskDecision(firstDecision);
  return resolveUnknownWithSearch(ai, topic, data.question, judged);
}

export async function handleGuess(data: z.output<typeof guessInput>): Promise<GuessResult> {
  const topic = openTopicToken(data.token);

  const candidates = [topic.answer, topic.identified.name, ...topic.identified.aliases];
  if (matchesGuessCandidate(data.guess, candidates)) {
    return { verdict: "correct" };
  }

  const ai = createAI(data.apiKey);
  const decision = await ai.judgeGuess(topic, data.guess);
  return { verdict: evaluateGuessDecision(decision) };
}

export async function handleChat(data: z.output<typeof chatInput>): Promise<ChatResult> {
  const topic = openTopicToken(data.token);

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

  const askResult = await resolveUnknownWithSearch(ai, topic, data.message, evaluated);
  return { kind: "ask", ...askResult };
}

export async function handleInspectChat(
  data: z.output<typeof inspectChatInput>,
): Promise<InspectChatResult> {
  const totalStart = performance.now();
  const topic = openTopicToken(data.token);
  const models = {
    decisions: getDecisionsModel(),
    text: getTextModel(),
  };

  const candidates = [topic.answer, topic.identified.name, ...topic.identified.aliases];
  const normalizedMessage = normalizeForMatch(data.message);
  const extractedCandidate = extractGuessCandidate(data.message);
  const matched = matchesGuessCandidate(data.message, candidates);

  if (matched) {
    return {
      final: { kind: "guess", verdict: "correct" },
      models,
      totalMs: Math.max(0, Math.round(performance.now() - totalStart)),
      stringMatch: {
        normalizedMessage,
        extractedCandidate,
        matched: true,
      },
    };
  }

  const ai = createAI(data.apiKey);
  const topicInput = buildTopicInput(topic);
  const decisionsStart = performance.now();
  const decision = await ai.judgeChat(topic, data.message);
  const decisionsMs = Math.max(0, Math.round(performance.now() - decisionsStart));

  const evaluated = evaluateChatDecision(decision);
  const snapshot: InspectDecisionSnapshot = {
    intent: {
      choice: evaluated.kind === "guess" ? "guess" : "question",
      probabilities: decision.intentProbabilities,
    },
    askable: {
      score: decision.askableNoul,
      threshold: THRESHOLDS.askableMin,
      passed: decision.askableNoul >= THRESHOLDS.askableMin,
    },
    answer: {
      choice: decision.answerChoice,
      probabilities: normalizeProbabilities(decision.answerProbabilities),
    },
    guess: {
      choice: decision.guessChoice,
      confidence: decision.guessConfidence,
      threshold: THRESHOLDS.guessSameConfidenceMin,
      probabilities: decision.guessProbabilities,
    },
  };

  if (evaluated.kind === "guess") {
    return {
      final: { kind: "guess", verdict: evaluated.verdict },
      models,
      totalMs: Math.max(0, Math.round(performance.now() - totalStart)),
      stringMatch: {
        normalizedMessage,
        extractedCandidate,
        matched: false,
      },
      decisions: {
        durationMs: decisionsMs,
        topicInput,
        snapshot,
      },
    };
  }

  if (evaluated.verdict !== "unknown") {
    return {
      final: {
        kind: "ask",
        verdict: evaluated.verdict,
        probabilities: evaluated.probabilities,
        searched: false,
      },
      models,
      totalMs: Math.max(0, Math.round(performance.now() - totalStart)),
      stringMatch: {
        normalizedMessage,
        extractedCandidate,
        matched: false,
      },
      decisions: {
        durationMs: decisionsMs,
        topicInput,
        snapshot,
      },
    };
  }

  const provider = topic.useSearch ? "google_search" : "wikipedia";
  const searchStart = performance.now();
  let facts: Awaited<ReturnType<typeof ai.searchFacts>>;
  try {
    facts = topic.useSearch
      ? await ai.searchFacts(topic, data.message)
      : await ai.searchWikipediaFacts(topic, data.message);
  } catch {
    const searchStep: InspectSearchStep = {
      provider,
      succeeded: false,
      durationMs: Math.max(0, Math.round(performance.now() - searchStart)),
    };
    return {
      final: {
        kind: "ask",
        verdict: evaluated.verdict,
        probabilities: evaluated.probabilities,
        searched: false,
      },
      models,
      totalMs: Math.max(0, Math.round(performance.now() - totalStart)),
      stringMatch: {
        normalizedMessage,
        extractedCandidate,
        matched: false,
      },
      decisions: {
        durationMs: decisionsMs,
        topicInput,
        snapshot,
      },
      searchStep,
    };
  }

  const searchDurationMs = Math.max(0, Math.round(performance.now() - searchStart));
  const reference: Reference = {
    question: data.message,
    text: facts.text,
    sources: facts.sources,
    ...(facts.searchSuggestionsHtml ? { searchSuggestionsHtml: facts.searchSuggestionsHtml } : {}),
    queries: facts.queries,
  };
  const referenceBlob = JSON.stringify(reference);

  const rejudgeStart = performance.now();
  const secondDecision = await ai.judgeQuestion(topic, data.message, facts.text);
  const rejudgeDurationMs = Math.max(0, Math.round(performance.now() - rejudgeStart));
  const rejudged = evaluateAskDecision(secondDecision);

  const searchStep: InspectSearchStep = {
    provider,
    succeeded: true,
    durationMs: searchDurationMs,
    reference,
    rejudged: {
      askable: {
        score: secondDecision.askableNoul,
        threshold: THRESHOLDS.askableMin,
        passed: secondDecision.askableNoul >= THRESHOLDS.askableMin,
      },
      answer: {
        choice: secondDecision.answerChoice,
        probabilities: normalizeProbabilities(secondDecision.answerProbabilities),
      },
      verdict: rejudged.verdict,
      durationMs: rejudgeDurationMs,
    },
  };

  return {
    final: {
      kind: "ask",
      verdict: rejudged.verdict,
      probabilities: rejudged.probabilities,
      searched: true,
      referenceBlob,
    },
    models,
    totalMs: Math.max(0, Math.round(performance.now() - totalStart)),
    stringMatch: {
      normalizedMessage,
      extractedCandidate,
      matched: false,
    },
    decisions: {
      durationMs: decisionsMs,
      topicInput,
      snapshot,
    },
    searchStep,
  };
}

export async function handleReveal(data: z.output<typeof revealInput>): Promise<RevealResult> {
  const topic = openTopicToken(data.token);

  const references: Reference[] = [];
  for (const blob of data.referenceBlobs) {
    try {
      references.push(openReferenceBlob(blob));
    } catch {
      // Discard blobs that fail to parse
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
