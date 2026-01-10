/**
 * Email Templates
 * 
 * Pre-built email templates for:
 * - Verification email
 * - Open notification (letter was read)
 * 
 * Security: These templates NEVER include unlock codes, backup shares, or plaintext content.
 */

import { makeVerifyEmailUrl } from "../url";

// ============================================
// Verification Email
// ============================================

export interface VerificationEmailParams {
  token: string;
  email: string;
}

export function buildVerificationEmailSubject(): string {
  return "【SilentMemo】メールアドレスの確認";
}

export function buildVerificationEmailHtml(params: VerificationEmailParams): string {
  const verifyUrl = makeVerifyEmailUrl(params.token);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>メールアドレスの確認</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h1 style="color: #4F46E5; font-size: 24px; margin: 0 0 16px 0;">
      ✉️ メールアドレスの確認
    </h1>
    <p style="font-size: 16px; margin: 0; color: #3730A3;">
      以下のボタンをクリックして、通知先メールの設定を完了してください。
    </p>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${verifyUrl}" style="display: inline-block; background: #4F46E5; color: #fff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: bold; font-size: 16px;">
      メールアドレスを確認する
    </a>
  </div>

  <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <p style="margin: 0; font-size: 14px; color: #78350F;">
      ⚠️ このリンクは24時間で有効期限が切れます。<br>
      お早めに確認を完了してください。
    </p>
  </div>

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    ボタンがクリックできない場合は、以下のURLをブラウザに貼り付けてください：<br>
    <a href="${verifyUrl}" style="color: #4F46E5; word-break: break-all;">${verifyUrl}</a>
  </p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    このメールはSilentMemoからの自動送信です。<br>
    心当たりがない場合は、このメールを無視してください。
  </p>
</body>
</html>
  `.trim();
}

export function buildVerificationEmailText(params: VerificationEmailParams): string {
  const verifyUrl = makeVerifyEmailUrl(params.token);

  return `
【SilentMemo】メールアドレスの確認

以下のURLにアクセスして、通知先メールの設定を完了してください。

${verifyUrl}

※ このリンクは24時間で有効期限が切れます。

---
このメールはSilentMemoからの自動送信です。
心当たりがない場合は、このメールを無視してください。
  `.trim();
}

// ============================================
// Open Notification Email
// ============================================

export interface OpenNotificationEmailParams {
  recipientLabel: string;  // 宛先ラベル（例：「20歳の君へ」）
  openedAt: Date;
  letterManagementUrl: string;
}

export function buildOpenNotificationSubject(): string {
  return "【SilentMemo】手紙が開封されました";
}

export function buildOpenNotificationHtml(params: OpenNotificationEmailParams): string {
  const { recipientLabel, openedAt, letterManagementUrl } = params;

  const openedAtStr = openedAt.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>手紙が開封されました</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h1 style="color: #059669; font-size: 24px; margin: 0 0 16px 0;">
      📖 手紙が開封されました
    </h1>
    <p style="font-size: 18px; margin: 0; color: #047857;">
      「${recipientLabel}」への手紙が読まれました
    </p>
  </div>

  <div style="background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="font-size: 16px; color: #6B7280; margin: 0 0 12px 0;">開封日時</h2>
    <p style="font-size: 20px; font-weight: bold; color: #1F2937; margin: 0;">
      ${openedAtStr}
    </p>
  </div>

  <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <p style="margin: 0; font-size: 14px; color: #065F46;">
      🔐 ゼロ知識設計のため、運営者も手紙の内容を読むことはできません。<br>
      あなたの想いは安全に届きました。
    </p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${letterManagementUrl}" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
      手紙の詳細を見る
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    このメールはSilentMemoからの自動送信です。
  </p>
</body>
</html>
  `.trim();
}

export function buildOpenNotificationText(params: OpenNotificationEmailParams): string {
  const { recipientLabel, openedAt, letterManagementUrl } = params;

  const openedAtStr = openedAt.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  return `
【SilentMemo】手紙が開封されました

「${recipientLabel}」への手紙が読まれました。

■ 開封日時
${openedAtStr}

■ 手紙の詳細を見る
${letterManagementUrl}

※ ゼロ知識設計のため、運営者も手紙の内容を読むことはできません。

---
このメールはSilentMemoからの自動送信です。
  `.trim();
}
