/**
 * クライアント側暗号化ユーティリティ
 * Web Crypto API を使用した AES-GCM-256 暗号化
 * 
 * ゼロ知識設計:
 * - 本文の暗号化はクライアント側で完結
 * - 復号キーはShamir分割後、clientShareを解錠コードで暗号化
 * - サーバーには暗号文とメタデータのみ送信
 */

// KDF設定
const KDF_ITERATIONS = 200000; // PBKDF2のイテレーション数
const KDF_ALGORITHM = "pbkdf2-sha256";

// 鍵を生成
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// 鍵をBase64文字列にエクスポート
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

// Base64文字列から鍵をインポート
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// 暗号化
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // IV生成 (12 bytes)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

// 復号
export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ciphertextData = base64ToArrayBuffer(ciphertext);
  const ivData = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivData,
    },
    key,
    ciphertextData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ヘルパー関数
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

// Base64URL形式のヘルパー関数
export function arrayBufferToBase64Url(buffer: ArrayBuffer | ArrayBufferLike): string {
  return arrayBufferToBase64(buffer as ArrayBuffer)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // base64urlをbase64に変換
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  return base64ToArrayBuffer(base64);
}

// 暗号化結果の型
export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  key: string; // Base64エンコードされた鍵
}

// 手紙を暗号化（鍵生成から暗号化まで一括）
export async function encryptLetter(content: string): Promise<EncryptionResult> {
  const key = await generateKey();
  const { ciphertext, iv } = await encrypt(content, key);
  const exportedKey = await exportKey(key);

  return {
    ciphertext,
    iv,
    key: exportedKey,
  };
}

// 手紙を復号
export async function decryptLetter(
  ciphertext: string,
  iv: string,
  keyBase64: string
): Promise<string> {
  const key = await importKey(keyBase64);
  return await decrypt(ciphertext, iv, key);
}

// ============================================
// 音声暗号化（ゼロ知識設計）
// ============================================

/**
 * masterKeyから音声用の暗号化キーを導出（HKDF）
 * 
 * - 本文暗号化とは別のキーを使用（用途分離）
 * - info = "audio-v1" で区別
 * 
 * @param masterKeyBase64 Base64エンコードされたmasterKey（Shamir分割前の復号キー）
 * @returns 音声暗号化用のCryptoKey
 */
export async function deriveAudioKey(masterKeyBase64: string): Promise<CryptoKey> {
  const masterKeyBytes = base64ToArrayBuffer(masterKeyBase64);

  // HKDFでキー導出
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    masterKeyBytes,
    "HKDF",
    false,
    ["deriveKey"]
  );

  // 固定salt（音声暗号化用）- セキュリティ上は問題ない（infoで区別）
  const salt = new Uint8Array(16); // all zeros
  const info = new TextEncoder().encode("audio-v1");

  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: info,
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // not extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * 音声暗号化結果
 */
export interface AudioEncryptionResult {
  ciphertext: ArrayBuffer;  // 暗号化された音声データ
  iv: string;               // Base64エンコードされたIV
  mimeType: string;         // 元の音声のMIMEタイプ
  version: string;          // 暗号化バージョン（"audio-v1"）
}

/**
 * 音声データを暗号化
 * 
 * @param audioBlob 録音された音声Blob
 * @param masterKeyBase64 Base64エンコードされたmasterKey
 * @returns 暗号化結果
 */
export async function encryptAudio(
  audioBlob: Blob,
  masterKeyBase64: string
): Promise<AudioEncryptionResult> {
  // 音声用キーを導出
  const audioKey = await deriveAudioKey(masterKeyBase64);

  // IV生成
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Blobをバイナリに変換
  const audioData = await audioBlob.arrayBuffer();

  // 暗号化
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    audioKey,
    audioData
  );

  return {
    ciphertext: encrypted,
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    mimeType: audioBlob.type,
    version: "audio-v1",
  };
}

/**
 * 暗号化された音声を復号
 * 
 * @param encryptedData 暗号化された音声データ（ArrayBuffer）
 * @param ivBase64 Base64エンコードされたIV
 * @param masterKeyBase64 Base64エンコードされたmasterKey
 * @param mimeType 音声のMIMEタイプ
 * @returns 復号された音声Blob
 */
export async function decryptAudio(
  encryptedData: ArrayBuffer,
  ivBase64: string,
  masterKeyBase64: string,
  mimeType: string
): Promise<Blob> {
  // 音声用キーを導出
  const audioKey = await deriveAudioKey(masterKeyBase64);

  // IV復元
  const iv = base64ToArrayBuffer(ivBase64);

  // 復号
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    audioKey,
    encryptedData
  );

  return new Blob([decrypted], { type: mimeType });
}

// ============================================
// 解錠コードによるclientShare暗号化/復号
// ============================================

/**
 * 解錠コードで暗号化されたclientShareの封筒
 */
export interface UnlockEnvelope {
  wrappedClientShare: string;      // base64url
  wrappedClientShareIv: string;    // base64url
  wrappedClientShareSalt: string;  // base64url
  wrappedClientShareKdf: string;   // "pbkdf2-sha256"
  wrappedClientShareKdfIters: number;
}

/**
 * PBKDF2で解錠コードからAES-GCM鍵を導出
 */
async function deriveKeyFromUnlockCode(
  unlockCode: string,
  salt: BufferSource,
  iterations: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(unlockCode),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * clientShareを解錠コードで暗号化（封筒作成）
 * 
 * @param clientShare Base64エンコードされたclientShare
 * @param unlockCode ユーザーが入力する解錠コード
 * @returns 暗号化された封筒
 */
export async function wrapClientShare(
  clientShare: string,
  unlockCode: string
): Promise<UnlockEnvelope> {
  // Salt生成（16バイト）
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PBKDF2で鍵導出
  const key = await deriveKeyFromUnlockCode(unlockCode, salt, KDF_ITERATIONS);

  // IV生成（12バイト）
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // clientShareを暗号化
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoder.encode(clientShare)
  );

  return {
    wrappedClientShare: arrayBufferToBase64Url(encrypted),
    wrappedClientShareIv: arrayBufferToBase64Url(iv.buffer as ArrayBuffer),
    wrappedClientShareSalt: arrayBufferToBase64Url(salt.buffer as ArrayBuffer),
    wrappedClientShareKdf: KDF_ALGORITHM,
    wrappedClientShareKdfIters: KDF_ITERATIONS,
  };
}

/**
 * 解錠コードでclientShareを復号（封筒を開封）
 * 
 * @param envelope 暗号化された封筒
 * @param unlockCode ユーザーが入力する解錠コード
 * @returns 復号されたclientShare
 * @throws 解錠コードが間違っている場合はエラー
 */
export async function unwrapClientShare(
  envelope: UnlockEnvelope,
  unlockCode: string
): Promise<string> {
  // Salt復元
  const salt = new Uint8Array(base64UrlToArrayBuffer(envelope.wrappedClientShareSalt));

  // PBKDF2で鍵導出
  const key = await deriveKeyFromUnlockCode(
    unlockCode,
    salt,
    envelope.wrappedClientShareKdfIters
  );

  // IV復元
  const iv = new Uint8Array(base64UrlToArrayBuffer(envelope.wrappedClientShareIv));

  // 暗号文復元
  const ciphertext = base64UrlToArrayBuffer(envelope.wrappedClientShare);

  // 復号
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * 安全な解錠コードを生成
 * 
 * @param length コードの長さ（デフォルト: 12文字）
 * @returns 生成された解錠コード
 */
export function generateUnlockCode(length: number = 12): string {
  // 読みやすい文字のみ使用（紛らわしい文字を除外）
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  // 4文字ごとにハイフンで区切る（読みやすさのため）
  return code.match(/.{1,4}/g)?.join("-") || code;
}
