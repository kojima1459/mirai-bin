/**
 * Shamir's Secret Sharing 統合
 * 復号キーを複数のシェアに分割し、開封日時の技術的制限を実現
 * 
 * 仕組み:
 * - 復号キーを3つのシェアに分割（2つあれば復号可能）
 * - シェア1: クライアント（URLフラグメントに含める）
 * - シェア2: サーバー（開封日時後にのみ提供）
 * - シェア3: バックアップ用（将来的に信頼できる第三者に預ける）
 */

import { split, combine } from "shamir-secret-sharing";

// シェアの設定
const TOTAL_SHARES = 3;
const THRESHOLD = 2; // 復号に必要なシェアの数

/**
 * Base64エンコード（Uint8Array → string）
 */
function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Base64デコード（string → Uint8Array）
 */
function fromBase64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, "base64url"));
}

/**
 * 復号キーをシェアに分割
 * @param keyBase64 Base64エンコードされた復号キー
 * @returns 3つのシェア（Base64エンコード済み）
 */
export async function splitKey(keyBase64: string): Promise<{
  clientShare: string;  // クライアント用（URLに含める）
  serverShare: string;  // サーバー用（開封日時後に提供）
  backupShare: string;  // バックアップ用
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
 * @param shares Base64エンコードされたシェアの配列（最低2つ必要）
 * @returns 復元された復号キー（Base64エンコード済み）
 */
export async function combineShares(shares: string[]): Promise<string> {
  if (shares.length < THRESHOLD) {
    throw new Error(`復号には最低${THRESHOLD}つのシェアが必要です`);
  }
  
  const shareBytes = shares.map(fromBase64);
  const keyBytes = await combine(shareBytes);
  
  return toBase64(keyBytes);
}

/**
 * シェアの検証（復元可能かどうかをチェック）
 */
export async function verifyShares(shares: string[]): Promise<boolean> {
  try {
    await combineShares(shares);
    return true;
  } catch {
    return false;
  }
}

/**
 * 開封日時に基づいてサーバーシェアを提供するかどうかを判定
 */
export function canProvideServerShare(unlockAt: Date | null): boolean {
  if (!unlockAt) {
    // 開封日時が設定されていない場合は即時提供
    return true;
  }
  
  const now = new Date();
  return now >= unlockAt;
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
    message = "共有リンクが不完全です。正しいリンクを使用してください。";
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
