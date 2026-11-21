/**
 * token と referenceBlob の暗号化・復号(サーバー専用)。
 * WebCrypto のみ使用(Cloudflare Workers と bun の両方で動作する)。
 *
 * 形式: v1.<base64url(iv)>.<base64url(ciphertext)>
 * 方式: AES-GCM 256bit (鍵は TOKEN_SECRET から HKDF-SHA256 で導出)
 */

const TOKEN_VERSION = "v1";
const IV_BYTE_LENGTH = 12;
const GCM_TAG_BYTE_LENGTH = 16;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const HKDF_SALT = encoder.encode("akinator-decisions:v1:salt");
const HKDF_INFO = encoder.encode("akinator-decisions:v1:aes-gcm-256");
const AAD = encoder.encode(TOKEN_VERSION);

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

let cachedKeyEntry: { secret: string; key: CryptoKey } | null = null;

function toBase64Url(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  if (!encoded || !BASE64URL_RE.test(encoded)) {
    throw new Error("bad_token");
  }
  const padded = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("bad_token");
  }
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  if (cachedKeyEntry && cachedKeyEntry.secret === secret) {
    return cachedKeyEntry.key;
  }
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, [
    "deriveKey",
  ]);
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: HKDF_SALT,
      info: HKDF_INFO,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  cachedKeyEntry = { secret, key };
  return key;
}

/**
 * JSON シリアライズ可能な値を AES-GCM 256bit で暗号化し、
 * `v1.<base64url(iv)>.<base64url(ciphertext)>` 形式の文字列にして返す。
 */
export async function sealJson(payload: unknown, secret: string): Promise<string> {
  const key = await deriveAesKey(secret);
  const iv = new Uint8Array(new ArrayBuffer(IV_BYTE_LENGTH));
  crypto.getRandomValues(iv);
  const plaintext = encoder.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: AAD },
    key,
    plaintext,
  );
  return `${TOKEN_VERSION}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

/**
 * `sealJson` で暗号化した文字列を復号して JSON パースする。
 * 形式不正・改ざん・別鍵などで復号できない場合は Error("bad_token") を投げる。
 */
export async function openJson<T = unknown>(token: string, secret: string): Promise<T> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    throw new Error("bad_token");
  }
  const iv = fromBase64Url(parts[1]);
  const ciphertext = fromBase64Url(parts[2]);
  if (iv.byteLength !== IV_BYTE_LENGTH) {
    throw new Error("bad_token");
  }
  if (ciphertext.byteLength < GCM_TAG_BYTE_LENGTH) {
    throw new Error("bad_token");
  }
  try {
    const key = await deriveAesKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: AAD },
      key,
      ciphertext,
    );
    const text = decoder.decode(decrypted);
    return JSON.parse(text) as T;
  } catch {
    throw new Error("bad_token");
  }
}
