import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION_PREFIX = "enc:v1";

function decodeKeyHex(keyHex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("Encryption key must be a 64-character hex string.");
  }
  return Buffer.from(keyHex, "hex");
}

function getKeyFromEnv() {
  const { getServerEnv } = require("@/lib/env") as typeof import("@/lib/env");
  return decodeKeyHex(getServerEnv().ENCRYPTION_KEY);
}

function splitPayload(payload: string) {
  const parts = payload.split(":");
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== VERSION_PREFIX) {
    throw new Error("Invalid encrypted payload format.");
  }
  return {
    iv: parts[2],
    authTag: parts[3],
    ciphertext: parts[4],
  };
}

export function isEncryptedValue(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(`${VERSION_PREFIX}:`);
}

export function encryptString(
  plaintext: string,
  keyHex?: string,
  aad?: string,
): string {
  const key = keyHex ? decodeKeyHex(keyHex) : getKeyFromEnv();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  if (aad) {
    cipher.setAAD(Buffer.from(aad, "utf8"));
  }

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptString(
  payload: string,
  keyHex?: string,
  aad?: string,
): string {
  const key = keyHex ? decodeKeyHex(keyHex) : getKeyFromEnv();
  const { iv, authTag, ciphertext } = splitPayload(payload);

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64url"),
  );

  if (aad) {
    decipher.setAAD(Buffer.from(aad, "utf8"));
  }

  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function encryptJson<T>(value: T, keyHex?: string, aad?: string): string {
  return encryptString(JSON.stringify(value), keyHex, aad);
}

export function decryptJson<T>(payload: string, keyHex?: string, aad?: string): T {
  return JSON.parse(decryptString(payload, keyHex, aad)) as T;
}
