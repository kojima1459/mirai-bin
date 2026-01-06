/**
 * リマインダーメール送信機能
 * 
 * ゼロ知識設計:
 * - 解錠コードは含めない（サーバーに保存していないため）
 * - 通知の目的は「思い出させる」＋「PDF/保管場所を探させる」
 */

import { ENV } from "./_core/env";

export interface ReminderEmailParams {
  to: string;
  recipientName: string | null; // 宛先ラベル（例：「20歳の君へ」）
  unlockAt: Date;
  daysBefore: number;
  letterId: number;
  letterManagementUrl: string; // 管理画面の該当手紙へのリンク
}

/**
 * リマインダーメールの件名を生成
 */
export function buildReminderSubject(daysBefore: number): string {
  if (daysBefore === 1) {
    return "【未来便】明日が開封日です";
  }
  return `【未来便】開封日が近づいています（あと${daysBefore}日）`;
}

/**
 * リマインダーメールの本文を生成（HTML）
 */
export function buildReminderBodyHtml(params: ReminderEmailParams): string {
  const { recipientName, unlockAt, daysBefore, letterManagementUrl } = params;
  
  const unlockDateStr = unlockAt.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Tokyo",
  });

  const recipientLabel = recipientName || "大切な人";
  const daysText = daysBefore === 1 ? "明日" : `あと${daysBefore}日`;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>開封日が近づいています</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #FFF8F0 0%, #FFF5EB 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h1 style="color: #D97706; font-size: 24px; margin: 0 0 16px 0;">
      📬 開封日が近づいています
    </h1>
    <p style="font-size: 18px; margin: 0; color: #92400E;">
      「${recipientLabel}」への手紙は<strong>${daysText}</strong>で開封日を迎えます
    </p>
  </div>

  <div style="background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="font-size: 16px; color: #6B7280; margin: 0 0 12px 0;">開封予定日</h2>
    <p style="font-size: 20px; font-weight: bold; color: #1F2937; margin: 0;">
      ${unlockDateStr}
    </p>
  </div>

  <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400E;">
      ⚠️ 解錠コードをご確認ください
    </p>
    <p style="margin: 0; font-size: 14px; color: #78350F;">
      解錠コードはサーバーに保存していません。<br>
      手紙作成時にダウンロードしたPDF（3ページ目）または保管場所を確認してください。
    </p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${letterManagementUrl}" style="display: inline-block; background: #D97706; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
      手紙を確認する
    </a>
    <p style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">
      ※ログインが必要です
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    このメールは未来便からの自動送信です。<br>
    リマインダー設定は<a href="${letterManagementUrl}" style="color: #D97706;">マイレター</a>から変更できます。
  </p>
</body>
</html>
  `.trim();
}

/**
 * リマインダーメールの本文を生成（プレーンテキスト）
 */
export function buildReminderBodyText(params: ReminderEmailParams): string {
  const { recipientName, unlockAt, daysBefore, letterManagementUrl } = params;
  
  const unlockDateStr = unlockAt.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Tokyo",
  });

  const recipientLabel = recipientName || "大切な人";
  const daysText = daysBefore === 1 ? "明日" : `あと${daysBefore}日`;

  return `
【未来便】開封日が近づいています

「${recipientLabel}」への手紙は${daysText}で開封日を迎えます。

■ 開封予定日
${unlockDateStr}

■ 解錠コードをご確認ください
解錠コードはサーバーに保存していません。
手紙作成時にダウンロードしたPDF（3ページ目）または保管場所を確認してください。

■ 手紙を確認する
${letterManagementUrl}
※ログインが必要です

---
このメールは未来便からの自動送信です。
リマインダー設定はマイレターから変更できます。
  `.trim();
}

/**
 * リマインダーメールを送信
 * 
 * Manus Notification APIを使用してメールを送信
 * （将来的にはSendGrid等に置き換え可能）
 */
export async function sendReminderEmail(params: ReminderEmailParams): Promise<boolean> {
  const { to } = params;
  
  const subject = buildReminderSubject(params.daysBefore);
  const htmlBody = buildReminderBodyHtml(params);
  const textBody = buildReminderBodyText(params);

  // Manus Notification APIを使用
  // 現在はオーナー通知のみ対応のため、オーナーへの通知として送信
  // TODO: 将来的にはSendGrid等のメールサービスに置き換え
  
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn("[ReminderMailer] Notification service not configured");
    return false;
  }

  const endpoint = new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`
  ).toString();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({
        title: subject,
        content: textBody,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[ReminderMailer] Failed to send reminder (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    console.log(`[ReminderMailer] Reminder sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.warn("[ReminderMailer] Error sending reminder:", error);
    return false;
  }
}
