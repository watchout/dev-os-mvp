/**
 * 暗号化ユーティリティ
 * - AES-256-GCM アルゴリズム
 * - ENCRYPTION_SECRET 環境変数（64 hex = 32 bytes）必須
 */

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * 環境変数から暗号化キーを取得
 * @throws ENCRYPTION_SECRET が未設定または不正な場合
 */
function getSecretKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  if (secret.length !== 64) {
    throw new Error(
      `ENCRYPTION_SECRET must be 64 hex characters (32 bytes). Got ${secret.length} characters.`
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(secret)) {
    throw new Error("ENCRYPTION_SECRET must contain only hex characters (0-9, a-f, A-F)");
  }
  return Buffer.from(secret, "hex");
}

/**
 * 平文を暗号化
 * @param plainText 暗号化する平文
 * @returns 暗号化された文字列（フォーマット: iv:authTag:encryptedData、すべてhex）
 */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // フォーマット: iv:authTag:encryptedData (すべてhex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * 暗号文を復号化
 * @param encryptedText 暗号化された文字列（encrypt()の出力形式）
 * @returns 復号化された平文
 * @throws 復号化に失敗した場合
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format. Expected iv:authTag:data");
  }

  const [ivHex, authTagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const key = getSecretKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * APIキーからプレフィックス（先頭部分）を抽出
 * @param apiKey APIキー
 * @returns プレフィックス（例: "sk-...xxxx"）
 */
export function extractKeyPrefix(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "****" + apiKey.slice(-4);
  }
  // 先頭の識別子（sk-proj-, sk-, etc.）を保持 + 末尾4文字
  const prefixMatch = apiKey.match(/^([a-zA-Z]+-)?/);
  const prefix = prefixMatch?.[0] || "";
  const suffix = apiKey.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * マスク表示用の文字列を生成
 * @param keyPrefix extractKeyPrefix で生成したプレフィックス
 * @returns マスク表示文字列
 */
export function maskKeyDisplay(keyPrefix: string): string {
  return keyPrefix;
}

