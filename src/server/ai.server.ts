/**
 * AI invocation abstraction (`interface AI`) and `@google/genai` implementation (server-only).
 * Uses only Web standard APIs so it runs on Cloudflare Workers as well.
 */
import {
  type Decisions,
  type GenerateContentResponse,
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";

import type { Identified } from "#/lib/contract";

import {
  extractSearchFactsResult,
  logUpstreamError,
  mapGoogleError,
  parseChatDecisionResponse,
  parseDossierText,
  parseGuessDecisionResponse,
  parseQuestionDecisionResponse,
  pickGenreTopicCandidate,
  type SearchFactsResult,
} from "./ai/parsers.server";
import {
  buildChatDecisionRequest,
  buildDossierPrompt,
  buildGenreTopicPrompt,
  buildGuessDecisionRequest,
  buildProbeDecisionRequest,
  buildQuestionDecisionRequest,
  buildSearchPrompt,
  buildWikipediaSummaryPrompt,
  DOSSIER_JSON_SCHEMA,
  GENRE_TOPIC_JSON_SCHEMA,
} from "./ai/prompts.server";
import { getDecisionsModel, getTextModel, resolveApiKey } from "./config.server";
import type { ChatDecision, GuessDecision, QuestionDecision, TopicContext } from "./judge.server";
import { buildWikipediaExcerpt, fetchWikipediaArticle } from "./wikipedia.server";

export type { SearchFactsResult } from "./ai/parsers.server";
export {
  extractHttpStatus,
  extractSearchFactsResult,
  logUpstreamError,
  mapGoogleError,
  pickGenreTopicCandidate,
} from "./ai/parsers.server";
export {
  ANSWER_CRITERIA,
  buildChatDecisionRequest,
  buildDossierPrompt,
  buildGenreTopicPrompt,
  buildGuessDecisionRequest,
  buildProbeDecisionRequest,
  buildQuestionDecisionRequest,
  buildSearchPrompt,
  buildWikipediaSummaryPrompt,
  CHAT_INTENT_CRITERIA,
  GUESS_CRITERIA,
} from "./ai/prompts.server";

export type ProbeKind = "decisions" | "text" | "search";

export interface AI {
  makeDossier(answer: string, notes: string): Promise<Identified>;
  generateTopicFromGenre(genre: string, excludeNames?: readonly string[]): Promise<Identified>;
  judgeQuestion(
    topic: TopicContext,
    question: string,
    searchContext?: string,
  ): Promise<QuestionDecision>;
  judgeGuess(topic: TopicContext, guess: string): Promise<GuessDecision>;
  judgeChat(topic: TopicContext, message: string, searchContext?: string): Promise<ChatDecision>;
  searchFacts(topic: TopicContext, question: string): Promise<SearchFactsResult>;
  searchWikipediaFacts(topic: TopicContext, question: string): Promise<SearchFactsResult>;
  transcribeAudio(audioBase64: string, mimeType: string): Promise<string>;
  probe(kind: ProbeKind): Promise<void>;
}

export type AIFactory = (requestApiKey?: string) => AI;

let testAIFactory: AIFactory | null = null;

/** For testing: override the AI implementation. Pass `null` to restore. */
export function setAIFactoryForTest(factory: AIFactory | null): void {
  testAIFactory = factory;
}

export function createAI(requestApiKey?: string): AI {
  if (testAIFactory) {
    return testAIFactory(requestApiKey);
  }
  const apiKey = resolveApiKey(requestApiKey);
  return new GenAI({
    apiKey,
    decisionsModel: getDecisionsModel(),
    textModel: getTextModel(),
  });
}

export type GenAIOptions = {
  apiKey: string;
  decisionsModel: string;
  textModel: string;
};

export class GenAI implements AI {
  private readonly client: GoogleGenAI;
  private readonly apiKey: string;
  private readonly decisionsModel: string;
  private readonly textModel: string;

  constructor(options: GenAIOptions) {
    this.client = new GoogleGenAI({
      apiKey: options.apiKey,
      apiVersion: "v1beta",
    });
    this.apiKey = options.apiKey;
    this.decisionsModel = options.decisionsModel;
    this.textModel = options.textModel;
  }

  /** Log a Google-side failure and return an Error with a contract error code. */
  private fail(context: string, err: unknown): Error {
    logUpstreamError(context, err, this.apiKey);
    return new Error(mapGoogleError(err));
  }

  async makeDossier(answer: string, notes: string): Promise<Identified> {
    let response: GenerateContentResponse;
    try {
      response = await this.client.models.generateContent({
        model: this.textModel,
        contents: buildDossierPrompt(answer, notes),
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: DOSSIER_JSON_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
    } catch (err) {
      throw this.fail("makeDossier", err);
    }
    return parseDossierText(response.text, answer);
  }

  async generateTopicFromGenre(
    genre: string,
    excludeNames: readonly string[] = [],
  ): Promise<Identified> {
    let response: GenerateContentResponse;
    try {
      response = await this.client.models.generateContent({
        model: this.textModel,
        contents: buildGenreTopicPrompt(genre, excludeNames),
        config: {
          temperature: 1.1,
          responseMimeType: "application/json",
          responseJsonSchema: GENRE_TOPIC_JSON_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
    } catch (err) {
      throw this.fail("generateTopicFromGenre", err);
    }
    return pickGenreTopicCandidate(response.text, genre, excludeNames);
  }

  async judgeQuestion(
    topic: TopicContext,
    question: string,
    searchContext?: string,
  ): Promise<QuestionDecision> {
    const request = buildQuestionDecisionRequest(
      this.decisionsModel,
      topic,
      question,
      searchContext,
    );
    let response: Decisions.CreateDecisionResponse;
    try {
      response = await this.client.decisions.create(request);
    } catch (err) {
      throw this.fail("judgeQuestion", err);
    }
    return parseQuestionDecisionResponse(response);
  }

  async judgeGuess(topic: TopicContext, guess: string): Promise<GuessDecision> {
    const request = buildGuessDecisionRequest(this.decisionsModel, topic, guess);
    let response: Decisions.CreateDecisionResponse;
    try {
      response = await this.client.decisions.create(request);
    } catch (err) {
      throw this.fail("judgeGuess", err);
    }
    return parseGuessDecisionResponse(response);
  }

  async judgeChat(
    topic: TopicContext,
    message: string,
    searchContext?: string,
  ): Promise<ChatDecision> {
    const request = buildChatDecisionRequest(this.decisionsModel, topic, message, searchContext);
    let response: Decisions.CreateDecisionResponse;
    try {
      response = await this.client.decisions.create(request);
    } catch (err) {
      throw this.fail("judgeChat", err);
    }
    return parseChatDecisionResponse(response);
  }

  async searchFacts(topic: TopicContext, question: string): Promise<SearchFactsResult> {
    let response: GenerateContentResponse;
    try {
      response = await this.client.models.generateContent({
        model: this.textModel,
        contents: buildSearchPrompt(topic, question),
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
    } catch (err) {
      throw this.fail("searchFacts", err);
    }
    return extractSearchFactsResult(response);
  }

  async searchWikipediaFacts(topic: TopicContext, question: string): Promise<SearchFactsResult> {
    let article: Awaited<ReturnType<typeof fetchWikipediaArticle>>;
    try {
      article = await fetchWikipediaArticle(topic);
    } catch (err) {
      throw this.fail("searchWikipediaFacts:fetch", err);
    }
    if (!article) {
      throw new Error("upstream");
    }

    const excerpt = buildWikipediaExcerpt(article.extract, question);
    let response: GenerateContentResponse;
    try {
      response = await this.client.models.generateContent({
        model: this.textModel,
        contents: buildWikipediaSummaryPrompt(topic, question, article.title, excerpt),
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
    } catch (err) {
      throw this.fail("searchWikipediaFacts:summarize", err);
    }

    const text = (response.text ?? "").trim();
    if (!text) {
      throw new Error("upstream");
    }

    return {
      text,
      sources: [{ title: `${article.title} - Wikipedia`, uri: article.url }],
      queries: [article.searchQuery],
    };
  }

  async transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
    let response: GenerateContentResponse;
    try {
      response = await this.client.models.generateContent({
        model: this.textModel,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType.split(";")[0]?.trim() || "audio/webm",
                  data: audioBase64,
                },
              },
              {
                text: "この日本語の音声をそのまま文字起こししてください。文字起こししたテキストだけを出力し、余計な説明や前置きは付けないでください。音声が聞き取れない場合は空文字を返してください。",
              },
            ],
          },
        ],
        config: {
          maxOutputTokens: 256,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
    } catch (err) {
      throw this.fail("transcribeAudio", err);
    }
    return (response.text ?? "").trim();
  }

  async probe(kind: ProbeKind): Promise<void> {
    switch (kind) {
      case "decisions": {
        const request = buildProbeDecisionRequest(this.decisionsModel);
        try {
          await this.client.decisions.create(request);
        } catch (err) {
          throw this.fail("probe:decisions", err);
        }
        return;
      }
      case "text": {
        try {
          await this.client.models.generateContent({
            model: this.textModel,
            contents: "OKとだけ返してください。",
            config: {
              maxOutputTokens: 16,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          });
        } catch (err) {
          throw this.fail("probe:text", err);
        }
        return;
      }
      case "search": {
        try {
          await this.client.models.generateContent({
            model: this.textModel,
            contents: "今日の日付は？",
            config: {
              tools: [{ googleSearch: {} }],
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          });
        } catch (err) {
          throw this.fail("probe:search", err);
        }
        return;
      }
    }
  }
}
