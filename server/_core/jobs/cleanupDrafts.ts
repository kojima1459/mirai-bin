/**
 * Drafts Cleanup Job
 * 
 * Deletes drafts older than a specified number of days (default: 30).
 * Uses `updatedAt` to determine staleness.
 * 
 * Constraints:
 * - Only delete where updatedAt < threshold
 * - Failures do not affect main application (log only)
 */

import { getDb } from "../../db";
import { drafts } from "../../../drizzle/schema";
import { lt } from "drizzle-orm";

export interface DraftCleanupResult {
    deleted: number;
    executedAt: string;
    error?: string;
}

/**
 * Clean up old drafts
 * 
 * @param days - Number of days after which drafts are deleted (default: 30)
 * @returns Result with deleted count
 */
export async function cleanupDrafts(days: number = 30): Promise<DraftCleanupResult> {
    const executedAt = new Date().toISOString();

    console.log(`[CleanupDrafts] Starting cleanup (days=${days})...`);

    try {
        const db = await getDb();
        if (!db) {
            console.warn("[CleanupDrafts] Database not available, skipping cleanup");
            return { deleted: 0, executedAt, error: "Database not available" };
        }

        // Calculate threshold date
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);

        // Delete drafts older than threshold (based on updatedAt)
        const result = await db.delete(drafts)
            .where(lt(drafts.updatedAt, thresholdDate));

        // Get affected rows count (MySQL returns affectedRows)
        const deleted = (result as unknown as { affectedRows?: number })?.affectedRows ?? 0;

        console.log(`[CleanupDrafts] Completed: ${deleted} drafts deleted`);
        console.log(`[CleanupDrafts] Threshold: ${thresholdDate.toISOString()}`);

        return { deleted, executedAt };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[CleanupDrafts] Failed:", errorMsg);

        // Don't throw - return error in result for observability
        return { deleted: 0, executedAt, error: errorMsg };
    }
}
