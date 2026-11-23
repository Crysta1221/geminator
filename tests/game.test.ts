import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { buildShareText, extractGenreFromNote } from "#/lib/share";
import { type AI, setAIFactoryForTest } from "#/server/ai.server";
import { parsePrimaryDomain } from "#/server/config.server";
import {
  handleAsk,
  handleChat,
  handleConfig,
  handleGenerateTopic,
  handleGuess,
  handleInspectChat,
  handleRegister,
  handleReveal,
  handleTranscribe,
} from "#/server/game.server";

const ORIGINAL_ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  DOMAINS: process.env.DOMAINS,
};

function restoreEnv() {
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.DOMAINS;
  setAIFactoryForTest(null);
});

afterEach(() => {
  setAIFactoryForTest(null);
  restoreEnv();
});

function createStubAI(overrides: Partial<AI> = {}): AI {
  return {
    async makeDossier(answer, _notes) {
      return {
        name: answer,
        aliases: ["別名テスト", "Pikachu"],
        summary: `${answer}の説明です。`,
        confident: true,
      };
    },
    async generateTopicFromGenre(genre) {
      return {
        name: "織田信長",
        aliases: ["おだのぶなが", "第六天魔王"],
        summary: `${genre}に関する戦国時代の武将。`,
        confident: true,
      };
    },
    async judgeQuestion() {
      return {
        askableNoul: 0.95,
        answerChoice: "yes",
        answerConfidence: 0.85,
        answerProbabilities: {
          yes: 0.85,
          partially_yes: 0.05,
          partially_no: 0.04,
          no: 0.03,
          unknown: 0.03,
        },
      };
    },
    async judgeGuess() {
      return {
        choice: "different",
        confidence: 0.85,
        probabilities: { same: 0.05, close: 0.1, different: 0.85 },
      };
    },
    async judgeChat() {
      return {
        intentChoice: "question",
        intentProbabilities: { question: 0.9, guess: 0.1 },
        askableNoul: 0.95,
        answerChoice: "yes",
        answerConfidence: 0.85,
        answerProbabilities: {
          yes: 0.85,
          partially_yes: 0.05,
          partially_no: 0.04,
          no: 0.03,
          unknown: 0.03,
        },
        guessChoice: "different",
        guessConfidence: 0.85,
        guessProbabilities: { same: 0.05, close: 0.1, different: 0.85 },
      };
    },
    async searchFacts(_topic, question) {
      return {
        text: `検索結果: ${question}`,
        sources: [{ title: "出典1", uri: "https://example.com/source1" }],
        searchSuggestionsHtml: "<div>Suggestions</div>",
        queries: ["検索クエリ1"],
      };
    },
    async searchWikipediaFacts(_topic, question) {
      return {
        text: `Wikipedia結果: ${question}`,
        sources: [
          { title: "ピカチュウ - Wikipedia", uri: "https://ja.wikipedia.org/wiki/ピカチュウ" },
        ],
        queries: ["ピカチュウ"],
      };
    },
    async transcribeAudio() {
      return "生き物ですか？";
    },
    async probe() {},
    ...overrides,
  };
}

describe("config & API キーの扱い", () => {
  test("handleConfig は serverHasKey を返す", () => {
    expect(handleConfig()).toEqual({ serverHasKey: false });

    process.env.GEMINI_API_KEY = "dummy-server-key";
    expect(handleConfig()).toEqual({ serverHasKey: true });

    process.env.DOMAINS = "https://geminator.crystaworld.dev/, https://sub.example.com";
    expect(handleConfig()).toEqual({
      serverHasKey: true,
      siteUrl: "https://geminator.crystaworld.dev",
    });
  });

  test("parsePrimaryDomain はプロトコル補完・末尾スラッシュ除去・カンマ区切りを処理する", () => {
    expect(parsePrimaryDomain(undefined)).toBeUndefined();
    expect(parsePrimaryDomain("   ")).toBeUndefined();
    expect(parsePrimaryDomain("geminator.crystaworld.dev/")).toBe(
      "https://geminator.crystaworld.dev",
    );
    expect(parsePrimaryDomain("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(parsePrimaryDomain(" , https://a.example.com/ , https://b.example.com")).toBe(
      "https://a.example.com",
    );
  });

  test("API キーがリクエストにも環境変数にもないとき missing_api_key", async () => {
    await expect(handleRegister({ answer: "富士山", notes: "", useSearch: false })).rejects.toThrow(
      "missing_api_key",
    );
  });
});

describe("handleAsk の検索フロー", () => {
  test("unknown で useSearch=true のとき検索→再判定し、referenceBlob を返す", async () => {
    let judgeCalls = 0;
    let searchCalls = 0;
    const receivedSearchContexts: (string | undefined)[] = [];

    setAIFactoryForTest(() =>
      createStubAI({
        async judgeQuestion(_topic, _question, searchContext) {
          judgeCalls++;
          receivedSearchContexts.push(searchContext);
          if (judgeCalls === 1) {
            return {
              askableNoul: 0.9,
              answerChoice: "unknown",
              answerConfidence: 0.7,
              answerProbabilities: {
                yes: 0.1,
                partially_yes: 0.05,
                partially_no: 0.05,
                no: 0.1,
                unknown: 0.7,
              },
            };
          }
          return {
            askableNoul: 0.95,
            answerChoice: "yes",
            answerConfidence: 0.88,
            answerProbabilities: {
              yes: 0.88,
              partially_yes: 0.04,
              partially_no: 0.03,
              no: 0.03,
              unknown: 0.02,
            },
          };
        },
        async searchFacts(_topic, question) {
          searchCalls++;
          return {
            text: "2024年に受賞した事実がある。",
            sources: [{ title: "公式", uri: "https://example.com/official" }],
            searchSuggestionsHtml: "<p>Google Search</p>",
            queries: [`テスト ${question}`],
          };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: true,
    });
    const ask = await handleAsk({
      token: reg.token,
      question: "2024年に賞を取りましたか？",
    });

    expect(judgeCalls).toBe(2);
    expect(searchCalls).toBe(1);
    expect(receivedSearchContexts).toEqual([undefined, "2024年に受賞した事実がある。"]);
    expect(ask.verdict).toBe("yes");
    expect(ask.searched).toBe(true);
    expect(ask.referenceBlob).toBeDefined();

    const reveal = await handleReveal({
      token: reg.token,
      referenceBlobs: ask.referenceBlob ? [ask.referenceBlob] : [],
    });
    expect(reveal.references).toEqual([
      {
        question: "2024年に賞を取りましたか？",
        text: "2024年に受賞した事実がある。",
        sources: [{ title: "公式", uri: "https://example.com/official" }],
        searchSuggestionsHtml: "<p>Google Search</p>",
        queries: ["テスト 2024年に賞を取りましたか？"],
      },
    ]);
  });

  test("useSearch=true でも、確信が低い「部分的に」は検索せずそのまま返す", async () => {
    let searchCalls = 0;
    let judgeCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeQuestion() {
          judgeCalls++;
          return {
            askableNoul: 0.97,
            answerChoice: "partially_yes",
            answerConfidence: 0.28,
            answerProbabilities: {
              yes: 0.2,
              partially_yes: 0.28,
              partially_no: 0.24,
              no: 0.17,
              unknown: 0.11,
            },
          };
        },
        async searchFacts() {
          searchCalls++;
          return { text: "unused", sources: [], queries: [] };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "孫悟空",
      notes: "",
      useSearch: true,
    });
    const ask = await handleAsk({
      token: reg.token,
      question: "日本に関係がありますか？",
    });

    expect(judgeCalls).toBe(1);
    expect(searchCalls).toBe(0);
    expect(ask.verdict).toBe("partially_yes");
    expect(ask.searched).toBe(false);
  });

  test("useSearch=false でも、確信が低い答えは Decisions の判定をそのまま返す", async () => {
    let searchCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeQuestion() {
          return {
            askableNoul: 0.97,
            answerChoice: "partially_no",
            answerConfidence: 0.3,
            answerProbabilities: {
              yes: 0.2,
              partially_yes: 0.2,
              partially_no: 0.3,
              no: 0.2,
              unknown: 0.1,
            },
          };
        },
        async searchFacts() {
          searchCalls++;
          return { text: "unused", sources: [], queries: [] };
        },
      }),
    );
    const reg = await handleRegister({
      answer: "孫悟空",
      notes: "",
      useSearch: false,
    });
    const ask = await handleAsk({
      token: reg.token,
      question: "日本に関係がありますか？",
    });
    expect(searchCalls).toBe(0);
    expect(ask.verdict).toBe("partially_no");
    expect(ask.searched).toBe(false);
  });

  test("useSearch=false のときは Google 検索せず Wikipedia で補って再判定する", async () => {
    let googleSearchCalls = 0;
    let wikipediaSearchCalls = 0;
    let judgeCalls = 0;
    const receivedContexts: (string | undefined)[] = [];

    setAIFactoryForTest(() =>
      createStubAI({
        async judgeQuestion(_topic, _question, searchContext) {
          judgeCalls++;
          receivedContexts.push(searchContext);
          if (judgeCalls === 1) {
            return {
              askableNoul: 0.9,
              answerChoice: "unknown",
              answerConfidence: 0.4,
              answerProbabilities: {
                yes: 0.2,
                partially_yes: 0.2,
                partially_no: 0.1,
                no: 0.1,
                unknown: 0.4,
              },
            };
          }
          return {
            askableNoul: 0.94,
            answerChoice: "no",
            answerConfidence: 0.9,
            answerProbabilities: {
              yes: 0.03,
              partially_yes: 0.02,
              partially_no: 0.02,
              no: 0.9,
              unknown: 0.03,
            },
          };
        },
        async searchFacts() {
          googleSearchCalls++;
          return { text: "unused", sources: [], queries: [] };
        },
        async searchWikipediaFacts() {
          wikipediaSearchCalls++;
          return {
            text: "ピカチュウの身長は0.4mである。",
            sources: [
              { title: "ピカチュウ - Wikipedia", uri: "https://ja.wikipedia.org/wiki/ピカチュウ" },
            ],
            queries: ["ピカチュウ"],
          };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: false,
    });
    const ask = await handleAsk({
      token: reg.token,
      question: "身長は1m以上ですか？",
    });

    expect(googleSearchCalls).toBe(0);
    expect(wikipediaSearchCalls).toBe(1);
    expect(judgeCalls).toBe(2);
    expect(receivedContexts).toEqual([undefined, "ピカチュウの身長は0.4mである。"]);
    expect(ask.verdict).toBe("no");
    expect(ask.searched).toBe(true);
    expect(ask.referenceBlob).toBeDefined();

    const reveal = await handleReveal({
      token: reg.token,
      referenceBlobs: ask.referenceBlob ? [ask.referenceBlob] : [],
    });
    expect(reveal.references).toEqual([
      {
        question: "身長は1m以上ですか？",
        text: "ピカチュウの身長は0.4mである。",
        sources: [
          { title: "ピカチュウ - Wikipedia", uri: "https://ja.wikipedia.org/wiki/ピカチュウ" },
        ],
        queries: ["ピカチュウ"],
      },
    ]);
  });

  test("useSearch=false で Wikipedia 検索が失敗しても質問は失敗せず、検索なしの unknown を返す", async () => {
    let judgeCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeQuestion() {
          judgeCalls++;
          return {
            askableNoul: 0.9,
            answerChoice: "unknown",
            answerConfidence: 0.8,
            answerProbabilities: {
              yes: 0.05,
              partially_yes: 0.05,
              partially_no: 0.05,
              no: 0.05,
              unknown: 0.8,
            },
          };
        },
        async searchWikipediaFacts() {
          throw new Error("upstream");
        },
      }),
    );

    const reg = await handleRegister({
      answer: "架空のマイナーキャラ",
      notes: "",
      useSearch: false,
    });
    const ask = await handleAsk({
      token: reg.token,
      question: "好きな食べ物はカレーですか？",
    });

    expect(judgeCalls).toBe(1);
    expect(ask.verdict).toBe("unknown");
    expect(ask.searched).toBe(false);
    expect(ask.referenceBlob).toBeUndefined();
  });

  test("再判定でも unknown になった場合、検索は1質問につき1回で止まる", async () => {
    let searchCalls = 0;
    let judgeCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeQuestion() {
          judgeCalls++;
          return {
            askableNoul: 0.9,
            answerChoice: "unknown",
            answerConfidence: 0.8,
            answerProbabilities: {
              yes: 0.05,
              partially_yes: 0.05,
              partially_no: 0.05,
              no: 0.05,
              unknown: 0.8,
            },
          };
        },
        async searchFacts() {
          searchCalls++;
          return { text: "関連情報なし", sources: [], queries: ["q"] };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: true,
    });
    const ask = await handleAsk({
      token: reg.token,
      question: "好きな食べ物はカレーですか？",
    });

    expect(searchCalls).toBe(1);
    expect(judgeCalls).toBe(2);
    expect(ask.verdict).toBe("unknown");
    expect(ask.searched).toBe(true);
    expect(ask.referenceBlob).toBeDefined();
  });

  test("検索が失敗しても質問は失敗せず、検索なしの unknown を返す", async () => {
    let judgeCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeQuestion() {
          judgeCalls++;
          return {
            askableNoul: 0.9,
            answerChoice: "unknown",
            answerConfidence: 0.8,
            answerProbabilities: {
              yes: 0.05,
              partially_yes: 0.05,
              partially_no: 0.05,
              no: 0.05,
              unknown: 0.8,
            },
          };
        },
        async searchFacts() {
          throw new Error("invalid_api_key");
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: true,
    });
    const ask = await handleAsk({
      token: reg.token,
      question: "好きな食べ物はカレーですか？",
    });

    expect(judgeCalls).toBe(1);
    expect(ask.verdict).toBe("unknown");
    expect(ask.searched).toBe(false);
    expect(ask.referenceBlob).toBeUndefined();
  });
});

describe("handleGuess の判定と Decisions 省略", () => {
  test("答えや別名と一致したときは Decisions を呼ばずに correct を返す", async () => {
    let judgeGuessCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeGuess() {
          judgeGuessCalls++;
          return {
            choice: "different",
            confidence: 0.9,
            probabilities: { same: 0.05, close: 0.05, different: 0.9 },
          };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: false,
    });

    expect(await handleGuess({ token: reg.token, guess: "ぴかちゅう！" })).toEqual({
      verdict: "correct",
    });
    expect(await handleGuess({ token: reg.token, guess: "ＰＩＫＡＣＨＵ" })).toEqual({
      verdict: "correct",
    });
    expect(judgeGuessCalls).toBe(0);
  });

  test("文字列不一致のときは Decisions で correct / close / wrong を判定する", async () => {
    let mode: "correct" | "close" | "wrong" = "correct";
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeGuess() {
          if (mode === "correct") {
            return {
              choice: "same",
              confidence: 0.82,
              probabilities: { same: 0.82, close: 0.12, different: 0.06 },
            };
          }
          if (mode === "close") {
            return {
              choice: "close",
              confidence: 0.7,
              probabilities: { same: 0.15, close: 0.7, different: 0.15 },
            };
          }
          return {
            choice: "different",
            confidence: 0.9,
            probabilities: { same: 0.02, close: 0.08, different: 0.9 },
          };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: false,
    });

    mode = "correct";
    expect(await handleGuess({ token: reg.token, guess: "サトシの相棒の電気ネズミ" })).toEqual({
      verdict: "correct",
    });

    mode = "close";
    expect(await handleGuess({ token: reg.token, guess: "ライチュウ" })).toEqual({
      verdict: "close",
    });

    mode = "wrong";
    expect(await handleGuess({ token: reg.token, guess: "織田信長" })).toEqual({
      verdict: "wrong",
    });
  });
});

describe("handleReveal の安全性", () => {
  test("壊れた referenceBlob や形式違いの blob、token の流用は捨てて正常なものだけ返す", async () => {
    setAIFactoryForTest(() => createStubAI());
    const reg = await handleRegister({
      answer: "富士山",
      notes: "日本の山",
      useSearch: true,
    });

    const validRef = {
      question: "標高は？",
      text: "3776m です。",
      sources: [{ title: "国土地理院", uri: "https://example.com/gsi" }],
      queries: ["富士山 標高"],
    };
    const validBlob = JSON.stringify(validRef);

    const reveal = await handleReveal({
      token: reg.token,
      referenceBlobs: [
        "corrupted-blob",
        validBlob,
        JSON.stringify({ question: "q" }), // Missing required fields
        reg.token, // Passing a topic token as a referenceBlob is also rejected
      ],
    });

    expect(reveal.answer).toBe("富士山");
    expect(reveal.notes).toBe("日本の山");
    expect(reveal.identified.name).toBe("富士山");
    expect(reveal.references).toEqual([validRef]);
  });

  test("referenceBlob を token として渡すと bad_token になる", async () => {
    const refBlob = JSON.stringify({ question: "q", text: "t", sources: [], queries: [] });
    await expect(handleReveal({ token: refBlob, referenceBlobs: [] })).rejects.toThrow("bad_token");
  });

  test("JSON として読めない token は bad_token になる", async () => {
    await expect(handleReveal({ token: "not-a-json-token", referenceBlobs: [] })).rejects.toThrow(
      "bad_token",
    );
  });
});

describe("handleTranscribe の音声文字起こし", () => {
  test("音声データと API キーを受け取って文字起こし結果を返す", async () => {
    let receivedKey: string | undefined;
    const receivedAudio: { base64: string; mimeType: string }[] = [];

    setAIFactoryForTest((apiKey) => {
      receivedKey = apiKey;
      return createStubAI({
        async transcribeAudio(audioBase64, mimeType) {
          receivedAudio.push({ base64: audioBase64, mimeType });
          return "これは動物ですか？";
        },
      });
    });

    const res = await handleTranscribe({
      audioBase64: "AQID",
      mimeType: "audio/webm;codecs=opus",
      apiKey: "dummy-key",
    });

    expect(receivedKey).toBe("dummy-key");
    expect(receivedAudio).toEqual([{ base64: "AQID", mimeType: "audio/webm;codecs=opus" }]);
    expect(res).toEqual({ text: "これは動物ですか？" });
  });
});

describe("handleChat の統合チャット判定", () => {
  test("「〇〇ですね」「〇〇ですか？」が正解と一致するとき Decisions を呼ばず guess/correct を返す", async () => {
    let judgeChatCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeChat() {
          judgeChatCalls++;
          throw new Error("should_not_be_called");
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: false,
    });

    expect(await handleChat({ token: reg.token, message: "ピカチュウですね" })).toEqual({
      kind: "guess",
      verdict: "correct",
    });
    expect(await handleChat({ token: reg.token, message: "それはピカチュウですか？" })).toEqual({
      kind: "guess",
      verdict: "correct",
    });
    expect(judgeChatCalls).toBe(0);
  });

  test("AI が guess と判定したときは close / wrong / correct を返す", async () => {
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeChat(_topic, message) {
          const isClose = message.includes("ライチュウ");
          return {
            intentChoice: "guess",
            intentProbabilities: { question: 0.1, guess: 0.9 },
            askableNoul: 0.2,
            answerChoice: "unknown",
            answerConfidence: 0.5,
            answerProbabilities: {
              yes: 0.1,
              partially_yes: 0.1,
              partially_no: 0.1,
              no: 0.2,
              unknown: 0.5,
            },
            guessChoice: isClose ? "close" : "different",
            guessConfidence: 0.8,
            guessProbabilities: isClose
              ? { same: 0.1, close: 0.8, different: 0.1 }
              : { same: 0.05, close: 0.15, different: 0.8 },
          };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: false,
    });

    expect(await handleChat({ token: reg.token, message: "ライチュウですか？" })).toEqual({
      kind: "guess",
      verdict: "close",
    });
    expect(await handleChat({ token: reg.token, message: "織田信長ですね" })).toEqual({
      kind: "guess",
      verdict: "wrong",
    });
  });

  test("AI が question かつ unknown と判定し useSearch=true のとき検索して再判定する", async () => {
    let searchCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeChat() {
          return {
            intentChoice: "question",
            intentProbabilities: { question: 0.95, guess: 0.05 },
            askableNoul: 0.92,
            answerChoice: "unknown",
            answerConfidence: 0.75,
            answerProbabilities: {
              yes: 0.1,
              partially_yes: 0.05,
              partially_no: 0.05,
              no: 0.05,
              unknown: 0.75,
            },
            guessChoice: "different",
            guessConfidence: 0.9,
            guessProbabilities: { same: 0.02, close: 0.08, different: 0.9 },
          };
        },
        async searchFacts() {
          searchCalls++;
          return {
            text: "図鑑番号は25です。",
            sources: [{ title: "図鑑", uri: "https://example.com/dex" }],
            queries: ["ピカチュウ 図鑑番号"],
          };
        },
        async judgeQuestion(_topic, _q, searchContext) {
          expect(searchContext).toBe("図鑑番号は25です。");
          return {
            askableNoul: 0.96,
            answerChoice: "yes",
            answerConfidence: 0.92,
            answerProbabilities: {
              yes: 0.92,
              partially_yes: 0.03,
              partially_no: 0.02,
              no: 0.02,
              unknown: 0.01,
            },
          };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: true,
    });

    const res = await handleChat({ token: reg.token, message: "図鑑番号は25ですか？" });
    expect(searchCalls).toBe(1);
    expect(res.kind).toBe("ask");
    if (res.kind === "ask") {
      expect(res.verdict).toBe("yes");
      expect(res.searched).toBe(true);
      expect(res.referenceBlob).toBeDefined();
    }
  });
});

describe("handleGenerateTopic のジャンル自動出題", () => {
  test("ジャンルからお題を生成し、token だけを返す（平文の答えは返さず reveal で復元できる）", async () => {
    let receivedGenre = "";
    let receivedExcludes: readonly string[] | undefined;
    setAIFactoryForTest(() =>
      createStubAI({
        async generateTopicFromGenre(genre, excludeNames) {
          receivedGenre = genre;
          receivedExcludes = excludeNames;
          return {
            name: "千と千尋の神隠し",
            aliases: ["千と千尋", "Spirited Away"],
            summary: "2001年公開のスタジオジブリの長編アニメーション映画。",
            confident: true,
          };
        },
      }),
    );

    const res = await handleGenerateTopic({
      genre: "ジブリ映画",
      useSearch: true,
      excludeNames: ["となりのトトロ"],
    });

    expect(receivedGenre).toBe("ジブリ映画");
    expect(receivedExcludes).toEqual(["となりのトトロ"]);
    expect(Object.keys(res)).toEqual(["token"]);
    expect(res.token.length).toBeGreaterThan(10);

    const chatMatch = await handleChat({
      token: res.token,
      message: "千と千尋の神隠しですね",
    });
    expect(chatMatch).toEqual({ kind: "guess", verdict: "correct" });

    const reveal = await handleReveal({
      token: res.token,
      referenceBlobs: [],
    });
    expect(reveal.answer).toBe("千と千尋の神隠し");
    expect(reveal.notes).toBe("ジャンル: ジブリ映画");
    expect(reveal.identified.name).toBe("千と千尋の神隠し");
  });

  test("API キーが未設定なら missing_api_key を投げる", async () => {
    await expect(
      handleGenerateTopic({ genre: "動物", useSearch: false, excludeNames: [] }),
    ).rejects.toThrow("missing_api_key");
  });
});

describe("handleInspectChat の仕組み可視化トレース", () => {
  test("文字列一致ショートカット時は Decisions を呼ばずに stringMatch.matched=true を返す", async () => {
    let judgeChatCalls = 0;
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeChat() {
          judgeChatCalls++;
          throw new Error("should_not_be_called");
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: false,
    });

    const res = await handleInspectChat({ token: reg.token, message: "ピカチュウですね" });
    expect(judgeChatCalls).toBe(0);
    expect(res.final).toEqual({ kind: "guess", verdict: "correct" });
    expect(res.stringMatch.matched).toBe(true);
    expect(res.stringMatch.extractedCandidate).toBe("ピカチュウ");
    expect(res.decisions).toBeUndefined();
    expect(res.searchStep).toBeUndefined();
  });

  test("通常質問では4分類器の全スコアと topicInput を返す", async () => {
    setAIFactoryForTest(() => createStubAI());

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "電気タイプ",
      useSearch: false,
    });

    const res = await handleInspectChat({ token: reg.token, message: "生き物ですか？" });
    expect(res.stringMatch.matched).toBe(false);
    expect(res.final.kind).toBe("ask");
    expect(res.decisions).toBeDefined();
    expect(res.decisions?.topicInput).toContain("正式名称: ピカチュウ");
    expect(res.decisions?.snapshot.intent.choice).toBe("question");
    expect(res.decisions?.snapshot.askable.passed).toBe(true);
    expect(res.decisions?.snapshot.answer.choice).toBe("yes");
    expect(res.decisions?.snapshot.guess.choice).toBe("different");
    expect(res.searchStep).toBeUndefined();
  });

  test("unknown 判定時に Wikipedia 検索と再判定ステップのトレースを返す", async () => {
    setAIFactoryForTest(() =>
      createStubAI({
        async judgeChat() {
          return {
            intentChoice: "question",
            intentProbabilities: { question: 0.94, guess: 0.06 },
            askableNoul: 0.91,
            answerChoice: "unknown",
            answerConfidence: 0.72,
            answerProbabilities: {
              yes: 0.1,
              partially_yes: 0.08,
              partially_no: 0.05,
              no: 0.05,
              unknown: 0.72,
            },
            guessChoice: "different",
            guessConfidence: 0.9,
            guessProbabilities: { same: 0.02, close: 0.08, different: 0.9 },
          };
        },
        async searchWikipediaFacts() {
          return {
            text: "ピカチュウの身長は0.4mである。",
            sources: [
              { title: "ピカチュウ - Wikipedia", uri: "https://ja.wikipedia.org/wiki/ピカチュウ" },
            ],
            queries: ["ピカチュウ"],
          };
        },
        async judgeQuestion() {
          return {
            askableNoul: 0.95,
            answerChoice: "no",
            answerConfidence: 0.91,
            answerProbabilities: {
              yes: 0.02,
              partially_yes: 0.02,
              partially_no: 0.03,
              no: 0.91,
              unknown: 0.02,
            },
          };
        },
      }),
    );

    const reg = await handleRegister({
      answer: "ピカチュウ",
      notes: "",
      useSearch: false,
    });

    const res = await handleInspectChat({ token: reg.token, message: "身長は1m以上ですか？" });
    expect(res.final.kind).toBe("ask");
    if (res.final.kind === "ask") {
      expect(res.final.verdict).toBe("no");
      expect(res.final.searched).toBe(true);
    }
    expect(res.decisions?.snapshot.answer.choice).toBe("unknown");
    expect(res.searchStep?.provider).toBe("wikipedia");
    expect(res.searchStep?.succeeded).toBe(true);
    expect(res.searchStep?.reference?.text).toBe("ピカチュウの身長は0.4mである。");
    expect(res.searchStep?.rejudged?.verdict).toBe("no");
  });
});

describe("シェア文面生成とジャンル抽出", () => {
  test("ジャンルノートからジャンル名を抽出する", () => {
    expect(extractGenreFromNote("ジャンル: 動物")).toBe("動物");
    expect(extractGenreFromNote("ジャンル：ジブリ映画")).toBe("ジブリ映画");
    expect(extractGenreFromNote("春に咲く花")).toBeUndefined();
  });

  test("正解時と不正解時のシェア文面を生成し、#じぇみねいたー と siteUrl を含める", () => {
    expect(
      buildShareText({
        outcome: "correct",
        questionCount: 5,
        questionLimit: null,
        genre: "動物",
        answerName: "カモノハシ",
        includeAnswer: false,
        siteUrl: "https://geminator.crystaworld.dev",
      }),
    ).toBe(
      "ジャンル「動物」のお題を 5問で正解しました！🎉\n#じぇみねいたー\nhttps://geminator.crystaworld.dev",
    );

    expect(
      buildShareText({
        outcome: "gave_up",
        questionCount: 13,
        questionLimit: null,
        genre: "動物",
        answerName: "カモノハシ",
        includeAnswer: false,
        siteUrl: "https://geminator.crystaworld.dev",
      }),
    ).toBe(
      "ジャンル「動物」のお題は 13問で不正解（ギブアップ）でした…！\n#じぇみねいたー\nhttps://geminator.crystaworld.dev",
    );

    expect(
      buildShareText({
        outcome: "correct",
        questionCount: 4,
        questionLimit: 10,
        genre: "動物",
        answerName: "カモノハシ",
        includeAnswer: true,
        siteUrl: "https://geminator.crystaworld.dev",
      }),
    ).toBe(
      "ジャンル「動物」のお題「カモノハシ」を 4/10問で正解しました！🎉\n#じぇみねいたー\nhttps://geminator.crystaworld.dev",
    );
  });
});
