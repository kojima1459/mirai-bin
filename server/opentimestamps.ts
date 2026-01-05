/**
 * OpenTimestamps統合
 * 手紙のハッシュをBitcoinブロックチェーンに刻印して証跡を残す
 */

import { storagePut, storageGet } from "./storage";

// OpenTimestampsのカレンダーサーバー
const OTS_CALENDAR_URLS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
];

/**
 * SHA-256ハッシュをバイト配列に変換
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * バイト配列を16進数文字列に変換
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * OpenTimestampsカレンダーサーバーにハッシュを送信
 */
export async function submitToCalendar(
  hash: string
): Promise<{ success: boolean; otsData?: Uint8Array; error?: string }> {
  const hashBytes = hexToBytes(hash);

  for (const calendarUrl of OTS_CALENDAR_URLS) {
    try {
      const response = await fetch(`${calendarUrl}/digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/vnd.opentimestamps.v1",
        },
        body: Buffer.from(hashBytes),
      });

      if (response.ok) {
        const otsData = new Uint8Array(await response.arrayBuffer());
        return { success: true, otsData };
      }
    } catch (error) {
      console.warn(`[OTS] Failed to submit to ${calendarUrl}:`, error);
      continue;
    }
  }

  return { success: false, error: "All calendar servers failed" };
}

/**
 * .otsファイルをS3に保存
 */
export async function saveOtsFile(
  letterId: number,
  otsData: Uint8Array
): Promise<{ url: string; key: string }> {
  const key = `ots/${letterId}-${Date.now()}.ots`;
  const buffer = Buffer.from(otsData);
  const result = await storagePut(key, buffer, "application/octet-stream");
  return result;
}

/**
 * 証跡をOpenTimestampsに刻印
 */
export async function stampHash(
  hash: string,
  letterId: number
): Promise<{
  success: boolean;
  otsFileUrl?: string;
  error?: string;
}> {
  try {
    // カレンダーサーバーに送信
    const result = await submitToCalendar(hash);

    if (!result.success || !result.otsData) {
      return { success: false, error: result.error };
    }

    // .otsファイルをS3に保存
    const { url } = await saveOtsFile(letterId, result.otsData);

    return {
      success: true,
      otsFileUrl: url,
    };
  } catch (error) {
    console.error("[OTS] Stamp error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * OpenTimestampsの検証ステータスを確認
 * 注: 完全な検証にはBitcoinブロックチェーンへの確認が必要（数時間〜数日かかる）
 */
export async function checkOtsStatus(
  otsFileUrl: string
): Promise<{
  status: "pending" | "submitted" | "confirmed";
  bitcoinBlockHeight?: number;
  bitcoinBlockTime?: Date;
}> {
  // 現時点では簡易的なステータスチェック
  // 完全な検証は将来的にバックグラウンドジョブで実装
  try {
    const response = await fetch(otsFileUrl);
    if (response.ok) {
      return { status: "submitted" };
    }
    return { status: "pending" };
  } catch {
    return { status: "pending" };
  }
}

/**
 * 証跡情報を生成（ユーザー向け表示用）
 */
export function generateProofInfo(
  hash: string,
  otsStatus: string,
  otsSubmittedAt?: Date,
  otsConfirmedAt?: Date
): {
  hashShort: string;
  statusLabel: string;
  statusDescription: string;
  submittedAt?: string;
  confirmedAt?: string;
} {
  const hashShort = `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;

  let statusLabel: string;
  let statusDescription: string;

  switch (otsStatus) {
    case "confirmed":
      statusLabel = "✓ Bitcoinブロックチェーンで確認済み";
      statusDescription =
        "この手紙の存在証明がBitcoinブロックチェーンに永久に記録されました。";
      break;
    case "submitted":
      statusLabel = "⏳ 確認待ち";
      statusDescription =
        "OpenTimestampsに送信済み。Bitcoinブロックチェーンへの記録を待っています（通常数時間〜1日）。";
      break;
    default:
      statusLabel = "📝 ローカル証跡";
      statusDescription =
        "手紙のハッシュ値が生成されました。ブロックチェーンへの刻印は処理中です。";
  }

  return {
    hashShort,
    statusLabel,
    statusDescription,
    submittedAt: otsSubmittedAt?.toISOString(),
    confirmedAt: otsConfirmedAt?.toISOString(),
  };
}
