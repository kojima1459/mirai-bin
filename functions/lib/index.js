import { onRequest } from "firebase-functions/v2/https";
// Note: Server is bundled by esbuild into lib/server/index.js
// This import works after running `pnpm build:functions`
export const api = onRequest({
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "1GiB",
    cors: true,
}, async (req, res) => {
    // Dynamic import to avoid initialization issues
    // @ts-ignore - Module is bundled by esbuild
    const { app } = (await import("./server/index.js"));
    return app(req, res);
});
//# sourceMappingURL=index.js.map