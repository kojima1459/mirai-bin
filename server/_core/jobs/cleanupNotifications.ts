/**
 * Notification Cleanup Job
 * 
 * Deletes read notifications older than a specified number of days (default: 90).
 * 
 * Constraints:
 * - Never delete unread notifications (readAt IS NULL)
 * - Only delete where readAt IS NOT NULL AND createdAt < threshold
 * - Failures do not affect main application (log only)
 */

import { getDb } from "../../db";
import { notifications } from "../../../drizzle/schema";
import { and, lt, isNotNull, sql } from "drizzle-orm";

export interface CleanupResult {
    deleted: number;
    executedAt: string;
    error?: string;
}

/**
 * Clean up old read notifications
 * 
 * @param days - Number of days after which read notifications are deleted (default: 90)
 * @returns Result with deleted count
 */
export async function cleanupNotifications(days: number = 90): Promise<CleanupResult> {
    const executedAt = new Date().toISOString();

    console.log(`[CleanupNotifications] Starting cleanup (days=${days})...`);

    try {
        const db = await getDb();
        if (!db) {
            console.warn("[CleanupNotifications] Database not available, skipping cleanup");
            return { deleted: 0, executedAt, error: "Database not available" };
        }

        // Calculate threshold date
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);

        // Delete read notifications older than threshold
        // Conditions: readAt IS NOT NULL AND createdAt < threshold
        const result = await db.delete(notifications)
            .where(
                and(
                    isNotNull(notifications.readAt),
                    lt(notifications.createdAt, thresholdDate)
                )
            );

        // Get affected rows count (MySQL returns affectedRows)
        const deleted = (result as unknown as { affectedRows?: number })?.affectedRows ?? 0;

        console.log(`[CleanupNotifications] Completed: ${deleted} notifications deleted`);
        console.log(`[CleanupNotifications] Threshold: ${thresholdDate.toISOString()}`);

        return { deleted, executedAt };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[CleanupNotifications] Failed:", errorMsg);

        // Don't throw - return error in result for observability
        return { deleted: 0, executedAt, error: errorMsg };
    }
}
