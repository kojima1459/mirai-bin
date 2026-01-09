var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      geminiApiKey: process.env.GEMINI_API_KEY ?? "AIzaSyBhm0YrR2ju8PMHKkU2F5_oSaSCoPPo8Qo"
    };
  }
});

// server/_core/notification.ts
var notification_exports = {};
__export(notification_exports, {
  notifyOwner: () => notifyOwner
});
import { TRPCError } from "@trpc/server";
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString(input.title)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString(input.content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required."
        });
      }
      const title = trimValue(input.title);
      const content = trimValue(input.content);
      if (title.length > TITLE_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
        });
      }
      if (content.length > CONTENT_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
        });
      }
      return { title, content };
    };
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
init_notification();
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/db.ts
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  notificationEmail: varchar("notificationEmail", { length: 320 }),
  // 未設定ならemailを使用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var letters = mysqlTable("letters", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  // 受取人情報
  recipientName: varchar("recipientName", { length: 100 }),
  recipientRelation: varchar("recipientRelation", { length: 50 }),
  // 音声データ（URL参照のみ、本文は保存しない）
  audioUrl: varchar("audioUrl", { length: 500 }),
  audioDuration: int("audioDuration"),
  // テンプレート情報（本文は保存しない）
  templateUsed: varchar("templateUsed", { length: 50 }),
  // 暗号化関連（ゼロ知識: 暗号文のみ保存）
  isEncrypted: boolean("isEncrypted").default(true).notNull(),
  encryptionIv: varchar("encryptionIv", { length: 255 }).notNull(),
  ciphertextUrl: varchar("ciphertextUrl", { length: 500 }).notNull(),
  // 証跡関連
  proofHash: varchar("proofHash", { length: 64 }).notNull(),
  proofProvider: varchar("proofProvider", { length: 50 }).default("local"),
  txHash: varchar("txHash", { length: 66 }),
  proofCreatedAt: timestamp("proofCreatedAt"),
  // OpenTimestamps関連
  otsFileUrl: varchar("otsFileUrl", { length: 500 }),
  otsStatus: varchar("otsStatus", { length: 20 }).default("pending"),
  // pending, submitted, confirmed
  otsSubmittedAt: timestamp("otsSubmittedAt"),
  otsConfirmedAt: timestamp("otsConfirmedAt"),
  // 開封関連
  unlockAt: timestamp("unlockAt"),
  unlockPolicy: varchar("unlockPolicy", { length: 50 }).default("datetime"),
  isUnlocked: boolean("isUnlocked").default(false).notNull(),
  unlockedAt: timestamp("unlockedAt"),
  // 共有リンク関連
  shareToken: varchar("shareToken", { length: 64 }).unique(),
  viewCount: int("viewCount").default(0).notNull(),
  lastViewedAt: timestamp("lastViewedAt"),
  // Shamirシェア（ゼロ知識設計）
  // - serverShare: 開封日時後にのみ提供
  // - clientShareは解錠コードで暗号化してwrappedClientShareとして保存
  // - backupShareはサーバーに保存しない（ユーザーが保管）
  serverShare: text("serverShare"),
  useShamir: boolean("useShamir").default(true).notNull(),
  // 解錠コードで暗号化されたclientShare（封筒）
  wrappedClientShare: text("wrappedClientShare"),
  wrappedClientShareIv: varchar("wrappedClientShareIv", { length: 255 }),
  wrappedClientShareSalt: varchar("wrappedClientShareSalt", { length: 255 }),
  wrappedClientShareKdf: varchar("wrappedClientShareKdf", { length: 50 }),
  wrappedClientShareKdfIters: int("wrappedClientShareKdfIters"),
  // 解錠コード再発行（1回のみ）
  unlockCodeRegeneratedAt: timestamp("unlockCodeRegeneratedAt"),
  // メタデータ
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  subtitle: varchar("subtitle", { length: 200 }),
  // 1行説明
  description: text("description"),
  category: varchar("category", { length: 50 }).default("emotion").notNull(),
  // emotion/parent-truth/ritual/milestone
  prompt: text("prompt").notNull(),
  recordingPrompt: text("recordingPrompt").notNull(),
  recordingGuide: text("recordingGuide"),
  // 90秒で話す順番（JSON）
  exampleOneLiner: text("exampleOneLiner"),
  icon: varchar("icon", { length: 50 }),
  isRecommended: boolean("isRecommended").default(false).notNull(),
  // おすすめ3つ
  sortOrder: int("sortOrder").default(100).notNull(),
  // 表示順
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var drafts = mysqlTable("drafts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // テンプレート情報
  templateName: varchar("templateName", { length: 50 }),
  // 受取人情報
  recipientName: varchar("recipientName", { length: 100 }),
  recipientRelation: varchar("recipientRelation", { length: 50 }),
  // 音声データ
  audioUrl: varchar("audioUrl", { length: 500 }),
  audioBase64: text("audioBase64"),
  // 文字起こし・下書き（封緘前なので平文保存）
  transcription: text("transcription"),
  aiDraft: text("aiDraft"),
  finalContent: text("finalContent"),
  // 開封日時
  unlockAt: timestamp("unlockAt"),
  // 進捗状態
  currentStep: varchar("currentStep", { length: 20 }).default("template").notNull(),
  // メタデータ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var letterReminders = mysqlTable("letter_reminders", {
  id: int("id").autoincrement().primaryKey(),
  letterId: int("letterId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  // リマインダー種別
  type: varchar("type", { length: 50 }).default("before_unlock").notNull(),
  // before_unlock
  daysBefore: int("daysBefore").notNull(),
  // 90, 30, 7, 1
  // スケジュール
  scheduledAt: timestamp("scheduledAt").notNull(),
  // unlockAt - daysBefore
  sentAt: timestamp("sentAt"),
  // 送信済みならセット
  // ステータス
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  // pending, sent, failed
  lastError: text("lastError"),
  // メタデータ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var letterShareTokens = mysqlTable("letter_share_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  letterId: int("letterId").notNull(),
  // ステータス: active（有効）, revoked（無効化）, rotated（置換済み）
  status: varchar("status", { length: 20 }).default("active").notNull(),
  // 置換時の新トークン（rotated時のみ）
  replacedByToken: varchar("replacedByToken", { length: 64 }),
  // 失効理由（任意）
  revokeReason: varchar("revokeReason", { length: 255 }),
  // アクセス統計
  viewCount: int("viewCount").default(0).notNull(),
  lastAccessedAt: timestamp("lastAccessedAt"),
  // タイムスタンプ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt")
});

// server/db.ts
init_env();
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateUserNotificationEmail(userId, notificationEmail) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(users).set({ notificationEmail }).where(eq(users.id, userId));
}
async function updateUserEmail(userId, newEmail) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(users).set({ email: newEmail }).where(eq(users.id, userId));
}
async function createLetter(letter) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(letters).values(letter);
  return result[0].insertId;
}
async function getLetterById(id) {
  const db = await getDb();
  if (!db) {
    return void 0;
  }
  const result = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getLettersByAuthor(authorId) {
  const db = await getDb();
  if (!db) {
    return [];
  }
  return await db.select().from(letters).where(eq(letters.authorId, authorId)).orderBy(desc(letters.createdAt));
}
async function updateLetter(id, updates) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(letters).set(updates).where(eq(letters.id, id));
}
async function deleteLetter(id) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(letters).where(eq(letters.id, id));
}
async function getLetterByShareToken(shareToken) {
  const db = await getDb();
  if (!db) {
    return void 0;
  }
  const result = await db.select().from(letters).where(eq(letters.shareToken, shareToken)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateLetterShareToken(id, shareToken) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(letters).set({ shareToken }).where(eq(letters.id, id));
}
async function incrementViewCount(id) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const letter = await getLetterById(id);
  if (letter) {
    await db.update(letters).set({
      viewCount: letter.viewCount + 1,
      lastViewedAt: /* @__PURE__ */ new Date()
    }).where(eq(letters.id, id));
  }
}
async function unlockLetter(id) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.update(letters).set({
    isUnlocked: true,
    unlockedAt: /* @__PURE__ */ new Date()
  }).where(and(eq(letters.id, id), eq(letters.isUnlocked, false)));
  return result[0]?.affectedRows > 0;
}
async function getAllTemplates() {
  const db = await getDb();
  if (!db) {
    return [];
  }
  return await db.select().from(templates);
}
async function getTemplateByName(name) {
  const db = await getDb();
  if (!db) {
    return void 0;
  }
  const result = await db.select().from(templates).where(eq(templates.name, name)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function seedTemplates() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot seed templates: database not available");
    return;
  }
  const existingTemplates = await getAllTemplates();
  const existingNames = new Set(existingTemplates.map((t2) => t2.name));
  const defaultTemplates = [
    // === 自由形式（おすすめ） ===
    {
      name: "free-format",
      displayName: "\u81EA\u7531\u5F62\u5F0F",
      subtitle: "\u3042\u306A\u305F\u306E\u8A00\u8449\u3067\u3001\u81EA\u7531\u306B\u60F3\u3044\u3092\u4F1D\u3048\u308B",
      description: "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u306E\u5F62\u5F0F\u306B\u3068\u3089\u308F\u308C\u305A\u3001\u3042\u306A\u305F\u306E\u8A00\u8449\u3067\u81EA\u7531\u306B\u624B\u7D19\u3092\u66F8\u304D\u307E\u3059\u3002\u53E3\u8A9E\u8868\u73FE\u3084\u8A71\u3057\u8A00\u8449\u306E\u6E29\u304B\u3055\u3092\u305D\u306E\u307E\u307E\u6B8B\u3057\u307E\u3059\u3002",
      category: "milestone",
      icon: "edit-3",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u6E29\u304B\u3044\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u8A71\u8005\u306E\u8A00\u8449\u3092\u3067\u304D\u308B\u3060\u3051\u305D\u306E\u307E\u307E\u6D3B\u304B\u3059
- \u53E3\u8A9E\u8868\u73FE\u3084\u8A71\u3057\u8A00\u8449\u306E\u6E29\u304B\u3055\u3092\u4FDD\u6301\u3059\u308B
- \u660E\u3089\u304B\u306A\u8A00\u3044\u9593\u9055\u3044\u3084\u91CD\u8907\u306E\u307F\u4FEE\u6B63
- \u9577\u3055\u306F\u8A71\u8005\u306E\u610F\u56F3\u306B\u5408\u308F\u305B\u308B\uFF08\u5236\u9650\u306A\u3057\uFF09
- \u5F62\u5F0F\u7684\u306A\u6328\u62F6\u6587\u306F\u8FFD\u52A0\u3057\u306A\u3044
- \u8A71\u8005\u306E\u611F\u60C5\u3084\u30CB\u30E5\u30A2\u30F3\u30B9\u3092\u5927\u5207\u306B\u3059\u308B

\u3010\u97F3\u58F5\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u3001\u3042\u306A\u305F\u306E\u8A00\u8449\u3067\u81EA\u7531\u306B\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u65E5\u5E38\u306E\u4F1A\u8A71\u306E\u3088\u3046\u306B\u3001\u601D\u3044\u306E\u307E\u307E\u306B\u3002",
      exampleOneLiner: "\u3042\u306A\u305F\u306E\u8A00\u8449\u3067\u3001\u81EA\u7531\u306B\u60F3\u3044\u3092\u4F1D\u3048\u308B",
      isRecommended: true,
      sortOrder: 1
    },
    {
      name: "raw-transcription",
      displayName: "\u6587\u5B57\u8D77\u3053\u3057\u305D\u306E\u307E\u307E",
      subtitle: "\u9332\u97F3\u3057\u305F\u8A00\u8449\u3092100%\u305D\u306E\u307E\u307E\u6B8B\u3059",
      description: "AI\u306B\u3088\u308B\u6574\u5F62\u3092\u4E00\u5207\u884C\u308F\u305A\u3001\u6587\u5B57\u8D77\u3053\u3057\u7D50\u679C\u3092\u305D\u306E\u307E\u307E\u624B\u7D19\u306B\u3057\u307E\u3059\u3002\u8A00\u3044\u9593\u9055\u3044\u3084\u300C\u3048\u30FC\u3068\u300D\u306A\u3069\u306E\u30D5\u30A3\u30E9\u30FC\u3082\u542B\u3081\u3066\u3001\u3042\u306A\u305F\u306E\u58F0\u3092\u5B8C\u5168\u306B\u4FDD\u5B58\u3057\u307E\u3059\u3002",
      category: "milestone",
      icon: "mic-2",
      prompt: `\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3001\u4E00\u5207\u5909\u66F4\u305B\u305A\u306B\u305D\u306E\u307E\u307E\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u91CD\u8981\u306A\u30EB\u30FC\u30EB\u3011
- \u6587\u5B57\u8D77\u3053\u3057\u306E\u5185\u5BB9\u3092\u4E00\u5207\u5909\u66F4\u3057\u306A\u3044
- \u4FEE\u6B63\u3001\u8FFD\u52A0\u3001\u524A\u9664\u306F\u884C\u308F\u306A\u3044
- \u6587\u7AE0\u3068\u3057\u3066\u306E\u6574\u5F62\u3082\u4E00\u5207\u884C\u308F\u306A\u3044
- \u305D\u306E\u307E\u307E\u306E\u5F62\u3067\u51FA\u529B\u3059\u308B

\u3010\u97F3\u58F5\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u3001\u601D\u3044\u306E\u307E\u307E\u306B\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u9332\u97F3\u3057\u305F\u8A00\u8449\u304C\u305D\u306E\u307E\u307E\u624B\u7D19\u306B\u306A\u308A\u307E\u3059\u3002",
      exampleOneLiner: "\u9332\u97F3\u3057\u305F\u8A00\u8449\u3092100%\u305D\u306E\u307E\u307E\u6B8B\u3059",
      isRecommended: true,
      sortOrder: 2
    },
    // === 幼少期 === 
    {
      name: "10years",
      displayName: "10\u6B73\u306E\u8A95\u751F\u65E5\u306B",
      description: "\u4E8C\u6841\u306E\u5E74\u9F62\u3092\u8FCE\u3048\u308B\u7BC0\u76EE\u306E\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u300110\u6B73\u306E\u8A95\u751F\u65E5\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u6E29\u304B\u3044\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u89AA\u306E\u611B\u60C5\u304C\u4F1D\u308F\u308B\u6E29\u304B\u3044\u6587\u4F53\u3067
- 10\u5E74\u9593\u306E\u6210\u9577\u3092\u632F\u308A\u8FD4\u308A\u3001\u559C\u3073\u3092\u4F1D\u3048\u308B
- \u3053\u308C\u304B\u3089\u306E10\u5E74\u3078\u306E\u671F\u5F85\u3068\u5FDC\u63F4
- \u305F\u3068\u3048\u89AA\u304C\u305D\u3070\u306B\u3044\u306A\u304F\u3066\u3082\u3001\u3053\u306E\u60F3\u3044\u306F\u5909\u308F\u3089\u306A\u3044\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "10\u6B73\u306B\u306A\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u751F\u307E\u308C\u3066\u304D\u3066\u304F\u308C\u305F\u559C\u3073\u3001\u6210\u9577\u306E\u601D\u3044\u51FA\u3001\u3053\u308C\u304B\u3089\u306E\u9858\u3044\u306A\u3069\u3002",
      exampleOneLiner: "10\u5E74\u9593\u3001\u6BCE\u65E5\u304C\u5B9D\u7269\u3060\u3063\u305F\u3088\u3002",
      icon: "cake"
    },
    // === 小学校 ===
    {
      name: "elementary-graduation",
      displayName: "\u5C0F\u5B66\u6821\u5352\u696D\u306E\u65E5\u306B",
      description: "6\u5E74\u9593\u306E\u6210\u9577\u3092\u795D\u3046\u9580\u51FA\u306E\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u5C0F\u5B66\u6821\u5352\u696D\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- 6\u5E74\u9593\u306E\u6210\u9577\u3092\u632F\u308A\u8FD4\u308A\u3001\u8A87\u308A\u306B\u601D\u3046\u6C17\u6301\u3061
- \u5165\u5B66\u5F0F\u306E\u65E5\u306E\u3053\u3068\u3001\u5FD8\u308C\u3089\u308C\u306A\u3044\u601D\u3044\u51FA
- \u4E2D\u5B66\u751F\u3068\u3044\u3046\u65B0\u3057\u3044\u30B9\u30C6\u30FC\u30B8\u3078\u306E\u5FDC\u63F4
- \u3069\u3093\u306A\u3068\u304D\u3082\u5473\u65B9\u3060\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u5C0F\u5B66\u6821\u3092\u5352\u696D\u3059\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u30026\u5E74\u9593\u306E\u601D\u3044\u51FA\u3001\u6210\u9577\u3078\u306E\u559C\u3073\u3001\u4E2D\u5B66\u751F\u306B\u306A\u308B\u5B50\u3078\u306E\u30A8\u30FC\u30EB\u306A\u3069\u3002",
      exampleOneLiner: "\u30E9\u30F3\u30C9\u30BB\u30EB\u304C\u5C0F\u3055\u304F\u898B\u3048\u308B\u3088\u3046\u306B\u306A\u3063\u305F\u306D\u3002",
      icon: "graduation-cap"
    },
    // === 中学校 ===
    {
      name: "junior-high-entrance",
      displayName: "\u4E2D\u5B66\u5165\u5B66\u306E\u65E5\u306B",
      description: "\u65B0\u3057\u3044\u5236\u670D\u306B\u8896\u3092\u901A\u3059\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u4E2D\u5B66\u5165\u5B66\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u65B0\u3057\u3044\u74B0\u5883\u3078\u306E\u4E0D\u5B89\u3092\u548C\u3089\u3052\u308B\u6E29\u304B\u3044\u8A00\u8449
- \u65B0\u3057\u3044\u53CB\u9054\u3001\u65B0\u3057\u3044\u7D4C\u9A13\u3078\u306E\u671F\u5F85
- \u601D\u6625\u671F\u306E\u59CB\u307E\u308A\u3001\u60A9\u307F\u304C\u3042\u3063\u3066\u3082\u5927\u4E08\u592B\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- \u3044\u3064\u3067\u3082\u8A71\u3092\u805E\u304F\u3088\u3068\u3044\u3046\u5B89\u5FC3\u611F
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u4E2D\u5B66\u751F\u306B\u306A\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u65B0\u3057\u3044\u74B0\u5883\u3078\u306E\u5FDC\u63F4\u3001\u601D\u6625\u671F\u3092\u8FCE\u3048\u308B\u5B50\u3078\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u306A\u3069\u3002",
      exampleOneLiner: "\u5236\u670D\u59FF\u3001\u307E\u3076\u3057\u304F\u3066\u6D99\u304C\u51FA\u305D\u3046\u3060\u3088\u3002",
      icon: "school"
    },
    {
      name: "junior-high-graduation",
      displayName: "\u4E2D\u5B66\u5352\u696D\u306E\u65E5\u306B",
      description: "\u7FA9\u52D9\u6559\u80B2\u3092\u7D42\u3048\u3001\u81EA\u5206\u306E\u9053\u3092\u9078\u3076\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u4E2D\u5B66\u5352\u696D\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u7FA9\u52D9\u6559\u80B2\u3092\u7D42\u3048\u305F\u3053\u3068\u3078\u306E\u795D\u798F
- \u81EA\u5206\u3067\u9032\u8DEF\u3092\u9078\u3093\u3060\u3053\u3068\u3078\u306E\u8A87\u308A
- \u3053\u308C\u304B\u3089\u306E\u9053\u306F\u81EA\u5206\u3067\u5207\u308A\u62D3\u304F\u3068\u3044\u3046\u30A8\u30FC\u30EB
- \u3069\u3093\u306A\u9078\u629E\u3082\u5FDC\u63F4\u3059\u308B\u3068\u3044\u3046\u7121\u6761\u4EF6\u306E\u611B
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u4E2D\u5B66\u3092\u5352\u696D\u3059\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u30023\u5E74\u9593\u306E\u6210\u9577\u3001\u9032\u8DEF\u3092\u9078\u3093\u3060\u3053\u3068\u3078\u306E\u60F3\u3044\u306A\u3069\u3002",
      exampleOneLiner: "\u81EA\u5206\u3067\u9078\u3093\u3060\u9053\u3001\u80F8\u3092\u5F35\u3063\u3066\u6B69\u3044\u3066\u306D\u3002",
      icon: "graduation-cap"
    },
    // === 高校 ===
    {
      name: "high-school-entrance",
      displayName: "\u9AD8\u6821\u5165\u5B66\u306E\u65E5\u306B",
      description: "\u53D7\u9A13\u3092\u4E57\u308A\u8D8A\u3048\u3001\u65B0\u3057\u3044\u30B9\u30BF\u30FC\u30C8\u3092\u5207\u308B\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u9AD8\u6821\u5165\u5B66\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u53D7\u9A13\u3092\u4E57\u308A\u8D8A\u3048\u305F\u52AA\u529B\u3092\u8A8D\u3081\u308B
- \u9AD8\u6821\u751F\u6D3B\u3078\u306E\u671F\u5F85\u3068\u5FDC\u63F4
- \u591A\u304F\u306E\u7D4C\u9A13\u3092\u3057\u3066\u307B\u3057\u3044\u3068\u3044\u3046\u9858\u3044
- \u5931\u6557\u3057\u3066\u3082\u5927\u4E08\u592B\u3001\u3044\u3064\u3067\u3082\u5E30\u308B\u5834\u6240\u304C\u3042\u308B\u3068\u3044\u3046\u5B89\u5FC3\u611F
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u9AD8\u6821\u751F\u306B\u306A\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u53D7\u9A13\u3078\u306E\u52AA\u529B\u3001\u9AD8\u6821\u751F\u6D3B\u3078\u306E\u671F\u5F85\u306A\u3069\u3002",
      exampleOneLiner: "\u53D7\u9A13\u52C9\u5F37\u3001\u672C\u5F53\u306B\u9811\u5F35\u3063\u305F\u306D\u3002",
      icon: "school"
    },
    {
      name: "high-school-graduation",
      displayName: "\u9AD8\u6821\u5352\u696D\u306E\u65E5\u306B",
      description: "\u5927\u4EBA\u3078\u306E\u6249\u3092\u958B\u304F\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u9AD8\u6821\u5352\u696D\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- 18\u5E74\u9593\u306E\u6210\u9577\u3092\u632F\u308A\u8FD4\u308A\u3001\u611F\u8B1D\u3092\u4F1D\u3048\u308B
- \u3053\u308C\u304B\u3089\u306F\u81EA\u5206\u306E\u8DB3\u3067\u6B69\u3080\u3068\u3044\u3046\u30A8\u30FC\u30EB
- \u89AA\u3068\u3057\u3066\u306E\u8A87\u308A\u3068\u4FE1\u983C
- \u305F\u3068\u3048\u96E2\u308C\u3066\u3044\u3066\u3082\u3001\u3044\u3064\u3082\u5FDC\u63F4\u3057\u3066\u3044\u308B\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u9AD8\u6821\u3092\u5352\u696D\u3059\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u30023\u5E74\u9593\u306E\u601D\u3044\u51FA\u3001\u3053\u308C\u304B\u3089\u306E\u4EBA\u751F\u3078\u306E\u30A8\u30FC\u30EB\u306A\u3069\u3002",
      exampleOneLiner: "\u7ACB\u6D3E\u306A\u5927\u4EBA\u306B\u306A\u3063\u305F\u306D\u3002\u8A87\u308A\u306B\u601D\u3046\u3088\u3002",
      icon: "graduation-cap"
    },
    // === 大学・専門学校 ===
    {
      name: "university-entrance",
      displayName: "\u5927\u5B66\u5165\u5B66\u306E\u65E5\u306B",
      description: "\u65B0\u3057\u3044\u5B66\u3073\u306E\u5834\u6240\u3067\u7FBD\u3070\u305F\u304F\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u5927\u5B66\u5165\u5B66\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u53D7\u9A13\u3092\u4E57\u308A\u8D8A\u3048\u305F\u52AA\u529B\u3078\u306E\u79F0\u8CDB
- \u4E00\u4EBA\u66AE\u3089\u3057\u3084\u65B0\u751F\u6D3B\u3078\u306E\u5FDC\u63F4
- \u591A\u304F\u306E\u4EBA\u3068\u51FA\u4F1A\u3044\u3001\u591A\u304F\u306E\u7D4C\u9A13\u3092\u3057\u3066\u307B\u3057\u3044
- \u56F0\u3063\u305F\u3068\u304D\u306F\u3044\u3064\u3067\u3082\u9023\u7D61\u3057\u3066\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u5927\u5B66\u751F\u306B\u306A\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u65B0\u751F\u6D3B\u3078\u306E\u5FDC\u63F4\u3001\u5B66\u3073\u3078\u306E\u671F\u5F85\u306A\u3069\u3002",
      exampleOneLiner: "\u305F\u304F\u3055\u3093\u306E\u4EBA\u3068\u51FA\u4F1A\u3063\u3066\u3001\u305F\u304F\u3055\u3093\u306E\u7D4C\u9A13\u3092\u3057\u3066\u306D\u3002",
      icon: "book-open"
    },
    // === 成人 ===
    {
      name: "coming-of-age",
      displayName: "\u6210\u4EBA\u306E\u65E5\u306B",
      description: "18\u6B73\u3001\u5927\u4EBA\u3068\u3057\u3066\u306E\u7B2C\u4E00\u6B69\u3092\u8E0F\u307F\u51FA\u3059\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u6210\u4EBA\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- 18\u5E74\u9593\u306E\u6210\u9577\u3092\u632F\u308A\u8FD4\u308A\u3001\u611F\u8B1D\u3068\u795D\u798F\u3092\u4F1D\u3048\u308B
- \u5927\u4EBA\u3068\u3057\u3066\u306E\u8CAC\u4EFB\u3068\u81EA\u7531\u306B\u3064\u3044\u3066
- \u89AA\u304B\u3089\u5B50\u3078\u306E\u4EBA\u751F\u306E\u6559\u8A13\u3084\u30A2\u30C9\u30D0\u30A4\u30B9
- \u3053\u308C\u304B\u3089\u3082\u305A\u3063\u3068\u5FDC\u63F4\u3057\u3066\u3044\u308B\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u6210\u4EBA\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u751F\u307E\u308C\u3066\u304B\u3089\u306E18\u5E74\u9593\u306E\u601D\u3044\u51FA\u3001\u5927\u4EBA\u3068\u3057\u3066\u306E\u30A8\u30FC\u30EB\u306A\u3069\u3002",
      exampleOneLiner: "\u304A\u3081\u3067\u3068\u3046\u3002\u7ACB\u6D3E\u306A\u5927\u4EBA\u306B\u306A\u3063\u305F\u306D\u3002",
      icon: "star"
    },
    // === 就職 ===
    {
      name: "first-job",
      displayName: "\u5C31\u8077\u306E\u65E5\u306B",
      description: "\u793E\u4F1A\u4EBA\u3068\u3057\u3066\u306E\u7B2C\u4E00\u6B69\u3092\u8E0F\u307F\u51FA\u3059\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u5C31\u8077\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u793E\u4F1A\u4EBA\u3068\u3057\u3066\u306E\u9580\u51FA\u3092\u795D\u798F
- \u4ED5\u4E8B\u306E\u5927\u5909\u3055\u3068\u3084\u308A\u304C\u3044\u306B\u3064\u3044\u3066
- \u89AA\u81EA\u8EAB\u306E\u793E\u4F1A\u4EBA\u7D4C\u9A13\u304B\u3089\u306E\u30A2\u30C9\u30D0\u30A4\u30B9
- \u8F9B\u3044\u3068\u304D\u306F\u7121\u7406\u3057\u306A\u3044\u3067\u3001\u3044\u3064\u3067\u3082\u5E30\u3063\u3066\u304D\u3066\u3044\u3044\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u793E\u4F1A\u4EBA\u306B\u306A\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4ED5\u4E8B\u3078\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\u3001\u5FDC\u63F4\u306E\u6C17\u6301\u3061\u306A\u3069\u3002",
      exampleOneLiner: "\u81EA\u5206\u306E\u529B\u3067\u7A3C\u3050\u3063\u3066\u3001\u3059\u3054\u3044\u3053\u3068\u3060\u3088\u3002",
      icon: "briefcase"
    },
    // === 恋愛・結婚 ===
    {
      name: "first-love",
      displayName: "\u6700\u521D\u306B\u604B\u3092\u3057\u305F\u65E5\u306B",
      description: "\u604B\u3092\u77E5\u3063\u305F\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u604B\u3092\u7D4C\u9A13\u3057\u305F\u5B50\u3069\u3082\u3078\u306E\u6E29\u304B\u3044\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u604B\u611B\u3068\u3044\u3046\u65B0\u3057\u3044\u611F\u60C5\u3092\u80AF\u5B9A\u3059\u308B\u5185\u5BB9
- \u50B7\u3064\u304F\u3053\u3068\u3082\u3042\u308B\u3051\u3069\u5927\u4E08\u592B\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- \u89AA\u3082\u540C\u3058\u7D4C\u9A13\u3092\u3057\u305F\u3068\u3044\u3046\u5171\u611F
- \u81EA\u5206\u3092\u5927\u5207\u306B\u3057\u3066\u307B\u3057\u3044\u3068\u3044\u3046\u9858\u3044
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u604B\u3092\u77E5\u3063\u305F\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u81EA\u5206\u306E\u7D4C\u9A13\u3001\u30A2\u30C9\u30D0\u30A4\u30B9\u3001\u5FDC\u63F4\u306E\u6C17\u6301\u3061\u306A\u3069\u3002",
      exampleOneLiner: "\u305D\u306E\u6C17\u6301\u3061\u3001\u5927\u5207\u306B\u3057\u3066\u306D\u3002",
      icon: "heart"
    },
    {
      name: "wedding-day",
      displayName: "\u7D50\u5A5A\u3059\u308B\u65E5\u306B",
      description: "\u4EBA\u751F\u306E\u4F34\u4FB6\u3092\u898B\u3064\u3051\u305F\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u7D50\u5A5A\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u7D50\u5A5A\u3078\u306E\u795D\u798F\u3068\u559C\u3073
- \u5B50\u3069\u3082\u3092\u80B2\u3066\u3066\u304D\u305F\u65E5\u3005\u306E\u601D\u3044\u51FA
- \u7D50\u5A5A\u751F\u6D3B\u3078\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\uFF08\u89AA\u81EA\u8EAB\u306E\u7D4C\u9A13\u304B\u3089\uFF09
- \u65B0\u3057\u3044\u5BB6\u65CF\u3078\u306E\u795D\u798F\u3068\u3001\u3053\u308C\u304B\u3089\u3082\u898B\u5B88\u3063\u3066\u3044\u308B\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u7D50\u5A5A\u3059\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u795D\u798F\u306E\u8A00\u8449\u3001\u7D50\u5A5A\u751F\u6D3B\u3078\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\u306A\u3069\u3002",
      exampleOneLiner: "\u5E78\u305B\u306B\u306A\u3063\u3066\u306D\u3002\u305A\u3063\u3068\u898B\u5B88\u3063\u3066\u308B\u3088\u3002",
      icon: "heart"
    },
    // === 親になる ===
    {
      name: "becoming-parent",
      displayName: "\u5B50\u3069\u3082\u304C\u751F\u307E\u308C\u305F\u65E5\u306B",
      description: "\u81EA\u5206\u3082\u89AA\u306B\u306A\u308B\u65E5\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u81EA\u5206\u3082\u89AA\u306B\u306A\u3063\u305F\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u5B6B\u306E\u8A95\u751F\u3078\u306E\u559C\u3073\u3068\u795D\u798F
- \u81EA\u5206\u304C\u89AA\u306B\u306A\u3063\u305F\u3068\u304D\u306E\u6C17\u6301\u3061\u3092\u601D\u3044\u51FA\u3059
- \u5B50\u80B2\u3066\u306E\u5927\u5909\u3055\u3068\u559C\u3073\u306B\u3064\u3044\u3066
- \u3044\u3064\u3067\u3082\u52A9\u3051\u306B\u306A\u308B\u3088\u3001\u4E00\u7DD2\u306B\u80B2\u3066\u3088\u3046\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u89AA\u306B\u306A\u3063\u305F\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5B6B\u306E\u8A95\u751F\u3078\u306E\u559C\u3073\u3001\u5B50\u80B2\u3066\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\u306A\u3069\u3002",
      exampleOneLiner: "\u304A\u3081\u3067\u3068\u3046\u3002\u3042\u306A\u305F\u306A\u3089\u7D20\u6575\u306A\u89AA\u306B\u306A\u308C\u308B\u3088\u3002",
      icon: "baby"
    },
    // === 特別な日 ===
    {
      name: "difficult-times",
      displayName: "\u8F9B\u3044\u3068\u304D\u306B\u8AAD\u3093\u3067",
      description: "\u4EBA\u751F\u306E\u58C1\u306B\u3076\u3064\u304B\u3063\u305F\u3068\u304D\u306B",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u8F9B\u3044\u3068\u304D\u306B\u8AAD\u3093\u3067\u307B\u3057\u3044\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u8F9B\u3044\u6642\u671F\u3092\u4E57\u308A\u8D8A\u3048\u308B\u52C7\u6C17\u3092\u4E0E\u3048\u308B
- \u89AA\u81EA\u8EAB\u3082\u8F9B\u3044\u6642\u671F\u304C\u3042\u3063\u305F\u3068\u3044\u3046\u5171\u611F
- \u7121\u7406\u3057\u306A\u304F\u3066\u3044\u3044\u3001\u9003\u3052\u3066\u3082\u3044\u3044\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- \u3069\u3093\u306A\u3068\u304D\u3082\u5473\u65B9\u3060\u3068\u3044\u3046\u7121\u6761\u4EF6\u306E\u611B
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u8F9B\u3044\u3068\u304D\u306E\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u52B1\u307E\u3057\u306E\u8A00\u8449\u3001\u81EA\u5206\u306E\u7D4C\u9A13\u306A\u3069\u3002",
      exampleOneLiner: "\u5927\u4E08\u592B\u3002\u3042\u306A\u305F\u306F\u4E00\u4EBA\u3058\u3083\u306A\u3044\u3088\u3002",
      icon: "hand-heart"
    },
    {
      name: "someday",
      displayName: "\u3044\u3064\u304B\u8AAD\u3093\u3067\u307B\u3057\u3044\u624B\u7D19",
      description: "\u7279\u5B9A\u306E\u65E5\u3067\u306F\u306A\u304F\u3001\u3044\u3064\u304B\u5C4A\u3051\u305F\u3044\u60F3\u3044",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u3044\u3064\u304B\u5B50\u3069\u3082\u306B\u8AAD\u3093\u3067\u307B\u3057\u3044\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u7279\u5B9A\u306E\u30A4\u30D9\u30F3\u30C8\u306B\u7E1B\u3089\u308C\u306A\u3044\u3001\u666E\u904D\u7684\u306A\u89AA\u306E\u60F3\u3044
- \u5B50\u3069\u3082\u3078\u306E\u611B\u60C5\u3068\u611F\u8B1D
- \u4EBA\u751F\u3067\u5927\u5207\u306B\u3057\u3066\u307B\u3057\u3044\u3053\u3068
- \u305F\u3068\u3048\u89AA\u304C\u3044\u306A\u304F\u306A\u3063\u3066\u3082\u3001\u3053\u306E\u60F3\u3044\u306F\u6C38\u9060\u306B\u5909\u308F\u3089\u306A\u3044\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u60F3\u3044\u3092\u300190\u79D2\u3067\u81EA\u7531\u306B\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u611B\u60C5\u3001\u611F\u8B1D\u3001\u4EBA\u751F\u306E\u6559\u8A13\u306A\u3069\u3002",
      exampleOneLiner: "\u3042\u306A\u305F\u306E\u3053\u3068\u3092\u3001\u305A\u3063\u3068\u611B\u3057\u3066\u3044\u308B\u3088\u3002",
      icon: "mail"
    }
  ];
  const templatesToAdd = defaultTemplates.filter((t2) => !existingNames.has(t2.name));
  if (templatesToAdd.length === 0) {
    console.log("[Database] All templates already exist, skipping seed");
    return;
  }
  for (const template of templatesToAdd) {
    await db.insert(templates).values(template);
  }
  console.log(`[Database] Added ${templatesToAdd.length} new templates: ${templatesToAdd.map((t2) => t2.name).join(", ")}`);
}
async function createDraft(draft) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(drafts).values(draft);
  return result[0].insertId;
}
async function getDraftsByUser(userId) {
  const db = await getDb();
  if (!db) {
    return [];
  }
  return await db.select().from(drafts).where(eq(drafts.userId, userId)).orderBy(desc(drafts.updatedAt));
}
async function updateDraft(id, updates) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(drafts).set(updates).where(eq(drafts.id, id));
}
async function deleteDraft(id) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(drafts).where(eq(drafts.id, id));
}
async function getDraftByUserAndId(userId, draftId) {
  const db = await getDb();
  if (!db) {
    return void 0;
  }
  const result = await db.select().from(drafts).where(and(eq(drafts.id, draftId), eq(drafts.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getRemindersByLetterId(letterId) {
  const db = await getDb();
  if (!db) {
    return [];
  }
  return await db.select().from(letterReminders).where(eq(letterReminders.letterId, letterId)).orderBy(letterReminders.daysBefore);
}
async function getPendingReminders(limit = 100) {
  const db = await getDb();
  if (!db) {
    return [];
  }
  const now = /* @__PURE__ */ new Date();
  const reminders = await db.select().from(letterReminders).where(and(
    eq(letterReminders.status, "pending")
    // scheduledAt <= now
  )).limit(limit);
  const filteredReminders = reminders.filter((r) => r.scheduledAt <= now);
  const result = await Promise.all(filteredReminders.map(async (reminder) => {
    const letter = await db.select().from(letters).where(eq(letters.id, reminder.letterId)).limit(1);
    const user = await db.select({
      email: users.email,
      notificationEmail: users.notificationEmail
    }).from(users).where(eq(users.id, reminder.ownerUserId)).limit(1);
    return {
      ...reminder,
      letter: letter[0] || null,
      user: user[0] || null
    };
  }));
  return result;
}
async function markReminderAsSent(reminderId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.update(letterReminders).set({
    sentAt: /* @__PURE__ */ new Date(),
    status: "sent"
  }).where(and(
    eq(letterReminders.id, reminderId),
    eq(letterReminders.status, "pending")
  ));
  return (result[0].affectedRows ?? 0) > 0;
}
async function markReminderAsFailed(reminderId, error) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(letterReminders).set({
    status: "failed",
    lastError: error
  }).where(eq(letterReminders.id, reminderId));
}
async function updateLetterReminders(letterId, ownerUserId, unlockAt, daysBeforeList) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const existingReminders = await db.select().from(letterReminders).where(eq(letterReminders.letterId, letterId));
  const sentReminders = existingReminders.filter((r) => r.status === "sent");
  const sentDaysBefore = new Set(sentReminders.map((r) => r.daysBefore));
  await db.delete(letterReminders).where(and(
    eq(letterReminders.letterId, letterId),
    eq(letterReminders.status, "pending")
  ));
  for (const daysBefore of daysBeforeList) {
    if (sentDaysBefore.has(daysBefore)) {
      continue;
    }
    const scheduledAt = new Date(unlockAt.getTime() - daysBefore * 24 * 60 * 60 * 1e3);
    if (scheduledAt <= /* @__PURE__ */ new Date()) {
      continue;
    }
    await db.insert(letterReminders).values({
      letterId,
      ownerUserId,
      type: "before_unlock",
      daysBefore,
      scheduledAt,
      status: "pending"
    });
  }
}
async function deleteRemindersByLetterId(letterId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(letterReminders).where(eq(letterReminders.letterId, letterId));
}
async function getShareTokenRecord(token) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.select().from(letterShareTokens).where(eq(letterShareTokens.token, token)).limit(1);
  return result[0];
}
async function getActiveShareToken(letterId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.select().from(letterShareTokens).where(and(
    eq(letterShareTokens.letterId, letterId),
    eq(letterShareTokens.status, "active")
  )).limit(1);
  return result[0];
}
async function createShareToken(letterId, token) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const existingActive = await getActiveShareToken(letterId);
  if (existingActive) {
    await db.update(letterShareTokens).set({
      status: "rotated",
      revokedAt: /* @__PURE__ */ new Date(),
      replacedByToken: token
    }).where(eq(letterShareTokens.id, existingActive.id));
  }
  await db.insert(letterShareTokens).values({
    token,
    letterId,
    status: "active",
    viewCount: 0
  });
  return { success: true, token };
}
async function revokeShareToken(letterId, reason) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const activeToken = await getActiveShareToken(letterId);
  if (!activeToken) {
    return { success: true, wasActive: false };
  }
  await db.update(letterShareTokens).set({
    status: "revoked",
    revokedAt: /* @__PURE__ */ new Date(),
    revokeReason: reason || null
  }).where(and(
    eq(letterShareTokens.id, activeToken.id),
    eq(letterShareTokens.status, "active")
  ));
  return { success: true, wasActive: true };
}
async function rotateShareToken(letterId, newToken) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const activeToken = await getActiveShareToken(letterId);
  if (activeToken) {
    await db.update(letterShareTokens).set({
      status: "rotated",
      revokedAt: /* @__PURE__ */ new Date(),
      replacedByToken: newToken
    }).where(and(
      eq(letterShareTokens.id, activeToken.id),
      eq(letterShareTokens.status, "active")
    ));
  }
  await createShareToken(letterId, newToken);
  return {
    success: true,
    newToken,
    oldToken: activeToken?.token
  };
}
async function incrementShareTokenViewCount(token) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const tokenRecord = await getShareTokenRecord(token);
  if (!tokenRecord) return;
  await db.update(letterShareTokens).set({
    viewCount: tokenRecord.viewCount + 1,
    lastAccessedAt: /* @__PURE__ */ new Date()
  }).where(eq(letterShareTokens.token, token));
}
async function migrateShareTokenIfNeeded(letterId, legacyToken) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const existingActive = await getActiveShareToken(letterId);
  if (existingActive) return;
  const existingToken = await getShareTokenRecord(legacyToken);
  if (existingToken) return;
  await createShareToken(letterId, legacyToken);
}
async function regenerateUnlockCode(letterId, newEnvelope) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(letters).set({
    wrappedClientShare: newEnvelope.wrappedClientShare,
    wrappedClientShareIv: newEnvelope.wrappedClientShareIv,
    wrappedClientShareSalt: newEnvelope.wrappedClientShareSalt,
    wrappedClientShareKdf: newEnvelope.wrappedClientShareKdf,
    wrappedClientShareKdfIters: newEnvelope.wrappedClientShareKdfIters,
    unlockCodeRegeneratedAt: /* @__PURE__ */ new Date()
  }).where(eq(letters.id, letterId));
  return true;
}

// server/_core/llm.ts
init_env();
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
function convertToGeminiFormat(messages) {
  let systemInstruction;
  const contents = [];
  for (const message of messages) {
    const contentParts = ensureArray(message.content).map(normalizeContentPart);
    if (message.role === "system") {
      const textParts = contentParts.filter((p) => p.type === "text").map((p) => ({ text: p.text }));
      systemInstruction = { parts: textParts };
      continue;
    }
    const geminiRole = message.role === "assistant" ? "model" : "user";
    const parts = [];
    for (const part of contentParts) {
      if (part.type === "text") {
        parts.push({ text: part.text });
      } else if (part.type === "image_url") {
        const url = part.image_url.url;
        if (url.startsWith("data:")) {
          const [header, data] = url.split(",");
          const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
          parts.push({ inlineData: { mimeType, data } });
        } else {
          parts.push({ text: `[Image: ${url}]` });
        }
      }
    }
    if (parts.length > 0) {
      contents.push({ role: geminiRole, parts });
    }
  }
  return { systemInstruction, contents };
}
function convertFromGeminiResponse(geminiResponse, model) {
  const candidate = geminiResponse.candidates?.[0];
  const content = candidate?.content;
  const text2 = content?.parts?.map((p) => p.text || "").join("") || "";
  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1e3),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text2
        },
        finish_reason: candidate?.finishReason || "stop"
      }
    ],
    usage: geminiResponse.usageMetadata ? {
      prompt_tokens: geminiResponse.usageMetadata.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata.totalTokenCount || 0
    } : void 0
  };
}
var assertApiKey = () => {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
};
async function invokeLLM(params) {
  assertApiKey();
  const { messages, maxTokens, max_tokens } = params;
  const model = "gemini-2.0-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.geminiApiKey}`;
  const { systemInstruction, contents } = convertToGeminiFormat(messages);
  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens || max_tokens || 8192,
      temperature: 0.7
    }
  };
  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  const geminiResponse = await response.json();
  return convertFromGeminiResponse(geminiResponse, model);
}

// server/_core/voiceTranscription.ts
init_env();
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = response2.headers.get("content-type") || "audio/mpeg";
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish"
  };
  return langMap[langCode] || langCode;
}

// server/storage.ts
init_env();
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/routers.ts
import { nanoid } from "nanoid";

// server/opentimestamps.ts
var OTS_CALENDAR_URLS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com"
];
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
async function submitToCalendar(hash) {
  const hashBytes = hexToBytes(hash);
  for (const calendarUrl of OTS_CALENDAR_URLS) {
    try {
      const response = await fetch(`${calendarUrl}/digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/vnd.opentimestamps.v1"
        },
        body: Buffer.from(hashBytes)
      });
      if (response.ok) {
        const otsData = new Uint8Array(await response.arrayBuffer());
        return { success: true, otsData };
      }
    } catch (error) {
      console.warn(`[OTS] Failed to submit to ${calendarUrl}:`, error);
      continue;
    }
  }
  return { success: false, error: "All calendar servers failed" };
}
async function saveOtsFile(letterId, otsData) {
  const key = `ots/${letterId}-${Date.now()}.ots`;
  const buffer = Buffer.from(otsData);
  const result = await storagePut(key, buffer, "application/octet-stream");
  return result;
}
async function stampHash(hash, letterId) {
  try {
    const result = await submitToCalendar(hash);
    if (!result.success || !result.otsData) {
      return { success: false, error: result.error };
    }
    const { url } = await saveOtsFile(letterId, result.otsData);
    return {
      success: true,
      otsFileUrl: url
    };
  } catch (error) {
    console.error("[OTS] Stamp error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
function generateProofInfo(hash, otsStatus, otsSubmittedAt, otsConfirmedAt) {
  const hashShort = `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  let statusLabel;
  let statusDescription;
  switch (otsStatus) {
    case "confirmed":
      statusLabel = "\u2713 Bitcoin\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u3067\u78BA\u8A8D\u6E08\u307F";
      statusDescription = "\u3053\u306E\u624B\u7D19\u306E\u5B58\u5728\u8A3C\u660E\u304CBitcoin\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u306B\u6C38\u4E45\u306B\u8A18\u9332\u3055\u308C\u307E\u3057\u305F\u3002";
      break;
    case "submitted":
      statusLabel = "\u23F3 \u78BA\u8A8D\u5F85\u3061";
      statusDescription = "OpenTimestamps\u306B\u9001\u4FE1\u6E08\u307F\u3002Bitcoin\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u3078\u306E\u8A18\u9332\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\uFF08\u901A\u5E38\u6570\u6642\u9593\u301C1\u65E5\uFF09\u3002";
      break;
    default:
      statusLabel = "\u{1F4DD} \u30ED\u30FC\u30AB\u30EB\u8A3C\u8DE1";
      statusDescription = "\u624B\u7D19\u306E\u30CF\u30C3\u30B7\u30E5\u5024\u304C\u751F\u6210\u3055\u308C\u307E\u3057\u305F\u3002\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u3078\u306E\u523B\u5370\u306F\u51E6\u7406\u4E2D\u3067\u3059\u3002";
  }
  return {
    hashShort,
    statusLabel,
    statusDescription,
    submittedAt: otsSubmittedAt?.toISOString(),
    confirmedAt: otsConfirmedAt?.toISOString()
  };
}

// server/shamir.ts
import { split, combine } from "shamir-secret-sharing";
function canProvideServerShare(unlockAt) {
  if (!unlockAt) {
    return true;
  }
  const now = /* @__PURE__ */ new Date();
  return now >= unlockAt;
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // ============================================
  // User Settings Router
  // ============================================
  user: router({
    /**
     * 通知先メールを更新
     * 未設定（null）ならアカウントメールを使用
     */
    updateNotificationEmail: protectedProcedure.input(z2.object({
      notificationEmail: z2.string().email().nullable()
    })).mutation(async ({ ctx, input }) => {
      await updateUserNotificationEmail(ctx.user.id, input.notificationEmail);
      return { success: true };
    }),
    /**
     * 現在の設定を取得
     */
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      return {
        notificationEmail: ctx.user.notificationEmail || null,
        accountEmail: ctx.user.email || null
      };
    }),
    /**
     * アカウントメールを変更
     * 注意: 実際の本番環境では確認メール送信が必要
     * 現在は簡易的に即座変更
     */
    updateEmail: protectedProcedure.input(z2.object({
      newEmail: z2.string().email()
    })).mutation(async ({ ctx, input }) => {
      await updateUserEmail(ctx.user.id, input.newEmail);
      return { success: true };
    })
  }),
  // ============================================
  // Template Router
  // ============================================
  template: router({
    list: publicProcedure.query(async () => {
      await seedTemplates();
      return await getAllTemplates();
    }),
    getByName: publicProcedure.input(z2.object({ name: z2.string() })).query(async ({ input }) => {
      return await getTemplateByName(input.name);
    })
  }),
  // ============================================
  // Letter Router（ゼロ知識設計）
  // ============================================
  letter: router({
    /**
     * 手紙作成（ゼロ知識版）
     * 
     * - サーバーには暗号文とメタデータのみ送信
     * - 本文（finalContent）は送信しない
     * - 復号キーは送信しない（クライアント側でShamir分割済み）
     * - serverShareのみサーバーに保存
     */
    create: protectedProcedure.input(z2.object({
      recipientName: z2.string().optional(),
      recipientRelation: z2.string().optional(),
      audioUrl: z2.string().optional(),
      audioDuration: z2.number().optional(),
      templateUsed: z2.string().optional(),
      // 暗号化関連（本文は送らない）
      encryptionIv: z2.string(),
      ciphertextUrl: z2.string(),
      // 証跡
      proofHash: z2.string(),
      // タイムロック
      unlockAt: z2.date().optional(),
      unlockPolicy: z2.string().optional(),
      // Shamir（クライアント分割済み）
      useShamir: z2.boolean().default(true),
      serverShare: z2.string()
      // クライアントで分割済みのserverShare
    })).mutation(async ({ ctx, input }) => {
      const letterId = await createLetter({
        authorId: ctx.user.id,
        recipientName: input.recipientName,
        recipientRelation: input.recipientRelation,
        audioUrl: input.audioUrl,
        audioDuration: input.audioDuration,
        templateUsed: input.templateUsed,
        encryptionIv: input.encryptionIv,
        ciphertextUrl: input.ciphertextUrl,
        proofHash: input.proofHash,
        unlockAt: input.unlockAt,
        unlockPolicy: input.unlockPolicy || "datetime",
        status: "sealed",
        proofCreatedAt: /* @__PURE__ */ new Date(),
        // Shamirシェア（serverShareのみ保存）
        serverShare: input.serverShare,
        useShamir: input.useShamir
      });
      stampHash(input.proofHash, letterId).then(async (result) => {
        if (result.success && result.otsFileUrl) {
          await updateLetter(letterId, {
            otsFileUrl: result.otsFileUrl,
            otsStatus: "submitted",
            otsSubmittedAt: /* @__PURE__ */ new Date()
          });
          console.log(`[OTS] Letter ${letterId} submitted to OpenTimestamps`);
        } else {
          console.warn(`[OTS] Failed to stamp letter ${letterId}:`, result.error);
        }
      }).catch((error) => {
        console.error(`[OTS] Error stamping letter ${letterId}:`, error);
      });
      return { id: letterId };
    }),
    /**
     * 解錠コードで暗号化されたclientShareを保存（封筒設定）
     */
    setUnlockEnvelope: protectedProcedure.input(z2.object({
      id: z2.number(),
      wrappedClientShare: z2.string(),
      wrappedClientShareIv: z2.string(),
      wrappedClientShareSalt: z2.string(),
      wrappedClientShareKdf: z2.string(),
      wrappedClientShareKdfIters: z2.number()
    })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.id);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      await updateLetter(input.id, {
        wrappedClientShare: input.wrappedClientShare,
        wrappedClientShareIv: input.wrappedClientShareIv,
        wrappedClientShareSalt: input.wrappedClientShareSalt,
        wrappedClientShareKdf: input.wrappedClientShareKdf,
        wrappedClientShareKdfIters: input.wrappedClientShareKdfIters
      });
      return { ok: true };
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      const letter = await getLetterById(input.id);
      if (!letter) return null;
      if (letter.authorId !== ctx.user.id) return null;
      return letter;
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getLettersByAuthor(ctx.user.id);
    }),
    cancel: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.id);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      if (letter.isUnlocked) throw new Error("Cannot cancel an unlocked letter");
      await updateLetter(input.id, { status: "canceled" });
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.id);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      await deleteLetter(input.id);
      return { success: true };
    }),
    // 共有リンク生成
    generateShareLink: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.id);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      const existingToken = await getActiveShareToken(input.id);
      if (existingToken) {
        return { shareToken: existingToken.token };
      }
      if (letter.shareToken) {
        await migrateShareTokenIfNeeded(input.id, letter.shareToken);
        return { shareToken: letter.shareToken };
      }
      const shareToken = nanoid(21);
      await createShareToken(input.id, shareToken);
      await updateLetterShareToken(input.id, shareToken);
      return { shareToken };
    }),
    /**
     * 共有リンクを無効化（revoke）
     * - 漏洩事故時に即座に止血できる
     * - 無効化されたトークンは410を返す
     */
    revokeShareLink: protectedProcedure.input(z2.object({
      letterId: z2.number(),
      reason: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.letterId);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      if (letter.shareToken) {
        await migrateShareTokenIfNeeded(input.letterId, letter.shareToken);
      }
      const result = await revokeShareToken(input.letterId, input.reason);
      return { success: result.success, wasActive: result.wasActive };
    }),
    /**
     * 共有リンクを再発行（rotate）
     * - 旧トークンは無効化され、新トークンが発行される
     * - 旧トークンでアクセスすると410が返る
     */
    rotateShareLink: protectedProcedure.input(z2.object({ letterId: z2.number() })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.letterId);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      if (letter.shareToken) {
        await migrateShareTokenIfNeeded(input.letterId, letter.shareToken);
      }
      const newToken = nanoid(21);
      const result = await rotateShareToken(input.letterId, newToken);
      await updateLetterShareToken(input.letterId, newToken);
      return {
        success: result.success,
        newShareToken: result.newToken,
        oldShareToken: result.oldToken
      };
    }),
    /**
     * 開封日時とリマインダースケジュールを更新
     * - unlockAtを変更すると未送信のreminderのscheduledAtも再計算
     * - 既に開封済み（openedAtがある）の場合は変更不可
     */
    updateSchedule: protectedProcedure.input(z2.object({
      letterId: z2.number(),
      unlockAt: z2.string().optional(),
      // ISO8601
      reminderDaysBeforeList: z2.array(z2.number()).optional(),
      // [90, 30, 7, 1]
      reminderEnabled: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.letterId);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      if (letter.unlockedAt) {
        throw new Error("\u65E2\u306B\u958B\u5C01\u3055\u308C\u305F\u624B\u7D19\u306E\u958B\u5C01\u65E5\u6642\u306F\u5909\u66F4\u3067\u304D\u307E\u305B\u3093");
      }
      let newUnlockAt = letter.unlockAt;
      if (input.unlockAt !== void 0) {
        newUnlockAt = new Date(input.unlockAt);
        await updateLetter(input.letterId, { unlockAt: newUnlockAt });
      }
      if (newUnlockAt && input.reminderDaysBeforeList !== void 0) {
        if (input.reminderEnabled === false || input.reminderDaysBeforeList.length === 0) {
          await deleteRemindersByLetterId(input.letterId);
        } else {
          await updateLetterReminders(
            input.letterId,
            ctx.user.id,
            newUnlockAt,
            input.reminderDaysBeforeList
          );
        }
      }
      const reminders = await getRemindersByLetterId(input.letterId);
      const updatedLetter = await getLetterById(input.letterId);
      return {
        success: true,
        unlockAt: updatedLetter?.unlockAt?.toISOString() || null,
        reminders
      };
    }),
    /**
     * 共有トークンの状態を取得
     */
    getShareLinkStatus: protectedProcedure.input(z2.object({ letterId: z2.number() })).query(async ({ ctx, input }) => {
      const letter = await getLetterById(input.letterId);
      if (!letter) throw new Error("Letter not found");
      if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
      const activeToken = await getActiveShareToken(input.letterId);
      return {
        hasActiveLink: !!activeToken,
        shareToken: activeToken?.token || null,
        viewCount: activeToken?.viewCount || 0,
        lastAccessedAt: activeToken?.lastAccessedAt?.toISOString() || null,
        createdAt: activeToken?.createdAt?.toISOString() || null
      };
    }),
    /**
     * 共有リンクから手紙を取得（公開エンドポイント）
     * 
     * ゼロ知識設計:
     * - 本文（finalContent）は返さない
     * - 暗号文URL、IV、封筒（wrappedClientShare）を返す
     * - serverShareは開封日時後にのみ返す
     */
    getByShareToken: publicProcedure.input(z2.object({
      shareToken: z2.string(),
      userAgent: z2.string().optional()
    })).query(async ({ input }) => {
      const botPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /slurp/i,
        /facebook/i,
        /twitter/i,
        /linkedin/i,
        /pinterest/i,
        /telegram/i,
        /whatsapp/i,
        /discord/i,
        /slack/i,
        /preview/i,
        /googlebot/i,
        /bingbot/i,
        /yandex/i,
        /baidu/i,
        /duckduck/i,
        /sogou/i,
        /exabot/i,
        /facebot/i,
        /ia_archiver/i,
        /mj12bot/i,
        /semrush/i,
        /ahref/i,
        /curl/i,
        /wget/i,
        /python/i,
        /java/i,
        /php/i,
        /headless/i,
        /phantom/i,
        /selenium/i,
        /puppeteer/i
      ];
      const userAgent = input.userAgent || "";
      const isBot = botPatterns.some((pattern) => pattern.test(userAgent));
      if (isBot) {
        return {
          isBot: true,
          title: "\u672A\u6765\u4FBF - \u5927\u5207\u306A\u4EBA\u3078\u306E\u624B\u7D19",
          description: "\u672A\u6765\u306E\u7279\u5225\u306A\u65E5\u306B\u5C4A\u304F\u624B\u7D19\u304C\u3042\u306A\u305F\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u3002"
        };
      }
      const tokenRecord = await getShareTokenRecord(input.shareToken);
      if (tokenRecord) {
        if (tokenRecord.status === "revoked") {
          return {
            error: "revoked",
            message: "\u3053\u306E\u5171\u6709\u30EA\u30F3\u30AF\u306F\u7121\u52B9\u5316\u3055\u308C\u307E\u3057\u305F\u3002\u9001\u4FE1\u8005\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002"
          };
        }
        if (tokenRecord.status === "rotated") {
          return {
            error: "rotated",
            message: "\u3053\u306E\u5171\u6709\u30EA\u30F3\u30AF\u306F\u65B0\u3057\u3044\u30EA\u30F3\u30AF\u306B\u7F6E\u304D\u63DB\u3048\u3089\u308C\u307E\u3057\u305F\u3002\u9001\u4FE1\u8005\u306B\u65B0\u3057\u3044\u30EA\u30F3\u30AF\u3092\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002"
          };
        }
        await incrementShareTokenViewCount(input.shareToken);
      }
      const letter = await getLetterByShareToken(input.shareToken);
      if (!letter) {
        return { error: "not_found" };
      }
      if (letter.status === "canceled") {
        return { error: "canceled" };
      }
      const now = /* @__PURE__ */ new Date();
      const unlockAt = letter.unlockAt ? new Date(letter.unlockAt) : null;
      const canUnlock = !unlockAt || now >= unlockAt;
      await incrementViewCount(letter.id);
      const shouldProvideServerShare = letter.useShamir && canProvideServerShare(unlockAt);
      const unlockEnvelope = letter.wrappedClientShare ? {
        wrappedClientShare: letter.wrappedClientShare,
        wrappedClientShareIv: letter.wrappedClientShareIv || "",
        wrappedClientShareSalt: letter.wrappedClientShareSalt || "",
        wrappedClientShareKdf: letter.wrappedClientShareKdf || "pbkdf2-sha256",
        wrappedClientShareKdfIters: letter.wrappedClientShareKdfIters || 2e5
      } : null;
      if (!canUnlock) {
        return {
          isBot: false,
          canUnlock: false,
          unlockAt: unlockAt?.toISOString(),
          recipientName: letter.recipientName,
          templateUsed: letter.templateUsed,
          useShamir: letter.useShamir,
          // サーバーシェアは開封日時前なので提供しない
          serverShare: null,
          // 封筒は常に返す（解錠コードがないと開けない）
          unlockEnvelope
        };
      }
      const proofInfo = generateProofInfo(
        letter.proofHash,
        letter.otsStatus || "pending",
        letter.otsSubmittedAt || void 0,
        letter.otsConfirmedAt || void 0
      );
      return {
        isBot: false,
        canUnlock: true,
        useShamir: letter.useShamir,
        // 開封日時後なのでサーバーシェアを提供
        serverShare: shouldProvideServerShare ? letter.serverShare : null,
        // 封筒（解錠コードで暗号化されたclientShare）
        unlockEnvelope,
        letter: {
          id: letter.id,
          recipientName: letter.recipientName,
          templateUsed: letter.templateUsed,
          // 本文は返さない（ゼロ知識）
          encryptionIv: letter.encryptionIv,
          ciphertextUrl: letter.ciphertextUrl,
          createdAt: letter.createdAt.toISOString(),
          unlockAt: unlockAt?.toISOString(),
          unlockedAt: letter.unlockedAt?.toISOString(),
          proofHash: letter.proofHash,
          proofInfo
        }
      };
    }),
    /**
     * 手紙を開封済みにマーク（復号成功後にクライアントから呼ぶ）
     * 
     * ゼロ知識設計:
     * - getByShareTokenでは開封済みにしない（Botや誤アクセス対策）
     * - 復号成功後にこのAPIを呼んで開封済みにする
     * - WHERE isUnlocked = false で原子的更新（二重開封レース防止）
     */
    markOpened: publicProcedure.input(z2.object({
      shareToken: z2.string()
    })).mutation(async ({ input }) => {
      const letter = await getLetterByShareToken(input.shareToken);
      if (!letter) {
        return { success: false, error: "not_found" };
      }
      if (letter.status === "canceled") {
        return { success: false, error: "canceled" };
      }
      const now = /* @__PURE__ */ new Date();
      const unlockAt = letter.unlockAt ? new Date(letter.unlockAt) : null;
      if (unlockAt && now < unlockAt) {
        return { success: false, error: "not_yet" };
      }
      const isFirstOpen = await unlockLetter(letter.id);
      if (isFirstOpen) {
        try {
          const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
          const unlockTimeStr = (/* @__PURE__ */ new Date()).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
          await notifyOwner2({
            title: `\u672A\u6765\u4FBF: \u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F`,
            content: `\u3042\u306A\u305F\u306E\u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F\u3002

\u5B9B\u5148: ${letter.recipientName || "\u672A\u8A2D\u5B9A"}
\u958B\u5C01\u65E5\u6642: ${unlockTimeStr}

\u203B \u672C\u6587\u306F\u30BC\u30ED\u77E5\u8B58\u8A2D\u8A08\u306E\u305F\u3081\u3001\u904B\u55B6\u8005\u3082\u8AAD\u3081\u307E\u305B\u3093\u3002`
          });
        } catch (err) {
          console.warn("[markOpened] Failed to notify owner:", err);
        }
      }
      return {
        success: true,
        isFirstOpen
      };
    }),
    /**
     * 解錠コード再発行（セキュリティ強固版、再発行は1回のみ）
     * 
     * - 新しい封筒（wrappedClientShare）のみ生成
     * - 解錠コードはDBに保存しない
     * - 旧封筒は上書きされるため、旧コードは自動的に無効化
     * - 2回目の再発行は禁止
     */
    regenerateUnlockCode: protectedProcedure.input(z2.object({
      id: z2.number(),
      newEnvelope: z2.object({
        wrappedClientShare: z2.string(),
        wrappedClientShareIv: z2.string(),
        wrappedClientShareSalt: z2.string(),
        wrappedClientShareKdf: z2.string(),
        wrappedClientShareKdfIters: z2.number()
      })
    })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.id);
      if (!letter) {
        return { success: false, error: "not_found" };
      }
      if (letter.authorId !== ctx.user.id) {
        return { success: false, error: "forbidden" };
      }
      if (letter.isUnlocked) {
        return { success: false, error: "already_opened" };
      }
      if (letter.unlockCodeRegeneratedAt) {
        return { success: false, error: "already_regenerated" };
      }
      await regenerateUnlockCode(input.id, input.newEnvelope);
      return { success: true };
    })
  }),
  // ============================================
  // AI Router
  // ============================================
  ai: router({
    transcribe: protectedProcedure.input(z2.object({
      audioUrl: z2.string()
    })).mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: "ja",
        prompt: "\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u306E\u9332\u97F3"
      });
      if ("error" in result) {
        console.error("[Transcribe] Error:", result);
        throw new Error(result.error);
      }
      return {
        text: result.text
      };
    }),
    generateDraft: protectedProcedure.input(z2.object({
      transcription: z2.string(),
      templateName: z2.string(),
      recipientName: z2.string().optional()
    })).mutation(async ({ input }) => {
      const template = await getTemplateByName(input.templateName);
      if (!template) {
        throw new Error("Template not found");
      }
      let prompt = template.prompt.replace("{{transcription}}", input.transcription);
      if (input.recipientName) {
        prompt = prompt.replace("\u5B50\u3069\u3082", input.recipientName);
      }
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\u6E29\u304B\u304F\u3001\u611B\u60C5\u306E\u3053\u3082\u3063\u305F\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002" },
            { role: "user", content: prompt }
          ]
        });
        const content = response.choices[0]?.message?.content;
        let draft = "";
        if (typeof content === "string") {
          draft = content;
        } else if (Array.isArray(content)) {
          draft = content.filter((c) => c.type === "text").map((c) => c.text).join("");
        }
        return { draft };
      } catch (error) {
        console.error("[GenerateDraft] Error:", error);
        throw new Error("\u4E0B\u66F8\u304D\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      }
    })
  }),
  // ============================================
  // Draft Router
  // ============================================
  draft: router({
    create: protectedProcedure.input(z2.object({
      templateName: z2.string().optional(),
      recipientName: z2.string().optional(),
      recipientRelation: z2.string().optional(),
      currentStep: z2.string().default("template")
    })).mutation(async ({ ctx, input }) => {
      const draftId = await createDraft({
        userId: ctx.user.id,
        templateName: input.templateName,
        recipientName: input.recipientName,
        recipientRelation: input.recipientRelation,
        currentStep: input.currentStep
      });
      return { id: draftId };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      templateName: z2.string().optional(),
      recipientName: z2.string().optional(),
      recipientRelation: z2.string().optional(),
      audioUrl: z2.string().optional(),
      audioBase64: z2.string().optional(),
      transcription: z2.string().optional(),
      aiDraft: z2.string().optional(),
      finalContent: z2.string().optional(),
      unlockAt: z2.string().optional(),
      currentStep: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const draft = await getDraftByUserAndId(ctx.user.id, input.id);
      if (!draft) {
        throw new Error("\u4E0B\u66F8\u304D\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      }
      const updates = {};
      if (input.templateName !== void 0) updates.templateName = input.templateName;
      if (input.recipientName !== void 0) updates.recipientName = input.recipientName;
      if (input.recipientRelation !== void 0) updates.recipientRelation = input.recipientRelation;
      if (input.audioUrl !== void 0) updates.audioUrl = input.audioUrl;
      if (input.audioBase64 !== void 0) updates.audioBase64 = input.audioBase64;
      if (input.transcription !== void 0) updates.transcription = input.transcription;
      if (input.aiDraft !== void 0) updates.aiDraft = input.aiDraft;
      if (input.finalContent !== void 0) updates.finalContent = input.finalContent;
      if (input.unlockAt !== void 0) updates.unlockAt = new Date(input.unlockAt);
      if (input.currentStep !== void 0) updates.currentStep = input.currentStep;
      await updateDraft(input.id, updates);
      return { success: true };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getDraftsByUser(ctx.user.id);
    }),
    get: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      const draft = await getDraftByUserAndId(ctx.user.id, input.id);
      if (!draft) {
        throw new Error("\u4E0B\u66F8\u304D\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      }
      return draft;
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      const draft = await getDraftByUserAndId(ctx.user.id, input.id);
      if (!draft) {
        throw new Error("\u4E0B\u66F8\u304D\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      }
      await deleteDraft(input.id);
      return { success: true };
    })
  }),
  // ============================================
  // Storage Router
  // ============================================
  // Reminder Router
  // ============================================
  reminder: router({
    /**
     * 手紙のリマインダー設定を取得
     */
    getByLetterId: protectedProcedure.input(z2.object({ letterId: z2.number() })).query(async ({ ctx, input }) => {
      const letter = await getLetterById(input.letterId);
      if (!letter || letter.authorId !== ctx.user.id) {
        return { reminders: [], daysBeforeList: [] };
      }
      const reminders = await getRemindersByLetterId(input.letterId);
      const daysBeforeList = reminders.map((r) => r.daysBefore);
      return { reminders, daysBeforeList };
    }),
    /**
     * 手紙のリマインダー設定を更新
     */
    update: protectedProcedure.input(z2.object({
      letterId: z2.number(),
      daysBeforeList: z2.array(z2.number()).default([]),
      // [90, 30, 7, 1]
      enabled: z2.boolean().default(true)
    })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.letterId);
      if (!letter || letter.authorId !== ctx.user.id) {
        throw new Error("\u624B\u7D19\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      }
      if (!letter.unlockAt) {
        throw new Error("\u958B\u5C01\u65E5\u6642\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
      }
      if (!input.enabled || input.daysBeforeList.length === 0) {
        await deleteRemindersByLetterId(input.letterId);
        return { success: true, reminders: [] };
      }
      await updateLetterReminders(
        input.letterId,
        ctx.user.id,
        letter.unlockAt,
        input.daysBeforeList
      );
      const reminders = await getRemindersByLetterId(input.letterId);
      return { success: true, reminders };
    }),
    /**
     * 手紙のリマインダーを削除
     */
    delete: protectedProcedure.input(z2.object({ letterId: z2.number() })).mutation(async ({ ctx, input }) => {
      const letter = await getLetterById(input.letterId);
      if (!letter || letter.authorId !== ctx.user.id) {
        throw new Error("\u624B\u7D19\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      }
      await deleteRemindersByLetterId(input.letterId);
      return { success: true };
    })
  }),
  // ============================================
  // Storage Router
  // ============================================
  storage: router({
    uploadAudio: protectedProcedure.input(z2.object({
      audioBase64: z2.string(),
      mimeType: z2.string().default("audio/webm")
    })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const fileKey = `audio/${ctx.user.id}/${nanoid()}.webm`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { url, key: fileKey };
    }),
    uploadCiphertext: protectedProcedure.input(z2.object({
      ciphertextBase64: z2.string()
    })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.ciphertextBase64, "base64");
      const fileKey = `ciphertext/${ctx.user.id}/${nanoid()}.enc`;
      const { url } = await storagePut(fileKey, buffer, "application/octet-stream");
      return { url, key: fileKey };
    })
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/firebaseAdmin.ts
import admin from "firebase-admin";
var firebaseApp;
try {
  firebaseApp = admin.app();
} catch {
  firebaseApp = admin.initializeApp({
    projectId: "miraibin"
  });
}
var firebaseAuth = admin.auth(firebaseApp);
async function verifyIdToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.warn("[Firebase Auth] Token verification failed:", error);
    return null;
  }
}
async function getFirebaseUser(uid) {
  try {
    return await firebaseAuth.getUser(uid);
  } catch (error) {
    console.warn("[Firebase Auth] Failed to get user:", error);
    return null;
  }
}

// server/_core/sdk.ts
var SDKServer = class {
  /**
   * Authenticate request using Firebase ID token
   * @param req - Express request with Authorization header
   * @returns User from database
   */
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization;
    const decodedToken = await verifyIdToken(authHeader);
    if (!decodedToken) {
      throw ForbiddenError("Invalid or missing authentication token");
    }
    const firebaseUid = decodedToken.uid;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(firebaseUid);
    if (!user) {
      try {
        const firebaseUser = await getFirebaseUser(firebaseUid);
        if (!firebaseUser) {
          throw ForbiddenError("User not found in Firebase");
        }
        await upsertUser({
          openId: firebaseUid,
          name: firebaseUser.displayName || null,
          email: firebaseUser.email ?? null,
          loginMethod: "google",
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(firebaseUid);
      } catch (error) {
        console.error("[Auth] Failed to create user from Firebase:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
var plugins = [react(), tailwindcss()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    proxy: {
      // Proxy API requests to the Express server in development
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});

// server/_core/vite.ts
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/reminderMailer.ts
init_env();
function buildReminderSubject(daysBefore) {
  if (daysBefore === 1) {
    return "\u3010\u672A\u6765\u4FBF\u3011\u660E\u65E5\u304C\u958B\u5C01\u65E5\u3067\u3059";
  }
  return `\u3010\u672A\u6765\u4FBF\u3011\u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059\uFF08\u3042\u3068${daysBefore}\u65E5\uFF09`;
}
function buildReminderBodyHtml(params) {
  const { recipientName, unlockAt, daysBefore, letterManagementUrl } = params;
  const unlockDateStr = unlockAt.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Tokyo"
  });
  const recipientLabel = recipientName || "\u5927\u5207\u306A\u4EBA";
  const daysText = daysBefore === 1 ? "\u660E\u65E5" : `\u3042\u3068${daysBefore}\u65E5`;
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #FFF8F0 0%, #FFF5EB 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h1 style="color: #D97706; font-size: 24px; margin: 0 0 16px 0;">
      \u{1F4EC} \u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059
    </h1>
    <p style="font-size: 18px; margin: 0; color: #92400E;">
      \u300C${recipientLabel}\u300D\u3078\u306E\u624B\u7D19\u306F<strong>${daysText}</strong>\u3067\u958B\u5C01\u65E5\u3092\u8FCE\u3048\u307E\u3059
    </p>
  </div>

  <div style="background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="font-size: 16px; color: #6B7280; margin: 0 0 12px 0;">\u958B\u5C01\u4E88\u5B9A\u65E5</h2>
    <p style="font-size: 20px; font-weight: bold; color: #1F2937; margin: 0;">
      ${unlockDateStr}
    </p>
  </div>

  <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400E;">
      \u26A0\uFE0F \u89E3\u9320\u30B3\u30FC\u30C9\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044
    </p>
    <p style="margin: 0; font-size: 14px; color: #78350F;">
      \u89E3\u9320\u30B3\u30FC\u30C9\u306F\u30B5\u30FC\u30D0\u30FC\u306B\u4FDD\u5B58\u3057\u3066\u3044\u307E\u305B\u3093\u3002<br>
      \u624B\u7D19\u4F5C\u6210\u6642\u306B\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u305FPDF\uFF083\u30DA\u30FC\u30B8\u76EE\uFF09\u307E\u305F\u306F\u4FDD\u7BA1\u5834\u6240\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002
    </p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${letterManagementUrl}" style="display: inline-block; background: #D97706; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
      \u624B\u7D19\u3092\u78BA\u8A8D\u3059\u308B
    </a>
    <p style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">
      \u203B\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    \u3053\u306E\u30E1\u30FC\u30EB\u306F\u672A\u6765\u4FBF\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002<br>
    \u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u8A2D\u5B9A\u306F<a href="${letterManagementUrl}" style="color: #D97706;">\u30DE\u30A4\u30EC\u30BF\u30FC</a>\u304B\u3089\u5909\u66F4\u3067\u304D\u307E\u3059\u3002
  </p>
</body>
</html>
  `.trim();
}
function buildReminderBodyText(params) {
  const { recipientName, unlockAt, daysBefore, letterManagementUrl } = params;
  const unlockDateStr = unlockAt.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Tokyo"
  });
  const recipientLabel = recipientName || "\u5927\u5207\u306A\u4EBA";
  const daysText = daysBefore === 1 ? "\u660E\u65E5" : `\u3042\u3068${daysBefore}\u65E5`;
  return `
\u3010\u672A\u6765\u4FBF\u3011\u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059

\u300C${recipientLabel}\u300D\u3078\u306E\u624B\u7D19\u306F${daysText}\u3067\u958B\u5C01\u65E5\u3092\u8FCE\u3048\u307E\u3059\u3002

\u25A0 \u958B\u5C01\u4E88\u5B9A\u65E5
${unlockDateStr}

\u25A0 \u89E3\u9320\u30B3\u30FC\u30C9\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044
\u89E3\u9320\u30B3\u30FC\u30C9\u306F\u30B5\u30FC\u30D0\u30FC\u306B\u4FDD\u5B58\u3057\u3066\u3044\u307E\u305B\u3093\u3002
\u624B\u7D19\u4F5C\u6210\u6642\u306B\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u305FPDF\uFF083\u30DA\u30FC\u30B8\u76EE\uFF09\u307E\u305F\u306F\u4FDD\u7BA1\u5834\u6240\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u25A0 \u624B\u7D19\u3092\u78BA\u8A8D\u3059\u308B
${letterManagementUrl}
\u203B\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059

---
\u3053\u306E\u30E1\u30FC\u30EB\u306F\u672A\u6765\u4FBF\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002
\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u8A2D\u5B9A\u306F\u30DE\u30A4\u30EC\u30BF\u30FC\u304B\u3089\u5909\u66F4\u3067\u304D\u307E\u3059\u3002
  `.trim();
}
async function sendReminderEmail(params) {
  const { to } = params;
  const subject = buildReminderSubject(params.daysBefore);
  const htmlBody = buildReminderBodyHtml(params);
  const textBody = buildReminderBodyText(params);
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn("[ReminderMailer] Notification service not configured");
    return false;
  }
  const endpoint = new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`
  ).toString();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({
        title: subject,
        content: textBody
      })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[ReminderMailer] Failed to send reminder (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    console.log(`[ReminderMailer] Reminder sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.warn("[ReminderMailer] Error sending reminder:", error);
    return false;
  }
}

// server/reminderBatch.ts
init_env();
async function runReminderBatch() {
  const result = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  console.log("[ReminderBatch] Starting batch processing...");
  const reminders = await getPendingReminders(100);
  console.log(`[ReminderBatch] Found ${reminders.length} pending reminders`);
  for (const reminder of reminders) {
    result.processed++;
    if (!reminder.letter) {
      console.warn(`[ReminderBatch] Letter not found for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "Letter not found");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "Letter not found" });
      continue;
    }
    if (!reminder.user) {
      console.warn(`[ReminderBatch] User not found for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "User not found");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "User not found" });
      continue;
    }
    const email = reminder.user.notificationEmail || reminder.user.email;
    if (!email) {
      console.warn(`[ReminderBatch] No email for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "No email address");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "No email address" });
      continue;
    }
    if (!reminder.letter.unlockAt) {
      console.warn(`[ReminderBatch] No unlock date for reminder ${reminder.id}`);
      await markReminderAsFailed(reminder.id, "No unlock date");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "No unlock date" });
      continue;
    }
    const baseUrl = ENV.oAuthServerUrl?.replace("/api", "") || "https://mirai-bin.manus.space";
    const letterManagementUrl = `${baseUrl}/letters/${reminder.letterId}`;
    const emailParams = {
      to: email,
      recipientName: reminder.letter.recipientName,
      unlockAt: reminder.letter.unlockAt,
      daysBefore: reminder.daysBefore,
      letterId: reminder.letterId,
      letterManagementUrl
    };
    const sent = await sendReminderEmail(emailParams);
    if (sent) {
      const marked = await markReminderAsSent(reminder.id);
      if (marked) {
        console.log(`[ReminderBatch] Sent reminder ${reminder.id} to ${email}`);
        result.sent++;
      } else {
        console.log(`[ReminderBatch] Reminder ${reminder.id} already sent (skipped)`);
        result.skipped++;
      }
    } else {
      await markReminderAsFailed(reminder.id, "Email send failed");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "Email send failed" });
    }
  }
  console.log(`[ReminderBatch] Batch complete: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`);
  return result;
}

// server/_core/index.ts
init_env();
var app = express2();
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ limit: "50mb", extended: true }));
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
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") {
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
var isCloudFunctions = !!process.env.FUNCTIONS_EMULATOR || !!process.env.FUNCTION_TARGET;
if (!isCloudFunctions) {
  startServer().catch(console.error);
}
export {
  app
};
