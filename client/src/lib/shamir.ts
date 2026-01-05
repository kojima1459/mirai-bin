/**
 * Shamir's Secret Sharing クライアント側ユーティリティ
 * 
 * ゼロ知識設計:
 * - 復号キーの分割（splitKey）はクライアント側で実行
 * - サーバーには serverShare のみ送信
 * - clientShare は解錠コードで暗号化して保存
 * - backupShare はユーザーに提示して保管させる
 */

import { split, combine } from "shamir-secret-sharing";

// シェアの設定
const TOTAL_SHARES = 3;
const THRESHOLD = 2; // 復号に必要なシェアの数

/**
 * Base64デコード（string → Uint8Array）
 * base64url形式に対応
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
 * base64url形式で出力
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
 * 復号キーをシェアに分割（クライアント側で実行）
 * 
 * @param keyBase64 Base64エンコードされた復号キー
 * @returns 3つのシェア（Base64エンコード済み）
 *   - clientShare: 解錠コードで暗号化してサーバーに保存
 *   - serverShare: サーバーに送信（開封日時後に提供）
 *   - backupShare: ユーザーに提示して保管させる（サーバーには送信しない）
 */
export async function splitKey(keyBase64: string): Promise<{
  clientShare: string;
  serverShare: string;
  backupShare: string;
}> {
  const keyBytes = fromBase64(keyBase64);
  
  // Shamirの秘密分散でシェアに分割
  const shares = await split(keyBytes, TOTAL_SHARES, THRESHOLD);
  
  return {
    clientShare: toBase64(shares[0]),
    serverShare: toBase64(shares[1]),
    backupShare: toBase64(shares[2]),
  };
}

/**
 * シェアから復号キーを復元
 * @param clientShare クライアントシェア（解錠コードで復元）
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

/**
 * シェア情報を生成（フロントエンド向け）
 */
export function generateShareInfo(
  hasClientShare: boolean,
  hasServerShare: boolean,
  unlockAt: Date | null
): {
  canDecrypt: boolean;
  message: string;
  sharesAvailable: number;
  sharesRequired: number;
} {
  const sharesAvailable = (hasClientShare ? 1 : 0) + (hasServerShare ? 1 : 0);
  const canDecrypt = sharesAvailable >= THRESHOLD;
  
  let message: string;
  
  if (canDecrypt) {
    message = "復号可能です";
  } else if (!hasClientShare) {
    message = "解錠コードが必要です";
  } else if (!hasServerShare && unlockAt) {
    message = `開封日時（${unlockAt.toLocaleDateString("ja-JP")}）まで復号できません`;
  } else {
    message = "復号に必要なシェアが不足しています";
  }
  
  return {
    canDecrypt,
    message,
    sharesAvailable,
    sharesRequired: THRESHOLD,
  };
}
