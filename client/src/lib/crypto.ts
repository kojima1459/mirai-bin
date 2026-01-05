/**
 * クライアント側暗号化ユーティリティ
 * Web Crypto API を使用した AES-GCM-256 暗号化
 */

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
