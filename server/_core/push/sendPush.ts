/**
 * Web Push Notification Utility
 * 
 * Uses VAPID for authentication.
 * Handles 410 Gone responses by marking subscriptions as revoked.
 * 
 * Security: Payload contains ONLY title/body/url - never unlock codes or content.
 */

import { ENV } from "../env";
import { getDb } from "../../db";
import { pushSubscriptions } from "../../../drizzle/schema";
import { eq, isNull } from "drizzle-orm";

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
}

export interface SendPushResult {
    sent: number;
    failed: number;
    revoked: number;
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
    return !!(ENV.vapidPublicKey && ENV.vapidPrivateKey);
}

/**
 * Send push notification to all active subscriptions for a user
 */
export async function sendPushToUser(
    userId: number,
    payload: PushPayload
): Promise<SendPushResult> {
    const result: SendPushResult = { sent: 0, failed: 0, revoked: 0 };

    if (!isPushConfigured()) {
        console.log("[Push] VAPID not configured, skipping push");
        return result;
    }

    const db = await getDb();
    if (!db) {
        console.warn("[Push] Database not available");
        return result;
    }

    // Get all active subscriptions for user
    const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(
            eq(pushSubscriptions.userId, userId)
        );

    // Filter out revoked subscriptions
    const activeSubscriptions = subscriptions.filter(s => !s.revokedAt);

    if (activeSubscriptions.length === 0) {
        console.log(`[Push] No active subscriptions for user ${userId}`);
        return result;
    }

    console.log(`[Push] Sending to ${activeSubscriptions.length} subscriptions for user ${userId}`);

    // Dynamic import to avoid bundling issues
    const webpush = await import("web-push");

    webpush.setVapidDetails(
        ENV.pushSubject,
        ENV.vapidPublicKey,
        ENV.vapidPrivateKey
    );

    const payloadString = JSON.stringify(payload);

    for (const subscription of activeSubscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth,
                    },
                },
                payloadString
            );
            result.sent++;
            console.log(`[Push] Sent to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
        } catch (error: unknown) {
            const err = error as { statusCode?: number; message?: string };

            // 410 Gone or 404 means subscription is no longer valid
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`[Push] Subscription expired, revoking: ${subscription.endpoint.substring(0, 50)}...`);
                await db.update(pushSubscriptions)
                    .set({ revokedAt: new Date() })
                    .where(eq(pushSubscriptions.id, subscription.id));
                result.revoked++;
            } else {
                console.warn(`[Push] Failed to send: ${err.message || error}`);
                result.failed++;
            }
        }
    }

    console.log(`[Push] Results: sent=${result.sent}, failed=${result.failed}, revoked=${result.revoked}`);
    return result;
}

/**
 * Send reminder notification via push
 */
export async function sendReminderPush(
    userId: number,
    recipientLabel: string,
    daysBefore: number,
    letterId: number
): Promise<SendPushResult> {
    const title = daysBefore === 1
        ? "📬 明日が開封日です"
        : `📬 開封日まであと${daysBefore}日`;

    const body = `「${recipientLabel}」への手紙の開封日が近づいています`;

    return sendPushToUser(userId, {
        title,
        body,
        url: `/letters/${letterId}`,
    });
}

/**
 * Send letter opened notification via push
 */
export async function sendOpenedPush(
    userId: number,
    recipientLabel: string,
    letterId: number
): Promise<SendPushResult> {
    return sendPushToUser(userId, {
        title: "📖 手紙が開封されました",
        body: `「${recipientLabel}」への手紙が読まれました`,
        url: `/letters/${letterId}`,
    });
}
