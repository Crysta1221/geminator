import { describe, expect, test } from "bun:test";

import { openJson, sealJson } from "#/server/crypto.server";

const SECRET_A = "test-secret-alpha-0123456789abcdef";
const SECRET_B = "test-secret-beta-fedcba9876543210";

describe("crypto.server", () => {
  test("sealJson と openJson の往復で元のオブジェクトを復元できる", async () => {
    const payload = {
      answer: "織田信長",
      notes: "戦国時代の武将",
      identified: {
        name: "織田信長",
        aliases: ["第六天魔王", "信長"],
        summary: "戦国時代から安土桃山時代にかけて活躍した武将。",
        confident: true,
      },
      useSearch: true,
    };

    const token = await sealJson(payload, SECRET_A);
    expect(token.startsWith("v1.")).toBe(true);
    expect(token.split(".")).toHaveLength(3);
    // 平文の答えがトークン文字列にそのまま含まれないこと
    expect(token).not.toContain("織田信長");

    const restored = await openJson<typeof payload>(token, SECRET_A);
    expect(restored).toEqual(payload);
  });

  test("同じペイロードでも毎回異なる IV で別のトークンになる", async () => {
    const payload = { hello: "world" };
    const t1 = await sealJson(payload, SECRET_A);
    const t2 = await sealJson(payload, SECRET_A);
    expect(t1).not.toBe(t2);
    expect(await openJson(t1, SECRET_A)).toEqual(payload);
    expect(await openJson(t2, SECRET_A)).toEqual(payload);
  });

  test("別鍵での復号は bad_token で失敗する", async () => {
    const token = await sealJson({ answer: "ピカチュウ" }, SECRET_A);
    await expect(openJson(token, SECRET_B)).rejects.toThrow("bad_token");
  });

  test("暗号文・IV・バージョンの改ざんは bad_token で失敗する", async () => {
    const token = await sealJson({ answer: "富士山" }, SECRET_A);
    const [ver, iv, cipher] = token.split(".");

    // 暗号文の1文字を改ざん
    const flippedChar = cipher[0] === "A" ? "B" : "A";
    const tamperedCipher = `${ver}.${iv}.${flippedChar}${cipher.slice(1)}`;
    await expect(openJson(tamperedCipher, SECRET_A)).rejects.toThrow("bad_token");

    // IV の1文字を改ざん
    const flippedIvChar = iv[0] === "A" ? "B" : "A";
    const tamperedIv = `${ver}.${flippedIvChar}${iv.slice(1)}.${cipher}`;
    await expect(openJson(tamperedIv, SECRET_A)).rejects.toThrow("bad_token");

    // バージョン改ざん
    const tamperedVer = `v2.${iv}.${cipher}`;
    await expect(openJson(tamperedVer, SECRET_A)).rejects.toThrow("bad_token");
  });

  test("形式不正な文字列は bad_token で失敗する", async () => {
    await expect(openJson("", SECRET_A)).rejects.toThrow("bad_token");
    await expect(openJson("not-a-token", SECRET_A)).rejects.toThrow("bad_token");
    await expect(openJson("v1.abc", SECRET_A)).rejects.toThrow("bad_token");
    await expect(openJson("v1.!!!.???", SECRET_A)).rejects.toThrow("bad_token");
    await expect(openJson("v1.AAAA.BBBB", SECRET_A)).rejects.toThrow("bad_token");
  });
});
