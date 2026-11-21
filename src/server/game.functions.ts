/**
 * クライアントから呼ぶ Server Functions の入口。親(オーケストレーター)が管理する。
 * 中身の処理は game.server.ts に実装する。ここは入力検証と委譲だけにする。
 */
import { createServerFn } from "@tanstack/react-start";

import {
  askInput,
  chatInput,
  generateTopicInput,
  guessInput,
  registerInput,
  revealInput,
  testConnectionInput,
  transcribeInput,
} from "#/lib/contract";

import {
  handleAsk,
  handleChat,
  handleConfig,
  handleGenerateTopic,
  handleGuess,
  handleRegister,
  handleReveal,
  handleTestConnection,
  handleTranscribe,
} from "./game.server";

export const getConfig = createServerFn({ method: "GET" }).handler(() => handleConfig());

export const registerTopic = createServerFn({ method: "POST" })
  .validator(registerInput)
  .handler(({ data }) => handleRegister(data));

export const generateTopic = createServerFn({ method: "POST" })
  .validator(generateTopicInput)
  .handler(({ data }) => handleGenerateTopic(data));

export const askQuestion = createServerFn({ method: "POST" })
  .validator(askInput)
  .handler(({ data }) => handleAsk(data));

export const guessAnswer = createServerFn({ method: "POST" })
  .validator(guessInput)
  .handler(({ data }) => handleGuess(data));

export const sendChat = createServerFn({ method: "POST" })
  .validator(chatInput)
  .handler(({ data }) => handleChat(data));

export const revealAnswer = createServerFn({ method: "POST" })
  .validator(revealInput)
  .handler(({ data }) => handleReveal(data));

export const testConnection = createServerFn({ method: "POST" })
  .validator(testConnectionInput)
  .handler(({ data }) => handleTestConnection(data));

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator(transcribeInput)
  .handler(({ data }) => handleTranscribe(data));
