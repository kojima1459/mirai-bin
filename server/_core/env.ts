export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "AIzaSyBhm0YrR2ju8PMHKkU2F5_oSaSCoPPo8Qo",
  // Email configuration
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "noreply@silent-memo.web.app",
  mailProvider: (process.env.MAIL_PROVIDER ?? "mock") as "mock" | "sendgrid",
  appBaseUrl: process.env.APP_BASE_URL ?? "https://silent-memo.web.app",
  // Push notification (VAPID)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  pushSubject: process.env.PUSH_SUBJECT ?? "mailto:noreply@silent-memo.web.app",
};

if (ENV.isProduction) {
  const missingEnvs: string[] = [];
  if (!ENV.databaseUrl) missingEnvs.push("DATABASE_URL");
  if (!ENV.cookieSecret) missingEnvs.push("JWT_SECRET");
  if (!ENV.oAuthServerUrl) missingEnvs.push("OAUTH_SERVER_URL");

  if (missingEnvs.length > 0) {
    throw new Error(`[Server] Critical environment variables missing: ${missingEnvs.join(", ")}`);
  }
}
