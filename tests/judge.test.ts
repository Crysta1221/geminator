import { describe, expect, test } from "bun:test";

import { THRESHOLDS } from "#/server/config.server";
import {
  ZERO_PROBABILITIES,
  evaluateAskDecision,
  evaluateChatDecision,
  evaluateGuessDecision,
  matchesAnswerOrAlias,
  matchesGuessCandidate,
  normalizeForMatch,
} from "#/server/judge.server";

describe("normalizeForMatch / matchesAnswerOrAlias", () => {
  test("全角半角・大文字小文字・ひらがなカタカナ・空白記号を正規化して一致させる", () => {
    expect(normalizeForMatch("Ｐｉｋａｃｈｕ！")).toBe("pikachu");
    expect(normalizeForMatch("ぴかちゅう")).toBe("ピカチュウ");
    expect(normalizeForMatch("ﾋﾟｶﾁｭｳ")).toBe("ピカチュウ");
    expect(normalizeForMatch("  おだ・のぶなが  ")).toBe("オダノブナガ");
    expect(normalizeForMatch("ドラえもん（猫型ロボット）")).toBe("ドラエモン猫型ロボット");
  });

  test("別名や表記ゆれに一致する", () => {
    const candidates = ["織田信長", "第六天魔王", "Oda Nobunaga", "のぶなが"];
    expect(matchesAnswerOrAlias("織田 信長", candidates)).toBe(true);
    expect(matchesAnswerOrAlias("ｏｄａ　ｎｏｂｕｎａｇａ", candidates)).toBe(true);
    expect(matchesAnswerOrAlias("ノブナガ！", candidates)).toBe(true);
    expect(matchesAnswerOrAlias("豊臣秀吉", candidates)).toBe(false);
  });

  test("記号だけの入力は一致しない", () => {
    expect(matchesAnswerOrAlias("？？？", ["？？", "ピカチュウ"])).toBe(false);
  });
});

describe("evaluateAskDecision", () => {
  test("askable がしきい値未満なら invalid で確率はすべて 0", () => {
    const result = evaluateAskDecision({
      askableNoul: THRESHOLDS.askableMin - 0.01,
      answerChoice: "yes",
      answerConfidence: 0.9,
      answerProbabilities: {
        yes: 0.9,
        partially_yes: 0.05,
        partially_no: 0.02,
        no: 0.02,
        unknown: 0.01,
      },
    });
    expect(result.verdict).toBe("invalid");
    expect(result.probabilities).toEqual(ZERO_PROBABILITIES);
  });

  test("確信が低くても、最大確率の選択肢をそのまま返す(切り捨てない)", () => {
    const probs = {
      yes: 0.2,
      partially_yes: 0.28,
      partially_no: 0.24,
      no: 0.17,
      unknown: 0.11,
    };
    const result = evaluateAskDecision({
      askableNoul: 0.97,
      answerChoice: "partially_yes",
      answerConfidence: 0.28,
      answerProbabilities: probs,
    });
    expect(result.verdict).toBe("partially_yes");
    expect(result.probabilities).toEqual(probs);
  });

  test("確信が低い「はい」「いいえ」もそのまま返す", () => {
    const result = evaluateAskDecision({
      askableNoul: 0.9,
      answerChoice: "no",
      answerConfidence: 0.3,
      answerProbabilities: {
        yes: 0.2,
        partially_yes: 0.2,
        partially_no: 0.2,
        no: 0.3,
        unknown: 0.1,
      },
    });
    expect(result.verdict).toBe("no");
  });

  test("unknown が最大のときは unknown(情報がない)", () => {
    const result = evaluateAskDecision({
      askableNoul: 0.97,
      answerChoice: "unknown",
      answerConfidence: 0.54,
      answerProbabilities: {
        yes: 0.03,
        partially_yes: 0.09,
        partially_no: 0.14,
        no: 0.2,
        unknown: 0.54,
      },
    });
    expect(result.verdict).toBe("unknown");
  });

  test("answerChoice と最大確率がずれていても最大確率の選択肢を採用する", () => {
    const result = evaluateAskDecision({
      askableNoul: 0.9,
      answerChoice: "yes",
      answerConfidence: 0.75,
      answerProbabilities: {
        yes: 0.05,
        partially_yes: 0.05,
        partially_no: 0.1,
        no: 0.75,
        unknown: 0.05,
      },
    });
    expect(result.verdict).toBe("no");
  });
});

describe("evaluateGuessDecision", () => {
  test("same が最大かつ confidence >= 0.6 なら correct", () => {
    expect(
      evaluateGuessDecision({
        choice: "same",
        confidence: THRESHOLDS.guessSameConfidenceMin,
        probabilities: { same: 0.6, close: 0.25, different: 0.15 },
      }),
    ).toBe("correct");
  });

  test("same が最大でも confidence < 0.6 なら wrong", () => {
    expect(
      evaluateGuessDecision({
        choice: "same",
        confidence: THRESHOLDS.guessSameConfidenceMin - 0.05,
        probabilities: { same: 0.55, close: 0.3, different: 0.15 },
      }),
    ).toBe("wrong");
  });

  test("close が最大かつ confidence >= 0.6 なら close、未満なら wrong", () => {
    expect(
      evaluateGuessDecision({
        choice: "close",
        confidence: THRESHOLDS.guessCloseConfidenceMin,
        probabilities: { same: 0.2, close: 0.6, different: 0.2 },
      }),
    ).toBe("close");
    expect(
      evaluateGuessDecision({
        choice: "close",
        confidence: THRESHOLDS.guessCloseConfidenceMin - 0.1,
        probabilities: { same: 0.2, close: 0.5, different: 0.3 },
      }),
    ).toBe("wrong");
  });

  test("different が最大なら wrong", () => {
    expect(
      evaluateGuessDecision({
        choice: "different",
        confidence: 0.8,
        probabilities: { same: 0.05, close: 0.15, different: 0.8 },
      }),
    ).toBe("wrong");
  });
});

describe("matchesGuessCandidate", () => {
  const candidates = ["ピカチュウ", "Pikachu", "でんきねずみ"];

  test("「〇〇ですね」「〇〇ですか？」「答えは〇〇」などの自然な言い回しに一致する", () => {
    expect(matchesGuessCandidate("ピカチュウですね", candidates)).toBe(true);
    expect(matchesGuessCandidate("ピカチュウですか？", candidates)).toBe(true);
    expect(matchesGuessCandidate("それはピカチュウですか", candidates)).toBe(true);
    expect(matchesGuessCandidate("答えはピカチュウです！", candidates)).toBe(true);
    expect(matchesGuessCandidate("もしかしてPikachuかな？", candidates)).toBe(true);
  });

  test("属性を尋ねる質問や別対象には誤って一致しない", () => {
    expect(matchesGuessCandidate("ピカチュウの仲間ですか？", candidates)).toBe(false);
    expect(matchesGuessCandidate("ピカチュウより大きいですか？", candidates)).toBe(false);
    expect(matchesGuessCandidate("ライチュウですね", candidates)).toBe(false);
  });
});

describe("evaluateChatDecision", () => {
  test("intent が question なら質問として評価する", () => {
    const res = evaluateChatDecision({
      intentChoice: "question",
      intentProbabilities: { question: 0.9, guess: 0.1 },
      askableNoul: 0.95,
      answerChoice: "yes",
      answerConfidence: 0.88,
      answerProbabilities: {
        yes: 0.88,
        partially_yes: 0.05,
        partially_no: 0.03,
        no: 0.02,
        unknown: 0.02,
      },
      guessChoice: "different",
      guessConfidence: 0.9,
      guessProbabilities: { same: 0.02, close: 0.08, different: 0.9 },
    });
    expect(res).toEqual({
      kind: "ask",
      verdict: "yes",
      probabilities: {
        yes: 0.88,
        partially_yes: 0.05,
        partially_no: 0.03,
        no: 0.02,
        unknown: 0.02,
      },
    });
  });

  test("intent が guess なら回答として評価する", () => {
    const res = evaluateChatDecision({
      intentChoice: "guess",
      intentProbabilities: { question: 0.12, guess: 0.88 },
      askableNoul: 0.2,
      answerChoice: "unknown",
      answerConfidence: 0.7,
      answerProbabilities: {
        yes: 0.1,
        partially_yes: 0.05,
        partially_no: 0.05,
        no: 0.1,
        unknown: 0.7,
      },
      guessChoice: "close",
      guessConfidence: 0.72,
      guessProbabilities: { same: 0.1, close: 0.72, different: 0.18 },
    });
    expect(res).toEqual({
      kind: "guess",
      verdict: "close",
    });
  });
});
