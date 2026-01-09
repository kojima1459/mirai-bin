/**
 * リマインダーバッチ処理
 * 
 * 毎日09:00 JSTに実行
 * - scheduledAt <= now かつ sentAt IS NULL のリマインダーを検索
 * - 1件ずつメール送信
 * - 成功したら sentAt = now（原子的更新で二重送信防止）
 * - 失敗したら status = failed, lastError = ...
 */

import { getPendingReminders, markReminderAsSent, markReminderAsFailed } from "./db";
import { createReminderNotification } from "./db_notification";
import { getDb } from "./db";
import { sendReminderEmail, ReminderEmailParams } from "./reminderMailer";
import { ENV } from "./_core/env";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export interface BatchResult {
  processed: number;
  sent: number;
  inboxCreated: number;
  failed: number;
  skipped: number;
  errors: Array<{ reminderId: number; error: string }>;
}

/**
 * リマインダーバッチを実行
 */
export async function runReminderBatch(): Promise<BatchResult> {
  const result: BatchResult = {
    processed: 0,
    sent: 0,
    inboxCreated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log("[ReminderBatch] Starting batch processing...");

  // 送信すべきリマインダーを取得
  const reminders = await getPendingReminders(100);
  console.log(`[ReminderBatch] Found ${reminders.length} pending reminders`);

  for (const reminder of reminders) {
    result.processed++;

    // 手紙情報がない場合はスキップ
    if (!reminder.letter) {
      console.warn(`[ReminderBatch] Letter not found for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "Letter not found");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "Letter not found" });
      continue;
    }

    // ユーザー情報がない場合はスキップ
    if (!reminder.user) {
      console.warn(`[ReminderBatch] User not found for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "User not found");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "User not found" });
      continue;
    }

    // メールアドレスを決定（notificationEmail > email）
    const ownerEmail = reminder.user.notificationEmail || reminder.user.email;
    const trustedEmail = reminder.user.trustedContactEmail;

    if (!ownerEmail && !trustedEmail) {
      console.warn(`[ReminderBatch] No email for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "No email address");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "No email address" });
      continue;
    }

    // 開封日時がない場合はスキップ
    if (!reminder.letter.unlockAt) {
      console.warn(`[ReminderBatch] No unlock date for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "No unlock date");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "No unlock date" });
      continue;
    }

    // アプリ内通知（inbox）に必ず書き込み
    try {
      const db = await getDb();
      if (db) {
        const unlockAtStr = format(new Date(reminder.letter.unlockAt), "yyyy年MM月dd日 HH:mm", { locale: ja });
        const recipientLabel = reminder.letter.recipientName || "（宛名未設定）";
        await createReminderNotification(
          db,
          reminder.ownerUserId,
          reminder.letterId,
          recipientLabel,
          reminder.daysBefore,
          unlockAtStr
        );
        result.inboxCreated++;
        console.log(`[ReminderBatch] Created inbox notification for reminder ${reminder.id}`);
      }
    } catch (inboxError) {
      console.warn(`[ReminderBatch] Failed to create inbox notification for ${reminder.id}:`, inboxError);
    }

    // 管理画面URLを生成
    // TODO: 実際のドメインに置き換え
    const baseUrl = ENV.oAuthServerUrl?.replace("/api", "") || "https://mirai-bin.manus.space";
    const letterManagementUrl = `${baseUrl}/letters/${reminder.letterId}`;

    // メール送信パラメータを構築
    const baseEmailParams: Omit<ReminderEmailParams, "to"> = {
      recipientName: reminder.letter.recipientName,
      unlockAt: reminder.letter.unlockAt,
      daysBefore: reminder.daysBefore,
      letterId: reminder.letterId,
      letterManagementUrl,
    };

    // オーナーにメール送信（検証済みの場合のみ）
    let ownerSent = false;
    const isOwnerEmailVerified = reminder.user.notificationEmailVerified;
    if (ownerEmail && isOwnerEmailVerified) {
      ownerSent = await sendReminderEmail({ ...baseEmailParams, to: ownerEmail });
      if (ownerSent) {
        console.log(`[ReminderBatch] Sent reminder ${reminder.id} to owner: ${ownerEmail}`);
      }
    } else if (ownerEmail && !isOwnerEmailVerified) {
      console.log(`[ReminderBatch] Skipping email to ${ownerEmail} for reminder ${reminder.id}: not verified`);
    }

    // 信頼できる通知先にもメール送信（本文なし、メタのみ）
    let trustedSent = false;
    if (trustedEmail) {
      trustedSent = await sendReminderEmail({ ...baseEmailParams, to: trustedEmail });
      if (trustedSent) {
        console.log(`[ReminderBatch] Sent reminder ${reminder.id} to trusted contact: ${trustedEmail}`);
      }
    }

    if (ownerSent || trustedSent) {
      // 送信済みにマーク（原子的更新）
      const marked = await markReminderAsSent(reminder.id);
      if (marked) {
        result.sent++;
      } else {
        // 既に送信済み（二重送信防止）
        console.log(`[ReminderBatch] Reminder ${reminder.id} already sent (skipped)`);
        result.skipped++;
      }
    } else {
      // 送信失敗
      await markReminderAsFailed(reminder.id, "Email send failed");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "Email send failed" });
    }
  }

  console.log(`[ReminderBatch] Batch complete: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`);
  return result;
}
