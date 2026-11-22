/**
 * Entry point for Server Functions called from the client. Managed by the parent coordinator.
 * Keep this file limited to input validation and delegation; implement logic in `game.server.ts`.
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
