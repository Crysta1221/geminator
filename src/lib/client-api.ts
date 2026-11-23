import type {
  AskResult,
  ChatResult,
  ConfigResult,
  GenerateTopicResult,
  GuessResult,
  InspectChatResult,
  RegisterResult,
  RevealResult,
  TestConnectionResult,
  TranscribeResult,
} from "#/lib/contract";
import {
  askQuestion,
  generateTopic,
  getConfig,
  guessAnswer,
  inspectChat,
  registerTopic,
  revealAnswer,
  sendChat,
  testConnection,
  transcribeAudio,
} from "#/server/game.functions";

function normalizeApiKey(apiKey?: string): string | undefined {
  const trimmed = apiKey?.trim();
  return trimmed ? trimmed : undefined;
}

export function fetchConfig(): Promise<ConfigResult> {
  return getConfig();
}

export function runTestConnection(params: {
  apiKey?: string;
  checkSearch: boolean;
}): Promise<TestConnectionResult> {
  return testConnection({
    data: {
      apiKey: normalizeApiKey(params.apiKey),
      checkSearch: params.checkSearch,
    },
  });
}

export function submitTopic(params: {
  answer: string;
  notes: string;
  useSearch: boolean;
  apiKey?: string;
}): Promise<RegisterResult> {
  return registerTopic({
    data: {
      answer: params.answer.trim(),
      notes: params.notes.trim(),
      useSearch: params.useSearch,
      apiKey: normalizeApiKey(params.apiKey),
    },
  });
}

export function submitGenreTopic(params: {
  genre: string;
  useSearch: boolean;
  excludeNames?: string[];
  apiKey?: string;
}): Promise<GenerateTopicResult> {
  return generateTopic({
    data: {
      genre: params.genre.trim(),
      useSearch: params.useSearch,
      excludeNames: params.excludeNames ?? [],
      apiKey: normalizeApiKey(params.apiKey),
    },
  });
}

export function submitQuestion(params: {
  token: string;
  question: string;
  apiKey?: string;
}): Promise<AskResult> {
  return askQuestion({
    data: {
      token: params.token,
      question: params.question.trim(),
      apiKey: normalizeApiKey(params.apiKey),
    },
  });
}

export function submitGuess(params: {
  token: string;
  guess: string;
  apiKey?: string;
}): Promise<GuessResult> {
  return guessAnswer({
    data: {
      token: params.token,
      guess: params.guess.trim(),
      apiKey: normalizeApiKey(params.apiKey),
    },
  });
}

export function submitChat(params: {
  token: string;
  message: string;
  apiKey?: string;
}): Promise<ChatResult> {
  return sendChat({
    data: {
      token: params.token,
      message: params.message.trim(),
      apiKey: normalizeApiKey(params.apiKey),
    },
  });
}

export function submitInspectChat(params: {
  token: string;
  message: string;
  apiKey?: string;
}): Promise<InspectChatResult> {
  return inspectChat({
    data: {
      token: params.token,
      message: params.message.trim(),
      apiKey: normalizeApiKey(params.apiKey),
    },
  });
}

export function fetchReveal(params: {
  token: string;
  referenceBlobs: string[];
}): Promise<RevealResult> {
  return revealAnswer({
    data: {
      token: params.token,
      referenceBlobs: params.referenceBlobs,
    },
  });
}

export function submitAudioTranscription(params: {
  audioBase64: string;
  mimeType: string;
  apiKey?: string;
}): Promise<TranscribeResult> {
  return transcribeAudio({
    data: {
      audioBase64: params.audioBase64,
      mimeType: params.mimeType,
      apiKey: normalizeApiKey(params.apiKey),
    },
  });
}
