import { eq, desc, and, isNull, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { notifications } from "../drizzle/schema";

export type NotificationType =
    | "reminder_before_unlock"
    | "letter_opened"
    | "family_invite"
    | "system";

export interface NotificationMeta {
    letterId?: number;
    recipientLabel?: string;
    daysRemaining?: number;
    familyId?: number;
}

/**
 * Create a new in-app notification
 * IMPORTANT: Never include decryption info in title/body
 */
export async function createNotification(
    db: MySql2Database<any>,
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
    meta?: NotificationMeta
): Promise<number> {
    const result = await db.insert(notifications).values({
        userId,
        type,
        title,
        body,
        meta: meta ? JSON.stringify(meta) : null,
    });
    return result[0].insertId;
}

/**
 * Get notifications for a user (newest first)
 */
export async function getNotifications(
    db: MySql2Database<any>,
    userId: number,
    limit: number = 50,
    offset: number = 0
) {
    return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(
    db: MySql2Database<any>,
    userId: number
): Promise<number> {
    const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(notifications)
        .where(and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt)
        ));
    return result[0]?.count ?? 0;
}

/**
 * Mark notification(s) as read
 */
export async function markNotificationAsRead(
    db: MySql2Database<any>,
    userId: number,
    notificationId?: number
): Promise<void> {
    const now = new Date();

    if (notificationId) {
        // Mark single notification
        await db
            .update(notifications)
            .set({ readAt: now })
            .where(and(
                eq(notifications.id, notificationId),
                eq(notifications.userId, userId)
            ));
    } else {
        // Mark all as read
        await db
            .update(notifications)
            .set({ readAt: now })
            .where(and(
                eq(notifications.userId, userId),
                isNull(notifications.readAt)
            ));
    }
}

/**
 * Create reminder notification (called by reminder batch)
 * Safe: Only contains metadata, no decryption info
 */
export async function createReminderNotification(
    db: MySql2Database<any>,
    userId: number,
    letterId: number,
    recipientLabel: string,
    daysRemaining: number,
    unlockAtStr: string
): Promise<number> {
    const title = `手紙の開封日が近づいています`;
    const body = `${recipientLabel}への手紙が${daysRemaining}日後（${unlockAtStr}）に開封可能になります。`;

    return await createNotification(db, userId, "reminder_before_unlock", title, body, {
        letterId,
        recipientLabel,
        daysRemaining,
    });
}
