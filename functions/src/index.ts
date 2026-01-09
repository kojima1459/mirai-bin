import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import type { Express, Request, Response } from "express";

// Note: Server is bundled by esbuild into lib/server/index.js
// This import works after running `pnpm build:functions`
export const api = onRequest({
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "1GiB",
    cors: true,
}, async (req: Request, res: Response) => {
    // Dynamic import to avoid initialization issues
    // @ts-ignore - Module is bundled by esbuild
    const { app } = (await import("./server/index.js")) as { app: Express };
    return app(req, res);
});

/**
 * Scheduled job: Clean up old read notifications
 * Runs daily at 3:00 AM JST (18:00 UTC previous day)
 */
export const cleanupNotificationsScheduled = onSchedule({
    schedule: "0 18 * * *",  // 18:00 UTC = 3:00 AM JST
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 120,
}, async () => {
    console.log("[ScheduledJob] Starting notification cleanup...");
    try {
        // @ts-ignore - Module is bundled by esbuild
        const { cleanupNotifications } = await import("./server/_core/jobs/cleanupNotifications.js");
        const result = await cleanupNotifications(90);
        console.log("[ScheduledJob] Cleanup completed:", result);
    } catch (error) {
        console.error("[ScheduledJob] Cleanup failed:", error);
        // Don't throw - scheduled job should not fail
    }
});
