import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { type AI, type ProbeKind, setAIFactoryForTest } from "#/server/ai.server";
import { handleTestConnection } from "#/server/game.server";

const ORIGINAL_ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
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
  setAIFactoryForTest(null);
});

afterEach(() => {
  setAIFactoryForTest(null);
  restoreEnv();
});

function createProbeStubAI(probe: AI["probe"]): AI {
  return {
    async makeDossier() {
      throw new Error("not used");
    },
    async generateTopicFromGenre() {
      throw new Error("not used");
    },
    async judgeQuestion() {
      throw new Error("not used");
    },
    async judgeGuess() {
      throw new Error("not used");
    },
    async judgeChat() {
      throw new Error("not used");
    },
    async searchFacts() {
      throw new Error("not used");
    },
    async searchWikipediaFacts() {
      throw new Error("not used");
    },
    async transcribeAudio() {
      throw new Error("not used");
    },
    probe,
  };
}

describe("handleTestConnection", () => {
  test("3項目すべて成功する(checkSearch=true)と各項目が ok:true と整数の ms で返る", async () => {
    const called: ProbeKind[] = [];
    let receivedKey: string | undefined;

    setAIFactoryForTest((apiKey) => {
      receivedKey = apiKey;
      return createProbeStubAI(async (kind) => {
        called.push(kind);
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    });

    const res = await handleTestConnection({
      apiKey: "dummy-request-key",
      checkSearch: true,
    });

    expect(receivedKey).toBe("dummy-request-key");
    expect(called.sort()).toEqual(["decisions", "search", "text"]);

    expect(res.decisions.ok).toBe(true);
    expect(res.text.ok).toBe(true);
    expect(res.search?.ok).toBe(true);
    if (res.decisions.ok) {
      expect(Number.isInteger(res.decisions.ms)).toBe(true);
      expect(res.decisions.ms).toBeGreaterThanOrEqual(0);
    }
    if (res.text.ok) {
      expect(Number.isInteger(res.text.ms)).toBe(true);
      expect(res.text.ms).toBeGreaterThanOrEqual(0);
    }
    if (res.search?.ok) {
      expect(Number.isInteger(res.search.ms)).toBe(true);
      expect(res.search.ms).toBeGreaterThanOrEqual(0);
    }
  });

  test("decisions だけ失敗(invalid_api_key)しても全体は失敗せず他は返る", async () => {
    setAIFactoryForTest(() =>
      createProbeStubAI(async (kind) => {
        if (kind === "decisions") {
          throw new Error("invalid_api_key");
        }
      }),
    );

    const res = await handleTestConnection({ checkSearch: true });

    expect(res.decisions).toEqual({ ok: false, error: "invalid_api_key" });
    expect(res.text.ok).toBe(true);
    expect(res.search?.ok).toBe(true);
  });

  test("checkSearch=false のとき search は結果に含まれず probe('search') も呼ばれない", async () => {
    const called: ProbeKind[] = [];
    setAIFactoryForTest(() =>
      createProbeStubAI(async (kind) => {
        called.push(kind);
      }),
    );

    const res = await handleTestConnection({ checkSearch: false });

    expect(called.sort()).toEqual(["decisions", "text"]);
    expect("search" in res).toBe(false);
    expect(res.search).toBeUndefined();
    expect(res.decisions.ok).toBe(true);
    expect(res.text.ok).toBe(true);
  });

  test("checkSearch=true で search が失敗すると upstream が結果に入り、未知の例外も upstream に丸められる", async () => {
    setAIFactoryForTest(() =>
      createProbeStubAI(async (kind) => {
        if (kind === "search") {
          throw new Error("upstream");
        }
        if (kind === "text") {
          throw new Error("unexpected_internal_message");
        }
      }),
    );

    const res = await handleTestConnection({ checkSearch: true });

    expect(res.decisions.ok).toBe(true);
    expect(res.text).toEqual({ ok: false, error: "upstream" });
    expect(res.search).toEqual({ ok: false, error: "upstream" });
  });

  test("キーがリクエストにも環境変数にもないとき missing_api_key を投げる", async () => {
    await expect(handleTestConnection({ checkSearch: false })).rejects.toThrow("missing_api_key");
    await expect(handleTestConnection({ checkSearch: true })).rejects.toThrow("missing_api_key");
  });
});
