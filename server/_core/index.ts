import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { runReminderBatch } from "../reminderBatch";
import { ENV } from "./env";

// Export Express app for Cloud Functions
export const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Cron endpoint for reminder batch processing
app.post("/api/cron/reminders", async (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = ENV.forgeApiKey || ENV.geminiApiKey;

  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedToken) {
    console.warn("[Cron] Unauthorized request to /api/cron/reminders");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("[Cron] Running reminder batch...");
    const result = await runReminderBatch();
    console.log("[Cron] Reminder batch completed:", result);
    return res.json({ success: true, result });
  } catch (error) {
    console.error("[Cron] Reminder batch failed:", error);
    return res.status(500).json({ error: "Batch processing failed" });
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check for Cloud Functions
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    // Dynamic import to avoid bundling vite in production
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Only start server if not being imported (for Cloud Functions)
const isCloudFunctions = !!process.env.FUNCTIONS_EMULATOR || !!process.env.FUNCTION_TARGET;
if (!isCloudFunctions) {
  startServer().catch(console.error);
}
