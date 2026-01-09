import { onRequest } from "firebase-functions/v2/https";
import type { Express, Request, Response } from "express";

// Note: Server is bundled by esbuild into lib/server/index.js
// This import works after running `pnpm build:functions`
export const api = onRequest({
    region: "asia-northeast1",
    timeoutSeconds: 60,
    memory: "1GiB",
    cors: true,
}, async (req: Request, res: Response) => {
    // Dynamic import to avoid initialization issues
    // @ts-ignore - Module is bundled by esbuild
    const { app } = (await import("./server/index.js")) as { app: Express };
    return app(req, res);
});
