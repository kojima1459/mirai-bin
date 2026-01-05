/**
 * Shamir's Secret Sharing クライアント側ユーティリティ
 * サーバーから受け取ったシェアとクライアントシェアを結合して復号キーを復元
 */

import { combine } from "shamir-secret-sharing";

/**
 * Base64デコード（string → Uint8Array）
 */
function fromBase64(str: string): Uint8Array {
  // base64urlをbase64に変換
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  const paddedBase64 = padding ? base64 + "=".repeat(4 - padding) : base64;
  
  const binaryString = atob(paddedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Base64エンコード（Uint8Array → string）
 */
function toBase64(bytes: Uint8Array): string {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  // base64urlに変換
  return btoa(binaryString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * シェアから復号キーを復元
 * @param clientShare クライアントシェア（URLフラグメントから取得）
 * @param serverShare サーバーシェア（APIから取得）
 * @returns 復元された復号キー（Base64エンコード済み）
 */
export async function combineShares(
  clientShare: string,
  serverShare: string
): Promise<string> {
  const shares = [fromBase64(clientShare), fromBase64(serverShare)];
  const keyBytes = await combine(shares);
  return toBase64(keyBytes);
}

/**
 * シェアの検証（復元可能かどうかをチェック）
 */
export async function verifyShares(
  clientShare: string,
  serverShare: string
): Promise<boolean> {
  try {
    await combineShares(clientShare, serverShare);
    return true;
  } catch {
    return false;
  }
}
