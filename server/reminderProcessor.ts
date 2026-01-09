/**
 * Reminder Processor
 * 
 * This module processes pending reminders:
 * 1. ALWAYS writes to in-app notifications (inbox)
 * 2. Sends email ONLY if notificationEmail is verified
 * 
 * Run this as a cron job (e.g., every hour)
 */

import { getDb } from "./db";
import { getPendingReminders, markReminderAsSent, markReminderAsFailed } from "./db_reminder";
import { createReminderNotification } from "./db_notification";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export async function processReminderBatch(): Promise<{ processed: number; failed: number }> {
    const db = await getDb();
    if (!db) {
        console.warn("[ReminderBatch] Database not available");
        return { processed: 0, failed: 0 };
    }

    const reminders = await getPendingReminders(db, 100);
    console.log(`[ReminderBatch] Processing ${reminders.length} reminders`);

    let processed = 0;
    let failed = 0;

    for (const reminder of reminders) {
        try {
            const { letter, user } = reminder;

            if (!letter || !user) {
                console.warn(`[ReminderBatch] Skipping reminder ${reminder.id}: missing letter or user`);
                await markReminderAsFailed(db, reminder.id, "Missing letter or user");
                failed++;
                continue;
            }

            // Format unlock date for display
            const unlockAtStr = letter.unlockAt
                ? format(new Date(letter.unlockAt), "yyyy年MM月dd日 HH:mm", { locale: ja })
                : "未設定";

            const recipientLabel = letter.recipientName || "（宛名未設定）";

            // 1. ALWAYS write to in-app notifications (inbox)
            await createReminderNotification(
                db,
                reminder.ownerUserId,
                letter.id,
                recipientLabel,
                reminder.daysBefore,
                unlockAtStr
            );
            console.log(`[ReminderBatch] Created inbox notification for reminder ${reminder.id}`);

            // 2. Send email ONLY if verified
            const shouldSendEmail = user.notificationEmailVerified && user.notificationEmail;

            if (shouldSendEmail) {
                // TODO: Implement actual email sending
                // For now, just log
                console.log(`[ReminderBatch] Would send email to ${user.notificationEmail} for reminder ${reminder.id}`);
                // await sendReminderEmail(user.notificationEmail, recipientLabel, reminder.daysBefore, unlockAtStr);
            } else {
                console.log(`[ReminderBatch] Skipping email for reminder ${reminder.id}: not verified or no email`);
            }

            // Mark as sent
            const success = await markReminderAsSent(db, reminder.id);
            if (success) {
                processed++;
            } else {
                console.warn(`[ReminderBatch] Reminder ${reminder.id} was already processed`);
            }

        } catch (error) {
            console.error(`[ReminderBatch] Error processing reminder ${reminder.id}:`, error);
            await markReminderAsFailed(db, reminder.id, String(error));
            failed++;
        }
    }

    console.log(`[ReminderBatch] Completed: ${processed} processed, ${failed} failed`);
    return { processed, failed };
}
