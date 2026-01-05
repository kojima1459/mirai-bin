/**
 * 証跡（ハッシュ）生成ユーティリティ
 * Web Crypto API を使用した SHA-256 ハッシュ生成
 */

// SHA-256ハッシュを生成（文字列から）
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToHex(hashBuffer);
}

// SHA-256ハッシュを生成（ArrayBufferから）
export async function generateHashFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return arrayBufferToHex(hashBuffer);
}

// SHA-256ハッシュを生成（Base64文字列から）
export async function generateHashFromBase64(base64: string): Promise<string> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return arrayBufferToHex(hashBuffer);
}

// ArrayBufferを16進数文字列に変換
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 証跡データの型
export interface ProofData {
  hash: string; // SHA-256ハッシュ（64文字のhex）
  timestamp: number; // Unix timestamp（ミリ秒）
  provider: "local" | "opentimestamps" | "base"; // 証跡プロバイダー
}

// 証跡を生成
export async function createProof(ciphertext: string): Promise<ProofData> {
  const hash = await generateHashFromBase64(ciphertext);
  
  return {
    hash,
    timestamp: Date.now(),
    provider: "local", // Day 1はローカルのみ
  };
}

// ハッシュの検証
export async function verifyHash(
  ciphertext: string,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await generateHashFromBase64(ciphertext);
  return actualHash === expectedHash;
}
