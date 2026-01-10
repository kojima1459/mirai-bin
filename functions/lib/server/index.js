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
      geminiApiKey: process.env.GEMINI_API_KEY ?? "AIzaSyBhm0YrR2ju8PMHKkU2F5_oSaSCoPPo8Qo",
      // Email configuration
      sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
      mailFrom: process.env.MAIL_FROM ?? "noreply@silent-memo.web.app",
      mailProvider: process.env.MAIL_PROVIDER ?? "mock",
      appBaseUrl: process.env.APP_BASE_URL ?? "https://silent-memo.web.app",
      // Push notification (VAPID)
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
      pushSubject: process.env.PUSH_SUBJECT ?? "mailto:noreply@silent-memo.web.app"
    };
    if (ENV.isProduction) {
      const missingEnvs = [];
      if (!ENV.databaseUrl) missingEnvs.push("DATABASE_URL");
      if (!ENV.cookieSecret) missingEnvs.push("JWT_SECRET");
      if (!ENV.oAuthServerUrl) missingEnvs.push("OAUTH_SERVER_URL");
      if (missingEnvs.length > 0) {
        throw new Error(`[Server] Critical environment variables missing: ${missingEnvs.join(", ")}`);
      }
    }
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

// drizzle/schema.ts
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, letters, templates, drafts, letterReminders, letterShareTokens, families, familyMembers, familyInvites, interviewSessions, interviewMessages, notifications, pushSubscriptions;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      notificationEmail: varchar("notificationEmail", { length: 320 }),
      // 未設定ならemailを使用
      trustedContactEmail: varchar("trustedContactEmail", { length: 320 }),
      // 信頼できる通知先（配偶者等）
      // リマインド通知設定
      notifyEnabled: boolean("notifyEnabled").default(true).notNull(),
      // 通知を受け取るか
      notifyDaysBefore: int("notifyDaysBefore").default(7).notNull(),
      // 何日前に通知（1,3,7,30,90,365）
      // メール検証
      notificationEmailVerified: boolean("notificationEmailVerified").default(false).notNull(),
      notificationEmailVerifyToken: varchar("notificationEmailVerifyToken", { length: 64 }),
      notificationEmailVerifyExpiresAt: timestamp("notificationEmailVerifyExpiresAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    letters = mysqlTable("letters", {
      id: int("id").autoincrement().primaryKey(),
      authorId: int("authorId").notNull(),
      // 公開スコープ: private(自分のみ), family(家族グループ), link(URL共有)
      visibilityScope: mysqlEnum("visibilityScope", ["private", "family", "link"]).default("private").notNull(),
      familyId: int("familyId"),
      // FAMILYスコープ時のみ設定
      // 受取人情報
      recipientName: varchar("recipientName", { length: 100 }),
      recipientRelation: varchar("recipientRelation", { length: 50 }),
      // 音声データ（URL参照のみ、本文は保存しない）
      audioUrl: varchar("audioUrl", { length: 500 }),
      audioDuration: int("audioDuration"),
      // 暗号化済み音声（ゼロ知識設計）
      // - クライアント側で暗号化された音声の保存先URL
      // - 復号鍵はmasterKeyからHKDFで導出（本文とは別キー）
      encryptedAudioUrl: varchar("encryptedAudioUrl", { length: 500 }),
      encryptedAudioIv: varchar("encryptedAudioIv", { length: 255 }),
      encryptedAudioMimeType: varchar("encryptedAudioMimeType", { length: 100 }),
      encryptedAudioByteSize: int("encryptedAudioByteSize"),
      encryptedAudioDurationSec: int("encryptedAudioDurationSec"),
      encryptedAudioCryptoVersion: varchar("encryptedAudioCryptoVersion", { length: 20 }),
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
      openedUserAgent: text("openedUserAgent"),
      // 開封時のUser-Agent（端末情報）
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
    templates = mysqlTable("templates", {
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
    drafts = mysqlTable("drafts", {
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
    letterReminders = mysqlTable("letter_reminders", {
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
    letterShareTokens = mysqlTable("letter_share_tokens", {
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
    families = mysqlTable("families", {
      id: int("id").autoincrement().primaryKey(),
      ownerUserId: int("ownerUserId").notNull(),
      name: varchar("name", { length: 100 }).default("\u30DE\u30A4\u30D5\u30A1\u30DF\u30EA\u30FC"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    familyMembers = mysqlTable("family_members", {
      id: int("id").autoincrement().primaryKey(),
      familyId: int("familyId").notNull(),
      userId: int("userId").notNull(),
      role: mysqlEnum("role", ["owner", "member"]).default("member").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    familyInvites = mysqlTable("family_invites", {
      id: int("id").autoincrement().primaryKey(),
      familyId: int("familyId").notNull(),
      invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
      token: varchar("token", { length: 64 }).notNull().unique(),
      status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    interviewSessions = mysqlTable("interview_sessions", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      recipientName: varchar("recipientName", { length: 100 }),
      // 誰宛か
      topic: varchar("topic", { length: 100 }),
      // 話題（自分史、感謝、謝罪etc）
      status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    interviewMessages = mysqlTable("interview_messages", {
      id: int("id").autoincrement().primaryKey(),
      sessionId: int("sessionId").notNull(),
      sender: mysqlEnum("sender", ["ai", "user"]).notNull(),
      content: text("content").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    notifications = mysqlTable("notifications", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      type: varchar("type", { length: 50 }).notNull(),
      // reminder_before_unlock, letter_opened, family_invite
      title: varchar("title", { length: 255 }).notNull(),
      body: text("body").notNull(),
      meta: text("meta"),
      // JSON: { letterId, recipientLabel, daysRemaining }
      readAt: timestamp("readAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    pushSubscriptions = mysqlTable("push_subscriptions", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      endpoint: varchar("endpoint", { length: 500 }).notNull().unique(),
      p256dh: varchar("p256dh", { length: 255 }).notNull(),
      auth: varchar("auth", { length: 64 }).notNull(),
      userAgent: varchar("userAgent", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      revokedAt: timestamp("revokedAt")
    });
  }
});

// server/db_share_token.ts
import { eq, and } from "drizzle-orm";
async function getShareTokenRecord(db, token) {
  const result = await db.select().from(letterShareTokens).where(eq(letterShareTokens.token, token)).limit(1);
  return result[0];
}
async function getActiveShareToken(db, letterId) {
  const result = await db.select().from(letterShareTokens).where(and(
    eq(letterShareTokens.letterId, letterId),
    eq(letterShareTokens.status, "active")
  )).limit(1);
  return result[0];
}
async function createShareToken(db, letterId, token) {
  const existingActive = await getActiveShareToken(db, letterId);
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
async function revokeShareToken(db, letterId, reason) {
  const activeToken = await getActiveShareToken(db, letterId);
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
async function rotateShareToken(db, letterId, newToken) {
  const activeToken = await getActiveShareToken(db, letterId);
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
  await createShareToken(db, letterId, newToken);
  return {
    success: true,
    newToken,
    oldToken: activeToken?.token
  };
}
async function incrementShareTokenViewCount(db, token) {
  const tokenRecord = await getShareTokenRecord(db, token);
  if (!tokenRecord) return;
  await db.update(letterShareTokens).set({
    viewCount: tokenRecord.viewCount + 1,
    lastAccessedAt: /* @__PURE__ */ new Date()
  }).where(eq(letterShareTokens.token, token));
}
async function migrateShareTokenIfNeeded(db, letterId, legacyToken) {
  const existingActive = await getActiveShareToken(db, letterId);
  if (existingActive) return;
  const existingToken = await getShareTokenRecord(db, legacyToken);
  if (existingToken) return;
  await createShareToken(db, letterId, legacyToken);
}
var init_db_share_token = __esm({
  "server/db_share_token.ts"() {
    "use strict";
    init_schema();
  }
});

// server/db_reminder.ts
import { eq as eq2, and as and2 } from "drizzle-orm";
async function createRemindersForLetter(db, letterId, ownerUserId, unlockAt, daysBeforeList) {
  await db.delete(letterReminders).where(eq2(letterReminders.letterId, letterId));
  for (const daysBefore of daysBeforeList) {
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
async function getRemindersByLetterId(db, letterId) {
  return await db.select().from(letterReminders).where(eq2(letterReminders.letterId, letterId)).orderBy(letterReminders.daysBefore);
}
async function getPendingReminders(db, limit = 100) {
  const now = /* @__PURE__ */ new Date();
  const reminders = await db.select().from(letterReminders).where(and2(
    eq2(letterReminders.status, "pending")
    // scheduledAt <= now condition is handled by filter below for test simplicity if needed,
    // but in real DB query we want it in WHERE.
    // Drizzle Mock is tricky here. 
    // Current implementation fetches by status='pending' then filters in JS?
    // No, let's keep it consistent with original code which fetches then filters in JS mostly?
    // Original code:
    // .where(and(eq(letterReminders.status, "pending")))
    // .limit(limit);
    // const filteredReminders = reminders.filter(r => r.scheduledAt <= now);
    // It seems original code was doing filtering in memory too for the date part?
    // Yes, see L803 in original db.ts view.
  )).limit(limit);
  const filteredReminders = reminders.filter((r) => r.scheduledAt <= now);
  const result = await Promise.all(filteredReminders.map(async (reminder) => {
    const letter = await db.select().from(letters).where(eq2(letters.id, reminder.letterId)).limit(1);
    const user = await db.select({
      email: users.email,
      notificationEmail: users.notificationEmail,
      notificationEmailVerified: users.notificationEmailVerified,
      trustedContactEmail: users.trustedContactEmail
    }).from(users).where(eq2(users.id, reminder.ownerUserId)).limit(1);
    return {
      ...reminder,
      letter: letter[0] || null,
      user: user[0] || null
    };
  }));
  return result;
}
async function markReminderAsSent(db, reminderId) {
  const result = await db.update(letterReminders).set({
    sentAt: /* @__PURE__ */ new Date(),
    status: "sent"
  }).where(and2(
    eq2(letterReminders.id, reminderId),
    eq2(letterReminders.status, "pending")
  ));
  return (result[0]?.affectedRows ?? 0) > 0;
}
async function markReminderAsFailed(db, reminderId, error) {
  await db.update(letterReminders).set({
    status: "failed",
    lastError: error
  }).where(eq2(letterReminders.id, reminderId));
}
async function updateLetterReminders(db, letterId, ownerUserId, unlockAt, daysBeforeList) {
  const existingReminders = await db.select().from(letterReminders).where(eq2(letterReminders.letterId, letterId));
  const sentReminders = existingReminders.filter((r) => r.status === "sent");
  const sentDaysBefore = new Set(sentReminders.map((r) => r.daysBefore));
  await db.delete(letterReminders).where(and2(
    eq2(letterReminders.letterId, letterId),
    eq2(letterReminders.status, "pending")
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
async function deleteRemindersByLetterId(db, letterId) {
  await db.delete(letterReminders).where(eq2(letterReminders.letterId, letterId));
}
var init_db_reminder = __esm({
  "server/db_reminder.ts"() {
    "use strict";
    init_schema();
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storageDelete: () => storageDelete,
  storageGet: () => storageGet,
  storagePut: () => storagePut
});
import admin from "firebase-admin";
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const key = relKey.replace(/^\/+/, "");
  const file = bucket.file(key);
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  await file.save(buffer, {
    metadata: {
      contentType
    },
    resumable: false
    // Simpler for smaller files
  });
  await file.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${key}`;
  return { key, url };
}
async function storageGet(relKey) {
  const key = relKey.replace(/^\/+/, "");
  const file = bucket.file(key);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1e3
    // 1 hour
  });
  return { key, url };
}
async function storageDelete(relKey) {
  const key = relKey.replace(/^\/+/, "");
  const file = bucket.file(key);
  try {
    await file.delete();
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }
  }
}
var firebaseApp, bucket;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    try {
      firebaseApp = admin.app();
    } catch {
      firebaseApp = admin.initializeApp({
        projectId: "miraibin",
        storageBucket: "miraibin.firebasestorage.app"
      });
    }
    bucket = admin.storage(firebaseApp).bucket("miraibin.firebasestorage.app");
  }
});

// server/db.ts
import { eq as eq3, and as and3, desc as desc2 } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  const result = await db.select().from(users).where(eq3(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateUserEmail(userId, newEmail) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(users).set({ email: newEmail }).where(eq3(users.id, userId));
}
async function updateUserTrustedContactEmail(userId, trustedContactEmail) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(users).set({ trustedContactEmail }).where(eq3(users.id, userId));
}
async function updateUserNotificationSettings(userId, notifyEnabled, notifyDaysBefore) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(users).set({ notifyEnabled, notifyDaysBefore }).where(eq3(users.id, userId));
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
  const result = await db.select().from(letters).where(eq3(letters.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getLettersByAuthor(authorId) {
  const db = await getDb();
  if (!db) {
    return [];
  }
  return await db.select().from(letters).where(eq3(letters.authorId, authorId)).orderBy(desc2(letters.createdAt));
}
async function updateLetter(id, updates) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(letters).set(updates).where(eq3(letters.id, id));
}
async function deleteLetter(id) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const letterResult = await db.select().from(letters).where(eq3(letters.id, id)).limit(1);
  const letter = letterResult[0];
  if (letter) {
    const { storageDelete: storageDelete2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const parseStorageKey = (url) => {
      if (!url) return null;
      const match = url.match(/miraibin\.firebasestorage\.app\/(.+)$/);
      return match ? match[1] : null;
    };
    const audioKey = parseStorageKey(letter.audioUrl);
    if (audioKey) {
      await storageDelete2(audioKey).catch((e) => console.warn("Failed to delete audio:", e));
    }
    const textKey = parseStorageKey(letter.ciphertextUrl);
    if (textKey) {
      await storageDelete2(textKey).catch((e) => console.warn("Failed to delete ciphertext:", e));
    }
    const encAudioKey = parseStorageKey(letter.encryptedAudioUrl);
    if (encAudioKey) {
      await storageDelete2(encAudioKey).catch((e) => console.warn("Failed to delete enc audio:", e));
    }
  }
  await db.delete(letters).where(eq3(letters.id, id));
}
async function getLetterByShareToken(shareToken) {
  const db = await getDb();
  if (!db) {
    return void 0;
  }
  const result = await db.select().from(letters).where(eq3(letters.shareToken, shareToken)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateLetterShareToken(id, shareToken) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(letters).set({ shareToken }).where(eq3(letters.id, id));
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
    }).where(eq3(letters.id, id));
  }
}
async function unlockLetter(id, userAgent) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.update(letters).set({
    isUnlocked: true,
    unlockedAt: /* @__PURE__ */ new Date(),
    openedUserAgent: userAgent || null
  }).where(and3(eq3(letters.id, id), eq3(letters.isUnlocked, false)));
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
  const result = await db.select().from(templates).where(eq3(templates.name, name)).limit(1);
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
    },
    // === 配偶者・パートナー向け ===
    {
      name: "wedding-anniversary",
      displayName: "\u7D50\u5A5A\u8A18\u5FF5\u65E5\u306B",
      description: "\u30D1\u30FC\u30C8\u30CA\u30FC\u3078\u306E\u611F\u8B1D\u3068\u611B\u3092\u4F1D\u3048\u308B\u65E5\u306B",
      category: "special",
      prompt: `\u3042\u306A\u305F\u306F\u914D\u5076\u8005\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u7D50\u5A5A\u8A18\u5FF5\u65E5\u306B\u5C4A\u3051\u308B\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u7D50\u5A5A\u3057\u3066\u304B\u3089\u306E\u65E5\u3005\u3078\u306E\u611F\u8B1D
- \u4E00\u7DD2\u306B\u904E\u3054\u3057\u305F\u601D\u3044\u51FA
- \u3053\u308C\u304B\u3089\u3082\u5171\u306B\u6B69\u3093\u3067\u3044\u304D\u305F\u3044\u3068\u3044\u3046\u6C17\u6301\u3061
- \u666E\u6BB5\u306F\u8A00\u3048\u306A\u3044\u611B\u60C5\u306E\u8A00\u8449
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u30D1\u30FC\u30C8\u30CA\u30FC\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u611F\u8B1D\u306E\u8A00\u8449\u3001\u601D\u3044\u51FA\u3001\u3053\u308C\u304B\u3089\u306E\u3053\u3068\u306A\u3069\u3002",
      exampleOneLiner: "\u3042\u306A\u305F\u3068\u51FA\u4F1A\u3048\u3066\u3001\u672C\u5F53\u306B\u3088\u304B\u3063\u305F\u3002",
      icon: "heart"
    },
    // === 特別な誕生日 ===
    {
      name: "milestone-birthday",
      displayName: "\u7279\u5225\u306A\u8A95\u751F\u65E5\u306B",
      description: "\u7BC0\u76EE\u306E\u5E74\u9F62\u3092\u8FCE\u3048\u308B\u8A95\u751F\u65E5\u306B\uFF0820\u6B73\u300130\u6B73\u3001\u9084\u66A6\u306A\u3069\uFF09",
      category: "milestone",
      prompt: `\u3042\u306A\u305F\u306F\u89AA\u304C\u5B50\u3069\u3082\u306B\u5B9B\u3066\u305F\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u7BC0\u76EE\u306E\u8A95\u751F\u65E5\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u7279\u5225\u306A\u5E74\u9F62\u3092\u8FCE\u3048\u308B\u3053\u3068\u3078\u306E\u795D\u798F
- \u3053\u308C\u307E\u3067\u306E\u4EBA\u751F\u3092\u632F\u308A\u8FD4\u3063\u3066
- \u65B0\u3057\u304410\u5E74\u3078\u306E\u671F\u5F85\u3068\u5FDC\u63F4
- \u89AA\u3068\u3057\u3066\u306E\u8A87\u308A\u3068\u611B\u60C5
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u7BC0\u76EE\u306E\u8A95\u751F\u65E5\u3092\u8FCE\u3048\u308B\u5B50\u3069\u3082\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u795D\u798F\u3001\u601D\u3044\u51FA\u3001\u3053\u308C\u304B\u3089\u3078\u306E\u9858\u3044\u306A\u3069\u3002",
      exampleOneLiner: "\u65B0\u3057\u3044\u4E00\u6B69\u3092\u8E0F\u307F\u51FA\u3059\u3042\u306A\u305F\u3092\u3001\u5FC3\u304B\u3089\u5FDC\u63F4\u3057\u3066\u308B\u3088\u3002",
      icon: "cake"
    },
    // === 感謝の手紙 ===
    {
      name: "thank-you-letter",
      displayName: "\u3042\u308A\u304C\u3068\u3046\u306E\u624B\u7D19",
      description: "\u65E5\u9803\u306E\u611F\u8B1D\u3092\u4F1D\u3048\u308B\u624B\u7D19",
      category: "special",
      prompt: `\u3042\u306A\u305F\u306F\u611F\u8B1D\u306E\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u611F\u8B1D\u306E\u6C17\u6301\u3061\u3092\u8FBC\u3081\u305F\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u5177\u4F53\u7684\u306A\u30A8\u30D4\u30BD\u30FC\u30C9\u3092\u4EA4\u3048\u3066\u611F\u8B1D\u3092\u4F1D\u3048\u308B
- \u76F8\u624B\u304C\u3057\u3066\u304F\u308C\u305F\u3053\u3068\u3078\u306E\u611F\u8B1D
- \u76F8\u624B\u306E\u5B58\u5728\u306E\u5927\u5207\u3055
- \u3053\u308C\u304B\u3089\u3082\u5927\u5207\u306B\u3057\u305F\u3044\u3068\u3044\u3046\u6C17\u6301\u3061
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u611F\u8B1D\u306E\u6C17\u6301\u3061\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3069\u3093\u306A\u3053\u3068\u306B\u611F\u8B1D\u3057\u3066\u3044\u308B\u304B\u3001\u76F8\u624B\u3078\u306E\u601D\u3044\u306A\u3069\u3002",
      exampleOneLiner: "\u3044\u3064\u3082\u3042\u308A\u304C\u3068\u3046\u3002\u3042\u306A\u305F\u306E\u304A\u304B\u3052\u3067\u9811\u5F35\u308C\u3066\u308B\u3002",
      icon: "heart"
    },
    // === 旅立ち・別れ ===
    {
      name: "farewell-letter",
      displayName: "\u65C5\u7ACB\u3061\u306E\u65E5\u306B",
      description: "\u7559\u5B66\u3001\u8EE2\u52E4\u3001\u5F15\u3063\u8D8A\u3057\u306A\u3069\u65C5\u7ACB\u3061\u306E\u65E5\u306B",
      category: "milestone",
      prompt: `\u3042\u306A\u305F\u306F\u5225\u308C\u3068\u5FDC\u63F4\u306E\u624B\u7D19\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3092\u3082\u3068\u306B\u3001\u65C5\u7ACB\u3064\u4EBA\u3078\u306E\u624B\u7D19\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30EB\u30FC\u30EB\u3011
- \u65B0\u3057\u3044\u5834\u6240\u3067\u306E\u6311\u6226\u3078\u306E\u5FDC\u63F4
- \u3053\u308C\u307E\u3067\u306E\u601D\u3044\u51FA\u3078\u306E\u611F\u8B1D
- \u96E2\u308C\u3066\u3044\u3066\u3082\u7E4B\u304C\u3063\u3066\u3044\u308B\u3068\u3044\u3046\u30E1\u30C3\u30BB\u30FC\u30B8
- \u8F9B\u3044\u3068\u304D\u306F\u5E30\u3063\u3066\u304D\u3066\u3044\u3044\u3068\u3044\u3046\u5B89\u5FC3\u611F
- 300\u301C500\u6587\u5B57\u7A0B\u5EA6

\u3010\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u3011
{{transcription}}`,
      recordingPrompt: "\u65C5\u7ACB\u3064\u4EBA\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u300190\u79D2\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5FDC\u63F4\u306E\u8A00\u8449\u3001\u601D\u3044\u51FA\u3001\u4ECA\u5F8C\u3078\u306E\u9858\u3044\u306A\u3069\u3002",
      exampleOneLiner: "\u65B0\u3057\u3044\u5834\u6240\u3067\u3082\u3001\u3042\u306A\u305F\u3089\u3057\u304F\u8F1D\u3044\u3066\u3002",
      icon: "plane"
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
  return await db.select().from(drafts).where(eq3(drafts.userId, userId)).orderBy(desc2(drafts.updatedAt));
}
async function updateDraft(id, updates) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(drafts).set(updates).where(eq3(drafts.id, id));
}
async function deleteDraft(id) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(drafts).where(eq3(drafts.id, id));
}
async function getDraftByUserAndId(userId, draftId) {
  const db = await getDb();
  if (!db) {
    return void 0;
  }
  const result = await db.select().from(drafts).where(and3(eq3(drafts.id, draftId), eq3(drafts.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createRemindersForLetter2(letterId, ownerUserId, unlockAt, daysBeforeList) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return createRemindersForLetter(db, letterId, ownerUserId, unlockAt, daysBeforeList);
}
async function getRemindersByLetterId2(letterId) {
  const db = await getDb();
  if (!db) return [];
  return getRemindersByLetterId(db, letterId);
}
async function getPendingReminders2(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return getPendingReminders(db, limit);
}
async function markReminderAsSent2(reminderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return markReminderAsSent(db, reminderId);
}
async function markReminderAsFailed2(reminderId, error) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return markReminderAsFailed(db, reminderId, error);
}
async function updateLetterReminders2(letterId, ownerUserId, unlockAt, daysBeforeList) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return updateLetterReminders(db, letterId, ownerUserId, unlockAt, daysBeforeList);
}
async function deleteRemindersByLetterId2(letterId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return deleteRemindersByLetterId(db, letterId);
}
async function getShareTokenRecord2(token) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return getShareTokenRecord(db, token);
}
async function getActiveShareToken2(letterId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return getActiveShareToken(db, letterId);
}
async function createShareToken2(letterId, token) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return createShareToken(db, letterId, token);
}
async function revokeShareToken2(letterId, reason) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return revokeShareToken(db, letterId, reason);
}
async function rotateShareToken2(letterId, newToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return rotateShareToken(db, letterId, newToken);
}
async function incrementShareTokenViewCount2(token) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return incrementShareTokenViewCount(db, token);
}
async function migrateShareTokenIfNeeded2(letterId, legacyToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return migrateShareTokenIfNeeded(db, letterId, legacyToken);
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
  }).where(eq3(letters.id, letterId));
  return true;
}
async function getUserFamilyIds(userId) {
  const db = await getDb();
  if (!db) return [];
  const memberships = await db.select({ familyId: familyMembers.familyId }).from(familyMembers).where(eq3(familyMembers.userId, userId));
  return memberships.map((m) => m.familyId);
}
async function isUserFamilyMember(userId, familyId) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: familyMembers.id }).from(familyMembers).where(and3(eq3(familyMembers.userId, userId), eq3(familyMembers.familyId, familyId))).limit(1);
  return result.length > 0;
}
async function getLettersByScope(userId, scope) {
  const db = await getDb();
  if (!db) return [];
  if (scope === "private") {
    return await db.select().from(letters).where(and3(
      eq3(letters.authorId, userId),
      eq3(letters.visibilityScope, "private")
    )).orderBy(desc2(letters.createdAt));
  }
  if (scope === "family") {
    const familyIds = await getUserFamilyIds(userId);
    if (familyIds.length === 0) return [];
    const result = [];
    for (const fid of familyIds) {
      const familyLetters = await db.select().from(letters).where(and3(
        eq3(letters.familyId, fid),
        eq3(letters.visibilityScope, "family")
      )).orderBy(desc2(letters.createdAt));
      result.push(...familyLetters);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (scope === "link") {
    return await db.select().from(letters).where(and3(
      eq3(letters.authorId, userId),
      eq3(letters.visibilityScope, "link")
    )).orderBy(desc2(letters.createdAt));
  }
  return [];
}
async function createFamily(ownerUserId, name) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(families).values({
    ownerUserId,
    name: name || "\u30DE\u30A4\u30D5\u30A1\u30DF\u30EA\u30FC"
  });
  const familyId = result[0].insertId;
  await db.insert(familyMembers).values({
    familyId,
    userId: ownerUserId,
    role: "owner"
  });
  return familyId;
}
async function getFamilyByOwner(ownerUserId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(families).where(eq3(families.ownerUserId, ownerUserId)).limit(1);
  return result[0];
}
async function getFamilyMemberships(userId) {
  const db = await getDb();
  if (!db) return [];
  const membershipIds = await getUserFamilyIds(userId);
  if (membershipIds.length === 0) return [];
  const result = [];
  for (const fid of membershipIds) {
    const family = await db.select().from(families).where(eq3(families.id, fid)).limit(1);
    if (family[0]) result.push(family[0]);
  }
  return result;
}
async function getFamilyMembers(familyId) {
  const db = await getDb();
  if (!db) return [];
  const members = await db.select().from(familyMembers).where(eq3(familyMembers.familyId, familyId));
  const result = await Promise.all(members.map(async (m) => {
    const user = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq3(users.id, m.userId)).limit(1);
    return { ...m, user: user[0] || void 0 };
  }));
  return result;
}
async function createFamilyInvite(familyId, invitedEmail, token, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(familyInvites).values({
    familyId,
    invitedEmail,
    token,
    expiresAt
  });
  return result[0].insertId;
}
async function getFamilyInviteByToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(familyInvites).where(eq3(familyInvites.token, token)).limit(1);
  return result[0];
}
async function acceptFamilyInvite(token, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const invite = await getFamilyInviteByToken(token);
  if (!invite) {
    return { success: false, error: "\u62DB\u5F85\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" };
  }
  if (invite.status !== "pending") {
    return { success: false, error: "\u3053\u306E\u62DB\u5F85\u306F\u65E2\u306B\u4F7F\u7528\u6E08\u307F\u3067\u3059" };
  }
  if (/* @__PURE__ */ new Date() > invite.expiresAt) {
    return { success: false, error: "\u3053\u306E\u62DB\u5F85\u306F\u671F\u9650\u5207\u308C\u3067\u3059" };
  }
  const alreadyMember = await isUserFamilyMember(userId, invite.familyId);
  if (alreadyMember) {
    return { success: false, error: "\u65E2\u306B\u3053\u306E\u30D5\u30A1\u30DF\u30EA\u30FC\u306E\u30E1\u30F3\u30D0\u30FC\u3067\u3059" };
  }
  await db.insert(familyMembers).values({
    familyId: invite.familyId,
    userId,
    role: "member"
  });
  await db.update(familyInvites).set({ status: "accepted" }).where(eq3(familyInvites.id, invite.id));
  return { success: true };
}
async function getFamilyInvites(familyId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(familyInvites).where(eq3(familyInvites.familyId, familyId)).orderBy(desc2(familyInvites.createdAt));
}
async function createInterviewSession(userId, recipientName, topic) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(interviewSessions).values({
    userId,
    recipientName: recipientName || "\u8AB0\u304B",
    topic: topic || "\u81EA\u5206\u53F2",
    status: "active"
  });
  return result[0].insertId;
}
async function getInterviewSession(sessionId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(interviewSessions).where(eq3(interviewSessions.id, sessionId)).limit(1);
  return result[0];
}
async function getActiveInterviewSession(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(interviewSessions).where(and3(
    eq3(interviewSessions.userId, userId),
    eq3(interviewSessions.status, "active")
  )).orderBy(desc2(interviewSessions.createdAt)).limit(1);
  return result[0];
}
async function addInterviewMessage(sessionId, sender, content) {
  const db = await getDb();
  if (!db) return;
  await db.insert(interviewMessages).values({
    sessionId,
    sender,
    content
  });
}
async function getInterviewHistory(sessionId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(interviewMessages).where(eq3(interviewMessages.sessionId, sessionId)).orderBy(interviewMessages.createdAt);
}
async function completeInterviewSession(sessionId) {
  const db = await getDb();
  if (!db) return;
  await db.update(interviewSessions).set({ status: "completed" }).where(eq3(interviewSessions.id, sessionId));
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_db_share_token();
    init_db_reminder();
    _db = null;
  }
});

// server/_core/url.ts
var url_exports = {};
__export(url_exports, {
  getAppBaseUrl: () => getAppBaseUrl,
  makeLetterUrl: () => makeLetterUrl,
  makeUrl: () => makeUrl,
  makeVerifyEmailUrl: () => makeVerifyEmailUrl
});
function getAppBaseUrl() {
  if (ENV.appBaseUrl && ENV.appBaseUrl !== "https://silent-memo.web.app") {
    return ENV.appBaseUrl.replace(/\/$/, "");
  }
  if (ENV.appBaseUrl) {
    return ENV.appBaseUrl.replace(/\/$/, "");
  }
  if (ENV.oAuthServerUrl) {
    return ENV.oAuthServerUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return "http://localhost:5173";
}
function makeUrl(path3, params) {
  const baseUrl = getAppBaseUrl();
  const normalizedPath = path3.startsWith("/") ? path3 : `/${path3}`;
  let url = `${baseUrl}${normalizedPath}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
}
function makeLetterUrl(letterId) {
  return makeUrl(`/letters/${letterId}`);
}
function makeVerifyEmailUrl(token) {
  return makeUrl("/settings", { verify: token });
}
var init_url = __esm({
  "server/_core/url.ts"() {
    "use strict";
    init_env();
  }
});

// server/_core/push/sendPush.ts
var sendPush_exports = {};
__export(sendPush_exports, {
  isPushConfigured: () => isPushConfigured,
  sendOpenedPush: () => sendOpenedPush,
  sendPushToUser: () => sendPushToUser,
  sendReminderPush: () => sendReminderPush
});
import { eq as eq5 } from "drizzle-orm";
function isPushConfigured() {
  return !!(ENV.vapidPublicKey && ENV.vapidPrivateKey);
}
async function sendPushToUser(userId, payload) {
  const result = { sent: 0, failed: 0, revoked: 0 };
  if (!isPushConfigured()) {
    console.log("[Push] VAPID not configured, skipping push");
    return result;
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Push] Database not available");
    return result;
  }
  const subscriptions = await db.select().from(pushSubscriptions).where(
    eq5(pushSubscriptions.userId, userId)
  );
  const activeSubscriptions = subscriptions.filter((s) => !s.revokedAt);
  if (activeSubscriptions.length === 0) {
    console.log(`[Push] No active subscriptions for user ${userId}`);
    return result;
  }
  console.log(`[Push] Sending to ${activeSubscriptions.length} subscriptions for user ${userId}`);
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
            auth: subscription.auth
          }
        },
        payloadString
      );
      result.sent++;
      console.log(`[Push] Sent to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
    } catch (error) {
      const err = error;
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[Push] Subscription expired, revoking: ${subscription.endpoint.substring(0, 50)}...`);
        await db.update(pushSubscriptions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq5(pushSubscriptions.id, subscription.id));
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
async function sendReminderPush(userId, recipientLabel, daysBefore, letterId) {
  const title = daysBefore === 1 ? "\u{1F4EC} \u660E\u65E5\u304C\u958B\u5C01\u65E5\u3067\u3059" : `\u{1F4EC} \u958B\u5C01\u65E5\u307E\u3067\u3042\u3068${daysBefore}\u65E5`;
  const body = `\u300C${recipientLabel}\u300D\u3078\u306E\u624B\u7D19\u306E\u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059`;
  return sendPushToUser(userId, {
    title,
    body,
    url: `/letters/${letterId}`
  });
}
async function sendOpenedPush(userId, recipientLabel, letterId) {
  return sendPushToUser(userId, {
    title: "\u{1F4D6} \u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F",
    body: `\u300C${recipientLabel}\u300D\u3078\u306E\u624B\u7D19\u304C\u8AAD\u307E\u308C\u307E\u3057\u305F`,
    url: `/letters/${letterId}`
  });
}
var init_sendPush = __esm({
  "server/_core/push/sendPush.ts"() {
    "use strict";
    init_env();
    init_db();
    init_schema();
  }
});

// server/_core/jobs/cleanupNotifications.ts
var cleanupNotifications_exports = {};
__export(cleanupNotifications_exports, {
  cleanupNotifications: () => cleanupNotifications
});
import { and as and5, lt, isNotNull } from "drizzle-orm";
async function cleanupNotifications(days = 90) {
  const executedAt = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[CleanupNotifications] Starting cleanup (days=${days})...`);
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[CleanupNotifications] Database not available, skipping cleanup");
      return { deleted: 0, executedAt, error: "Database not available" };
    }
    const thresholdDate = /* @__PURE__ */ new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const result = await db.delete(notifications).where(
      and5(
        isNotNull(notifications.readAt),
        lt(notifications.createdAt, thresholdDate)
      )
    );
    const deleted = result?.affectedRows ?? 0;
    console.log(`[CleanupNotifications] Completed: ${deleted} notifications deleted`);
    console.log(`[CleanupNotifications] Threshold: ${thresholdDate.toISOString()}`);
    return { deleted, executedAt };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[CleanupNotifications] Failed:", errorMsg);
    return { deleted: 0, executedAt, error: errorMsg };
  }
}
var init_cleanupNotifications = __esm({
  "server/_core/jobs/cleanupNotifications.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/_core/vite.ts
var vite_exports = {};
__export(vite_exports, {
  setupVite: () => setupVite
});
import fs2 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path2.resolve(import.meta.dirname, "../../vite.config.ts"),
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
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
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
var init_vite = __esm({
  "server/_core/vite.ts"() {
    "use strict";
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
init_db();
init_schema();
import { z as z2 } from "zod";
import { eq as eq6, and as and6 } from "drizzle-orm";

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

// server/routers.ts
init_storage();
import { nanoid } from "nanoid";

// server/opentimestamps.ts
init_storage();
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

// server/db_notification.ts
init_schema();
import { eq as eq4, desc as desc3, and as and4, isNull, sql } from "drizzle-orm";
async function createNotification(db, userId, type, title, body, meta) {
  const result = await db.insert(notifications).values({
    userId,
    type,
    title,
    body,
    meta: meta ? JSON.stringify(meta) : null
  });
  return result[0].insertId;
}
async function getNotifications(db, userId, limit = 50, offset = 0) {
  return await db.select().from(notifications).where(eq4(notifications.userId, userId)).orderBy(desc3(notifications.createdAt)).limit(limit).offset(offset);
}
async function getUnreadCount(db, userId) {
  const result = await db.select({ count: sql`COUNT(*)` }).from(notifications).where(and4(
    eq4(notifications.userId, userId),
    isNull(notifications.readAt)
  ));
  return result[0]?.count ?? 0;
}
async function markNotificationAsRead(db, userId, notificationId) {
  const now = /* @__PURE__ */ new Date();
  if (notificationId) {
    await db.update(notifications).set({ readAt: now }).where(and4(
      eq4(notifications.id, notificationId),
      eq4(notifications.userId, userId)
    ));
  } else {
    await db.update(notifications).set({ readAt: now }).where(and4(
      eq4(notifications.userId, userId),
      isNull(notifications.readAt)
    ));
  }
}
async function createReminderNotification(db, userId, letterId, recipientLabel, daysRemaining, unlockAtStr) {
  const title = `\u624B\u7D19\u306E\u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059`;
  const body = `${recipientLabel}\u3078\u306E\u624B\u7D19\u304C${daysRemaining}\u65E5\u5F8C\uFF08${unlockAtStr}\uFF09\u306B\u958B\u5C01\u53EF\u80FD\u306B\u306A\u308A\u307E\u3059\u3002`;
  return await createNotification(db, userId, "reminder_before_unlock", title, body, {
    letterId,
    recipientLabel,
    daysRemaining
  });
}

// server/routers.ts
init_db();

// server/_core/email/sendEmail.ts
init_env();
var RATE_LIMIT_MS = 24 * 60 * 60 * 1e3;
async function sendEmail(params) {
  const provider = ENV.mailProvider;
  console.log(`[Email] Sending via ${provider} to ${params.to}: ${params.subject}`);
  if (provider === "mock") {
    return sendMockEmail(params);
  } else if (provider === "sendgrid") {
    return sendSendGridEmail(params);
  } else {
    console.warn(`[Email] Unknown provider "${provider}", falling back to mock`);
    return sendMockEmail(params);
  }
}
async function sendMockEmail(params) {
  console.log("=".repeat(60));
  console.log("[Email Mock] Would send email:");
  console.log(`  To: ${params.to}`);
  console.log(`  Subject: ${params.subject}`);
  console.log(`  Category: ${params.category || "none"}`);
  console.log(`  Text Preview: ${params.text.substring(0, 200)}...`);
  if (params.meta) {
    console.log(`  Meta: ${JSON.stringify(params.meta)}`);
  }
  console.log("=".repeat(60));
  return { success: true, messageId: `mock-${Date.now()}` };
}
async function sendSendGridEmail(params) {
  if (!ENV.sendgridApiKey) {
    console.error("[Email] SENDGRID_API_KEY not configured");
    return { success: false, error: "SENDGRID_API_KEY not configured" };
  }
  if (!ENV.mailFrom) {
    console.error("[Email] MAIL_FROM not configured");
    return { success: false, error: "MAIL_FROM not configured" };
  }
  try {
    const sgMail = await import("@sendgrid/mail");
    sgMail.default.setApiKey(ENV.sendgridApiKey);
    const msg = {
      to: params.to,
      from: ENV.mailFrom,
      subject: params.subject,
      text: params.text
    };
    if (params.html) {
      msg.html = params.html;
    }
    if (params.category) {
      msg.categories = [params.category];
    }
    const [response] = await sgMail.default.send(msg);
    console.log(`[Email] SendGrid success: ${response.statusCode}`);
    return {
      success: true,
      messageId: response.headers["x-message-id"] || `sg-${Date.now()}`
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Email] SendGrid error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

// server/_core/email/emailTemplates.ts
init_url();
function buildVerificationEmailSubject() {
  return "\u3010SilentMemo\u3011\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u78BA\u8A8D";
}
function buildVerificationEmailHtml(params) {
  const verifyUrl = makeVerifyEmailUrl(params.token);
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u78BA\u8A8D</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h1 style="color: #4F46E5; font-size: 24px; margin: 0 0 16px 0;">
      \u2709\uFE0F \u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u78BA\u8A8D
    </h1>
    <p style="font-size: 16px; margin: 0; color: #3730A3;">
      \u4EE5\u4E0B\u306E\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u3001\u901A\u77E5\u5148\u30E1\u30FC\u30EB\u306E\u8A2D\u5B9A\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002
    </p>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${verifyUrl}" style="display: inline-block; background: #4F46E5; color: #fff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: bold; font-size: 16px;">
      \u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u78BA\u8A8D\u3059\u308B
    </a>
  </div>

  <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <p style="margin: 0; font-size: 14px; color: #78350F;">
      \u26A0\uFE0F \u3053\u306E\u30EA\u30F3\u30AF\u306F24\u6642\u9593\u3067\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u307E\u3059\u3002<br>
      \u304A\u65E9\u3081\u306B\u78BA\u8A8D\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002
    </p>
  </div>

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    \u30DC\u30BF\u30F3\u304C\u30AF\u30EA\u30C3\u30AF\u3067\u304D\u306A\u3044\u5834\u5408\u306F\u3001\u4EE5\u4E0B\u306EURL\u3092\u30D6\u30E9\u30A6\u30B6\u306B\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\uFF1A<br>
    <a href="${verifyUrl}" style="color: #4F46E5; word-break: break-all;">${verifyUrl}</a>
  </p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    \u3053\u306E\u30E1\u30FC\u30EB\u306FSilentMemo\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002<br>
    \u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u3053\u306E\u30E1\u30FC\u30EB\u3092\u7121\u8996\u3057\u3066\u304F\u3060\u3055\u3044\u3002
  </p>
</body>
</html>
  `.trim();
}
function buildVerificationEmailText(params) {
  const verifyUrl = makeVerifyEmailUrl(params.token);
  return `
\u3010SilentMemo\u3011\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u78BA\u8A8D

\u4EE5\u4E0B\u306EURL\u306B\u30A2\u30AF\u30BB\u30B9\u3057\u3066\u3001\u901A\u77E5\u5148\u30E1\u30FC\u30EB\u306E\u8A2D\u5B9A\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002

${verifyUrl}

\u203B \u3053\u306E\u30EA\u30F3\u30AF\u306F24\u6642\u9593\u3067\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u307E\u3059\u3002

---
\u3053\u306E\u30E1\u30FC\u30EB\u306FSilentMemo\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002
\u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u3053\u306E\u30E1\u30FC\u30EB\u3092\u7121\u8996\u3057\u3066\u304F\u3060\u3055\u3044\u3002
  `.trim();
}
function buildOpenNotificationSubject() {
  return "\u3010SilentMemo\u3011\u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F";
}
function buildOpenNotificationHtml(params) {
  const { recipientLabel, openedAt, letterManagementUrl } = params;
  const openedAtStr = openedAt.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo"
  });
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h1 style="color: #059669; font-size: 24px; margin: 0 0 16px 0;">
      \u{1F4D6} \u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F
    </h1>
    <p style="font-size: 18px; margin: 0; color: #047857;">
      \u300C${recipientLabel}\u300D\u3078\u306E\u624B\u7D19\u304C\u8AAD\u307E\u308C\u307E\u3057\u305F
    </p>
  </div>

  <div style="background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="font-size: 16px; color: #6B7280; margin: 0 0 12px 0;">\u958B\u5C01\u65E5\u6642</h2>
    <p style="font-size: 20px; font-weight: bold; color: #1F2937; margin: 0;">
      ${openedAtStr}
    </p>
  </div>

  <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <p style="margin: 0; font-size: 14px; color: #065F46;">
      \u{1F510} \u30BC\u30ED\u77E5\u8B58\u8A2D\u8A08\u306E\u305F\u3081\u3001\u904B\u55B6\u8005\u3082\u624B\u7D19\u306E\u5185\u5BB9\u3092\u8AAD\u3080\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093\u3002<br>
      \u3042\u306A\u305F\u306E\u60F3\u3044\u306F\u5B89\u5168\u306B\u5C4A\u304D\u307E\u3057\u305F\u3002
    </p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${letterManagementUrl}" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
      \u624B\u7D19\u306E\u8A73\u7D30\u3092\u898B\u308B
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
    \u3053\u306E\u30E1\u30FC\u30EB\u306FSilentMemo\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002
  </p>
</body>
</html>
  `.trim();
}
function buildOpenNotificationText(params) {
  const { recipientLabel, openedAt, letterManagementUrl } = params;
  const openedAtStr = openedAt.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo"
  });
  return `
\u3010SilentMemo\u3011\u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F

\u300C${recipientLabel}\u300D\u3078\u306E\u624B\u7D19\u304C\u8AAD\u307E\u308C\u307E\u3057\u305F\u3002

\u25A0 \u958B\u5C01\u65E5\u6642
${openedAtStr}

\u25A0 \u624B\u7D19\u306E\u8A73\u7D30\u3092\u898B\u308B
${letterManagementUrl}

\u203B \u30BC\u30ED\u77E5\u8B58\u8A2D\u8A08\u306E\u305F\u3081\u3001\u904B\u55B6\u8005\u3082\u624B\u7D19\u306E\u5185\u5BB9\u3092\u8AAD\u3080\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093\u3002

---
\u3053\u306E\u30E1\u30FC\u30EB\u306FSilentMemo\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002
  `.trim();
}

// server/routers.ts
init_env();
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
     * 変更時はverified=falseにリセットされ、検証メールを送る
     */
    updateNotificationEmail: protectedProcedure.input(z2.object({
      notificationEmail: z2.string().email().nullable()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.notificationEmail) {
        const verifyToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
        await db.update(users).set({
          notificationEmail: input.notificationEmail,
          notificationEmailVerified: false,
          notificationEmailVerifyToken: verifyToken,
          notificationEmailVerifyExpiresAt: expiresAt
        }).where(eq6(users.id, ctx.user.id));
        try {
          const subject = buildVerificationEmailSubject();
          const html = buildVerificationEmailHtml({ token: verifyToken, email: input.notificationEmail });
          const text2 = buildVerificationEmailText({ token: verifyToken, email: input.notificationEmail });
          await sendEmail({
            to: input.notificationEmail,
            subject,
            text: text2,
            html,
            category: "email_verification",
            meta: { userId: ctx.user.id }
          });
          console.log(`[Email Verification] Sent to ${input.notificationEmail}`);
        } catch (emailErr) {
          console.warn(`[Email Verification] Failed to send:`, emailErr);
        }
        return { success: true, requiresVerification: true };
      } else {
        await db.update(users).set({
          notificationEmail: null,
          notificationEmailVerified: false,
          notificationEmailVerifyToken: null,
          notificationEmailVerifyExpiresAt: null
        }).where(eq6(users.id, ctx.user.id));
        return { success: true, requiresVerification: false };
      }
    }),
    /**
     * メール検証トークンで確認
     */
    verifyNotificationEmail: publicProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(users).where(eq6(users.notificationEmailVerifyToken, input.token)).limit(1);
      if (result.length === 0) {
        return { success: false, error: "invalid_token" };
      }
      const user = result[0];
      const now = /* @__PURE__ */ new Date();
      if (user.notificationEmailVerifyExpiresAt && user.notificationEmailVerifyExpiresAt < now) {
        return { success: false, error: "token_expired" };
      }
      await db.update(users).set({
        notificationEmailVerified: true,
        notificationEmailVerifyToken: null,
        notificationEmailVerifyExpiresAt: null
      }).where(eq6(users.id, user.id));
      return { success: true };
    }),
    /**
     * 現在の設定を取得
     */
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      return {
        notificationEmail: ctx.user.notificationEmail || null,
        notificationEmailVerified: ctx.user.notificationEmailVerified ?? false,
        trustedContactEmail: ctx.user.trustedContactEmail || null,
        accountEmail: ctx.user.email || null,
        notifyEnabled: ctx.user.notifyEnabled ?? true,
        notifyDaysBefore: ctx.user.notifyDaysBefore ?? 7
      };
    }),
    /**
     * 信頼できる通知先メールを更新
     * 配偶者などの通知先（リマインド/初回開封通知を送信）
     */
    updateTrustedContactEmail: protectedProcedure.input(z2.object({
      trustedContactEmail: z2.string().email().nullable()
    })).mutation(async ({ ctx, input }) => {
      await updateUserTrustedContactEmail(ctx.user.id, input.trustedContactEmail);
      return { success: true };
    }),
    /**
     * リマインド通知設定を更新
     */
    updateNotificationSettings: protectedProcedure.input(z2.object({
      notifyEnabled: z2.boolean(),
      notifyDaysBefore: z2.number().int().min(1).max(365)
    })).mutation(async ({ ctx, input }) => {
      await updateUserNotificationSettings(ctx.user.id, input.notifyEnabled, input.notifyDaysBefore);
      const letters2 = await getLettersByAuthor(ctx.user.id);
      const futureLetters = letters2.filter(
        (l) => l.unlockAt && new Date(l.unlockAt) > /* @__PURE__ */ new Date() && !l.unlockedAt
      );
      for (const letter of futureLetters) {
        if (!input.notifyEnabled) {
          await deleteRemindersByLetterId2(letter.id);
        } else {
          await updateLetterReminders2(letter.id, ctx.user.id, new Date(letter.unlockAt), [input.notifyDaysBefore]);
        }
      }
      return { success: true };
    }),
    /**
     * アカウント完全削除
     * すべてのデータを削除: 手紙、下書き、リマインダー、プッシュ購読
     */
    deleteAccount: protectedProcedure.input(z2.object({
      confirmEmail: z2.string().email()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.confirmEmail !== ctx.user.email) {
        throw new Error("\u78BA\u8A8D\u7528\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
      }
      const userId = ctx.user.id;
      try {
        const { storageDelete: storageDelete2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        const letters2 = await getLettersByAuthor(userId);
        for (const letter of letters2) {
          const parseKey = (url) => url?.match(/miraibin\.firebasestorage\.app\/(.+)$/)?.[1];
          const keys = [parseKey(letter.audioUrl), parseKey(letter.ciphertextUrl), parseKey(letter.encryptedAudioUrl)].filter(Boolean);
          for (const key of keys) await storageDelete2(key).catch(() => {
          });
          await deleteRemindersByLetterId2(letter.id);
          await deleteLetter(letter.id);
        }
        const drafts2 = await getDraftsByUser(userId);
        for (const draft of drafts2) {
          if (draft.audioUrl) {
            const key = draft.audioUrl.match(/miraibin\.firebasestorage\.app\/(.+)$/)?.[1];
            if (key) await storageDelete2(key).catch(() => {
            });
          }
          await deleteDraft(draft.id);
        }
        await db.delete(pushSubscriptions).where(eq6(pushSubscriptions.userId, userId));
        await db.delete(users).where(eq6(users.id, userId));
        console.log(`[Account Deletion] User ${userId} deleted`);
        return { success: true };
      } catch (error) {
        console.error(`[Account Deletion] Failed:`, error);
        throw new Error("\u30A2\u30AB\u30A6\u30F3\u30C8\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      }
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
    }),
    // ============================================
    // Push Notification Subscription Management
    // ============================================
    /**
     * Get VAPID public key for client subscription
     */
    getVapidPublicKey: publicProcedure.query(() => {
      return { publicKey: ENV.vapidPublicKey || null };
    }),
    /**
     * Get push subscription status for current user
     */
    getPushStatus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { subscriptions: [], isConfigured: false };
      const subs = await db.select({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        createdAt: pushSubscriptions.createdAt,
        revokedAt: pushSubscriptions.revokedAt
      }).from(pushSubscriptions).where(eq6(pushSubscriptions.userId, ctx.user.id));
      return {
        subscriptions: subs.filter((s) => !s.revokedAt),
        isConfigured: !!ENV.vapidPublicKey
      };
    }),
    /**
     * Register push subscription
     */
    registerPushSubscription: protectedProcedure.input(z2.object({
      endpoint: z2.string().url(),
      p256dh: z2.string(),
      auth: z2.string(),
      userAgent: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(pushSubscriptions).where(eq6(pushSubscriptions.endpoint, input.endpoint)).limit(1);
      if (existing.length > 0) {
        await db.update(pushSubscriptions).set({
          userId: ctx.user.id,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent || null,
          revokedAt: null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq6(pushSubscriptions.endpoint, input.endpoint));
        return { success: true, action: "updated" };
      }
      await db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent || null
      });
      return { success: true, action: "created" };
    }),
    /**
     * Unregister push subscription
     */
    unregisterPushSubscription: protectedProcedure.input(z2.object({
      endpoint: z2.string().url()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(pushSubscriptions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(
        and6(
          eq6(pushSubscriptions.userId, ctx.user.id),
          eq6(pushSubscriptions.endpoint, input.endpoint)
        )
      );
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
      // 暗号化済み音声（ゼロ知識）
      encryptedAudioUrl: z2.string().optional(),
      encryptedAudioIv: z2.string().optional(),
      encryptedAudioMimeType: z2.string().optional(),
      encryptedAudioByteSize: z2.number().optional(),
      encryptedAudioDurationSec: z2.number().optional(),
      encryptedAudioCryptoVersion: z2.string().optional(),
      // 証跡
      proofHash: z2.string(),
      // タイムロック
      unlockAt: z2.date().optional(),
      unlockPolicy: z2.string().optional(),
      // Shamir（クライアント分割済み）
      useShamir: z2.boolean().default(true),
      serverShare: z2.string(),
      // クライアントで分割済みのserverShare
      // 公開スコープ
      visibilityScope: z2.enum(["private", "family", "link"]).default("private"),
      familyId: z2.number().nullable().optional()
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
        // 暗号化済み音声
        encryptedAudioUrl: input.encryptedAudioUrl,
        encryptedAudioIv: input.encryptedAudioIv,
        encryptedAudioMimeType: input.encryptedAudioMimeType,
        encryptedAudioByteSize: input.encryptedAudioByteSize,
        encryptedAudioDurationSec: input.encryptedAudioDurationSec,
        encryptedAudioCryptoVersion: input.encryptedAudioCryptoVersion,
        proofHash: input.proofHash,
        unlockAt: input.unlockAt,
        unlockPolicy: input.unlockPolicy || "datetime",
        status: "sealed",
        proofCreatedAt: /* @__PURE__ */ new Date(),
        // Shamirシェア（serverShareのみ保存）
        serverShare: input.serverShare,
        useShamir: input.useShamir,
        // 公開スコープ
        visibilityScope: input.visibilityScope,
        familyId: input.familyId ?? null
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
          console.warn(`[OTS] Failed to stamp letter ${letterId}: `, result.error);
        }
      }).catch((error) => {
        console.error(`[OTS] Error stamping letter ${letterId}: `, error);
      });
      if (input.unlockAt && ctx.user.notifyEnabled !== false) {
        const daysBefore = ctx.user.notifyDaysBefore ?? 7;
        createRemindersForLetter2(letterId, ctx.user.id, new Date(input.unlockAt), [daysBefore]).catch((err) => {
          console.warn(`[Reminder] Failed to create reminder for letter ${letterId}:`, err);
        });
      }
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
    list: protectedProcedure.input(z2.object({ scope: z2.enum(["private", "family", "link"]) })).query(async ({ ctx, input }) => {
      return await getLettersByScope(ctx.user.id, input.scope);
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
      const existingToken = await getActiveShareToken2(input.id);
      if (existingToken) {
        return { shareToken: existingToken.token };
      }
      if (letter.shareToken) {
        await migrateShareTokenIfNeeded2(input.id, letter.shareToken);
        return { shareToken: letter.shareToken };
      }
      const shareToken = nanoid(21);
      await createShareToken2(input.id, shareToken);
      await updateLetterShareToken(input.id, shareToken);
      await updateLetter(input.id, { visibilityScope: "link", familyId: null });
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
        await migrateShareTokenIfNeeded2(input.letterId, letter.shareToken);
      }
      const result = await revokeShareToken2(input.letterId, input.reason);
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
        await migrateShareTokenIfNeeded2(input.letterId, letter.shareToken);
      }
      const newToken = nanoid(21);
      const result = await rotateShareToken2(input.letterId, newToken);
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
          await deleteRemindersByLetterId2(input.letterId);
        } else {
          await updateLetterReminders2(
            input.letterId,
            ctx.user.id,
            newUnlockAt,
            input.reminderDaysBeforeList
          );
        }
      }
      const reminders = await getRemindersByLetterId2(input.letterId);
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
      const activeToken = await getActiveShareToken2(input.letterId);
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
          title: "SilentMemo - \u5927\u5207\u306A\u4EBA\u3078\u306E\u624B\u7D19",
          description: "\u672A\u6765\u306E\u7279\u5225\u306A\u65E5\u306B\u5C4A\u304F\u624B\u7D19\u304C\u3042\u306A\u305F\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u3002"
        };
      }
      const tokenRecord = await getShareTokenRecord2(input.shareToken);
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
        await incrementShareTokenViewCount2(input.shareToken);
      }
      const letter = await getLetterByShareToken(input.shareToken);
      if (!letter) {
        return { error: "not_found" };
      }
      if (letter.visibilityScope !== "link") {
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
        // 暗号化済み音声（開封日時後のみ提供）
        encryptedAudio: letter.encryptedAudioUrl ? {
          url: letter.encryptedAudioUrl,
          iv: letter.encryptedAudioIv,
          mimeType: letter.encryptedAudioMimeType,
          byteSize: letter.encryptedAudioByteSize,
          durationSec: letter.encryptedAudioDurationSec,
          cryptoVersion: letter.encryptedAudioCryptoVersion
        } : null,
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
      shareToken: z2.string(),
      userAgent: z2.string().optional()
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
      const isFirstOpen = await unlockLetter(letter.id, input.userAgent);
      if (isFirstOpen) {
        try {
          const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
          const unlockTimeStr = (/* @__PURE__ */ new Date()).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
          await notifyOwner2({
            title: `SilentMemo: \u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F`,
            content: `\u3042\u306A\u305F\u306E\u624B\u7D19\u304C\u958B\u5C01\u3055\u308C\u307E\u3057\u305F\u3002

\u5B9B\u5148: ${letter.recipientName || "\u672A\u8A2D\u5B9A"} 
\u958B\u5C01\u65E5\u6642: ${unlockTimeStr} 

\u203B \u672C\u6587\u306F\u30BC\u30ED\u77E5\u8B58\u8A2D\u8A08\u306E\u305F\u3081\u3001\u904B\u55B6\u8005\u3082\u8AAD\u3081\u307E\u305B\u3093\u3002`
          });
        } catch (err) {
          console.warn("[markOpened] Failed to notify owner (Manus):", err);
        }
        try {
          const db = await getDb();
          if (db) {
            const ownerResult = await db.select({
              email: users.email,
              notificationEmail: users.notificationEmail,
              notificationEmailVerified: users.notificationEmailVerified
            }).from(users).where(eq6(users.id, letter.authorId)).limit(1);
            const owner = ownerResult[0];
            if (owner) {
              const ownerEmail = owner.notificationEmail || owner.email;
              const isVerified = owner.notificationEmailVerified || !owner.notificationEmail;
              if (ownerEmail && isVerified) {
                const recipientLabel = letter.recipientName || "\u5927\u5207\u306A\u4EBA";
                const letterManagementUrl = `${ENV.appBaseUrl}/letters/${letter.id}`;
                const subject = buildOpenNotificationSubject();
                const html = buildOpenNotificationHtml({
                  recipientLabel,
                  openedAt: /* @__PURE__ */ new Date(),
                  letterManagementUrl
                });
                const text2 = buildOpenNotificationText({
                  recipientLabel,
                  openedAt: /* @__PURE__ */ new Date(),
                  letterManagementUrl
                });
                await sendEmail({
                  to: ownerEmail,
                  subject,
                  text: text2,
                  html,
                  category: "letter_opened",
                  meta: { letterId: letter.id }
                });
                console.log(`[markOpened] Open notification email sent to ${ownerEmail}`);
              }
            }
          }
        } catch (emailErr) {
          console.warn("[markOpened] Failed to send open notification email:", emailErr);
        }
        try {
          const { sendOpenedPush: sendOpenedPush2 } = await Promise.resolve().then(() => (init_sendPush(), sendPush_exports));
          const recipientLabel = letter.recipientName || "\u5927\u5207\u306A\u4EBA";
          const pushResult = await sendOpenedPush2(
            letter.authorId,
            recipientLabel,
            letter.id
          );
          if (pushResult.sent > 0) {
            console.log(`[markOpened] Push sent to ${pushResult.sent} devices`);
          }
        } catch (pushErr) {
          console.warn("[markOpened] Failed to send open notification push:", pushErr);
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
      const reminders = await getRemindersByLetterId2(input.letterId);
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
        await deleteRemindersByLetterId2(input.letterId);
        return { success: true, reminders: [] };
      }
      await updateLetterReminders2(
        input.letterId,
        ctx.user.id,
        letter.unlockAt,
        input.daysBeforeList
      );
      const reminders = await getRemindersByLetterId2(input.letterId);
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
      await deleteRemindersByLetterId2(input.letterId);
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
      const fileKey = `audio / ${ctx.user.id}/${nanoid()}.webm`;
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
    }),
    /**
     * 暗号化済み音声アップロード（ゼロ知識設計）
     * 
     * - クライアント側で暗号化された音声をアップロード
     * - サーバーは暗号文のみを保存（平文にアクセス不可）
     */
    uploadEncryptedAudio: protectedProcedure.input(z2.object({
      encryptedAudioBase64: z2.string(),
      // 暗号化済み音声のBase64
      mimeType: z2.string(),
      // 元の音声のMIMEタイプ
      byteSize: z2.number()
      // 暗号文サイズ
    })).mutation(async ({ ctx, input }) => {
      const MAX_SIZE = 10 * 1024 * 1024;
      if (input.byteSize > MAX_SIZE) {
        throw new Error(`\u97F3\u58F0\u30D5\u30A1\u30A4\u30EB\u304C\u5927\u304D\u3059\u304E\u307E\u3059\uFF08\u4E0A\u9650: ${MAX_SIZE / 1024 / 1024}MB\uFF09`);
      }
      const buffer = Buffer.from(input.encryptedAudioBase64, "base64");
      const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp4") ? "m4a" : "enc";
      const fileKey = `encrypted-audio/${ctx.user.id}/${nanoid()}.${ext}.enc`;
      const { url } = await storagePut(fileKey, buffer, "application/octet-stream");
      return { url, key: fileKey };
    })
  }),
  // ============================================
  // AI Interview Router（自分史インタビュー）
  // ============================================
  interview: router({
    /**
     * セッション開始（または既存のactiveなセッションを返す）
     */
    create: protectedProcedure.input(z2.object({
      recipientName: z2.string().optional(),
      topic: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const activeSession = await getActiveInterviewSession(ctx.user.id);
      if (activeSession) {
        return { sessionId: activeSession.id, isNew: false };
      }
      const sessionId = await createInterviewSession(
        ctx.user.id,
        input.recipientName,
        input.topic
      );
      const systemPrompt = `
\u3042\u306A\u305F\u306F\u300CSilentMemo\u300D\u3068\u3044\u3046\u30B5\u30FC\u30D3\u30B9\u306EAI\u30A4\u30F3\u30BF\u30D3\u30E5\u30A2\u30FC\u3067\u3059\u3002
\u30E6\u30FC\u30B6\u30FC\u306F\u300C\u81EA\u5206\u53F2\u624B\u7D19\u300D\u3084\u300C\u5927\u5207\u306A\u4EBA\u3078\u306E\u624B\u7D19\u300D\u3092\u66F8\u3053\u3046\u3068\u3057\u3066\u3044\u307E\u3059\u304C\u3001\u4F55\u3092\u66F8\u3051\u3070\u3044\u3044\u304B\u60A9\u3093\u3067\u3044\u307E\u3059\u3002
\u3042\u306A\u305F\u306E\u5F79\u5272\u306F\u3001\u30E6\u30FC\u30B6\u30FC\u306B\u512A\u3057\u304F\u8CEA\u554F\u3092\u6295\u3052\u304B\u3051\u3001\u5FC3\u306E\u4E2D\u306B\u3042\u308B\u60F3\u3044\u3084\u30A8\u30D4\u30BD\u30FC\u30C9\u3092\u5F15\u304D\u51FA\u3059\u3053\u3068\u3067\u3059\u3002

\u30EB\u30FC\u30EB:
- \u76F8\u624B\u306F\u53CB\u9054\u611F\u899A\u3067\u8A71\u305B\u308B\u3088\u3046\u306B\u3001\u5C11\u3057\u7815\u3051\u305F\u4E01\u5BE7\u8A9E\uFF08\u3067\u3059\u30FB\u307E\u3059\u8ABF\u3060\u304C\u5805\u82E6\u3057\u304F\u306A\u3044\uFF09\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002
- \u6700\u521D\u306E\u6328\u62F6\u3068\u3057\u3066\u3001\u30E6\u30FC\u30B6\u30FC\u304C\u30EA\u30E9\u30C3\u30AF\u30B9\u3067\u304D\u308B\u3088\u3046\u306B\u58F0\u3092\u304B\u3051\u3001\u8AB0\u306B\u3069\u3093\u306A\u624B\u7D19\u3092\u66F8\u304D\u305F\u3044\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002
- \u8CEA\u554F\u306F\u4E00\u5EA6\u306B1\u3064\u3060\u3051\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
- \u76F8\u624B\u306E\u8A71\u3092\u5426\u5B9A\u305B\u305A\u3001\u5171\u611F\u3057\u3066\u304F\u3060\u3055\u3044\u3002
        `;
      const messages = [{ role: "system", content: systemPrompt }];
      let aiResponse = "";
      try {
        const result = await invokeLLM({ messages });
        const content = result.choices[0]?.message?.content;
        aiResponse = typeof content === "string" ? content : "\u3053\u3093\u306B\u3061\u306F\u3002";
      } catch (e) {
        aiResponse = "\u3053\u3093\u306B\u3061\u306F\u3002\u4ECA\u65E5\u306F\u3069\u306E\u3088\u3046\u306A\u624B\u7D19\u3092\u66F8\u304D\u305F\u3044\u3067\u3059\u304B\uFF1F\u4E00\u7DD2\u306B\u304A\u8A71\u3057\u3057\u306A\u304C\u3089\u898B\u3064\u3051\u3066\u3044\u304D\u307E\u3057\u3087\u3046\u3002";
      }
      await addInterviewMessage(sessionId, "ai", aiResponse);
      return { sessionId, isNew: true, message: aiResponse };
    }),
    /**
     * 履歴取得
     */
    getHistory: protectedProcedure.input(z2.object({ sessionId: z2.number() })).query(async ({ ctx, input }) => {
      const session = await getInterviewSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      return await getInterviewHistory(input.sessionId);
    }),
    /**
     * メッセージ送信
     */
    sendMessage: protectedProcedure.input(z2.object({
      sessionId: z2.number(),
      message: z2.string()
    })).mutation(async ({ ctx, input }) => {
      const session = await getInterviewSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      if (session.status === "completed") {
        throw new Error("\u3053\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u306F\u7D42\u4E86\u3057\u3066\u3044\u307E\u3059");
      }
      await addInterviewMessage(input.sessionId, "user", input.message);
      const history = await getInterviewHistory(input.sessionId);
      const systemPrompt = `
\u3042\u306A\u305F\u306F\u300CSilentMemo\u300D\u3068\u3044\u3046\u30B5\u30FC\u30D3\u30B9\u306EAI\u30A4\u30F3\u30BF\u30D3\u30E5\u30A2\u30FC\u3067\u3059\u3002
\u30E6\u30FC\u30B6\u30FC\u306E\u30A8\u30D4\u30BD\u30FC\u30C9\u3092\u5F15\u304D\u51FA\u3057\u3001\u6700\u7D42\u7684\u306B\u611F\u52D5\u7684\u306A\u624B\u7D19\u304C\u66F8\u3051\u308B\u3088\u3046\u306B\u5C0E\u3044\u3066\u304F\u3060\u3055\u3044\u3002

\u73FE\u5728\u306E\u72B6\u6CC1:
- \u5B9B\u5148: ${session.recipientName || "\u672A\u5B9A"}
- \u30C8\u30D4\u30C3\u30AF: ${session.topic || "\u81EA\u5206\u53F2"}

\u30EB\u30FC\u30EB:
- \u77ED\u304F\u7C21\u6F54\u306B\u8FD4\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u9577\u6587\u306F\u907F\u3051\u308B\uFF09\u3002
- \u30E6\u30FC\u30B6\u30FC\u306E\u56DE\u7B54\u306B\u5BFE\u3057\u3066\u300C\u305D\u308C\u306F\u7D20\u6575\u3067\u3059\u306D\u300D\u300C\u5927\u5909\u3067\u3057\u305F\u306D\u300D\u306A\u3069\u5171\u611F\u30FB\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u5165\u308C\u3066\u304B\u3089\u3001\u6B21\u306E\u8CEA\u554F\u3092\u3057\u3066\u304F\u3060\u3055\u3044\u3002
- \u8CEA\u554F\u306F\u300C\u5177\u4F53\u7684\u306B\u300D\u300C\u305D\u306E\u6642\u3069\u3046\u611F\u3058\u305F\u304B\u300D\u306A\u3069\u6DF1\u6398\u308A\u3059\u308B\u3082\u306E\u304C\u826F\u3044\u3067\u3059\u3002
- \u4E00\u5EA6\u306B\u8907\u6570\u306E\u8CEA\u554F\u3092\u305B\u305A\u30011\u3064\u305A\u3064\u805E\u3044\u3066\u304F\u3060\u3055\u3044\u3002
- 5\u301C10\u5F80\u5FA9\u7A0B\u5EA6\u4F1A\u8A71\u304C\u9032\u3093\u3060\u3089\u3001\u300C\u305D\u308D\u305D\u308D\u624B\u7D19\u306E\u4E0B\u66F8\u304D\u3092\u66F8\u3044\u3066\u307F\u307E\u3057\u3087\u3046\u304B\uFF1F\u300D\u3068\u63D0\u6848\u3057\u3066\u3082\u826F\u3044\u3067\u3059\u3002
        `;
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map((msg) => ({
          role: msg.sender === "ai" ? "assistant" : "user",
          content: msg.content
        }))
      ];
      let aiResponse = "";
      try {
        const result = await invokeLLM({ messages });
        const content = result.choices[0]?.message?.content;
        aiResponse = typeof content === "string" ? content : "";
      } catch (e) {
        console.error("LLM Error:", e);
        aiResponse = "\u3059\u307F\u307E\u305B\u3093\u3001\u5C11\u3057\u8003\u3048\u4E8B\u3092\u3057\u3066\u3044\u307E\u3059\u3002\u3082\u3046\u4E00\u5EA6\u6559\u3048\u3066\u3044\u305F\u3060\u3051\u307E\u3059\u304B\uFF1F";
      }
      await addInterviewMessage(input.sessionId, "ai", aiResponse);
      return { message: aiResponse };
    }),
    /**
     * ドラフト生成
     */
    generateDraft: protectedProcedure.input(z2.object({ sessionId: z2.number() })).mutation(async ({ ctx, input }) => {
      const session = await getInterviewSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      const history = await getInterviewHistory(input.sessionId);
      const prompt = `
\u4EE5\u4E0B\u306E\u4F1A\u8A71\u30ED\u30B0\u3092\u5143\u306B\u3001${session.recipientName || "\u5927\u5207\u306A\u4EBA"}\u3078\u9001\u308B\u624B\u7D19\u306E\u4E0B\u66F8\u304D\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

[\u4F1A\u8A71\u30ED\u30B0]
${history.map((m) => `${m.sender}: ${m.content}`).join("\n")}

\u4F5C\u6210\u30EB\u30FC\u30EB:
- \u611F\u52D5\u7684\u3067\u6E29\u304B\u3044\u30C8\u30FC\u30F3\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
- \u4F1A\u8A71\u306E\u4E2D\u3067\u51FA\u3066\u304D\u305F\u5177\u4F53\u7684\u306A\u30A8\u30D4\u30BD\u30FC\u30C9\u3092\u76DB\u308A\u8FBC\u3093\u3067\u304F\u3060\u3055\u3044\u3002
- \u69CB\u6210\u306F\u300C\u4EF6\u540D\u300D\u3068\u300C\u672C\u6587\u300D\u306B\u5206\u3051\u3066\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002JSON\u5F62\u5F0F\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u4F8B: {"title": "\u4EF6\u540D...", "body": "\u672C\u6587..."}
JSON\u4EE5\u5916\u306E\u4F59\u8A08\u306A\u6587\u5B57\u306F\u542B\u3081\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002
        `;
      const messages = [{ role: "user", content: prompt }];
      let draftTitle = "AI\u5BFE\u8A71\u304B\u3089\u306E\u4E0B\u66F8\u304D";
      let draftBody = "";
      try {
        const result = await invokeLLM({ messages });
        const content = result.choices[0]?.message?.content;
        const resultText = typeof content === "string" ? content : "";
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          draftTitle = json.title || draftTitle;
          draftBody = json.body || resultText;
        } else {
          draftBody = resultText;
        }
      } catch (e) {
        console.error("Draft Generation Error:", e);
        draftBody = "\u4E0B\u66F8\u304D\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u4F1A\u8A71\u5C65\u6B74\u304B\u3089\u81EA\u5206\u3067\u66F8\u3044\u3066\u307F\u307E\u3057\u3087\u3046\uFF01";
      }
      await completeInterviewSession(input.sessionId);
      const draftId = await createDraft({
        userId: ctx.user.id,
        recipientName: session.recipientName,
        aiDraft: draftBody
      });
      return { draftId, content: draftBody, title: draftTitle };
    })
  }),
  family: router({
    /**
     * 自分が所属する家族グループを取得
     */
    getMyFamily: protectedProcedure.query(async ({ ctx }) => {
      return await getFamilyMemberships(ctx.user.id);
    }),
    /**
     * 家族グループを作成（まだ持っていない場合）
     */
    create: protectedProcedure.input(z2.object({ name: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const existing = await getFamilyByOwner(ctx.user.id);
      if (existing) {
        return { id: existing.id, alreadyExists: true };
      }
      const familyId = await createFamily(ctx.user.id, input.name);
      return { id: familyId, alreadyExists: false };
    }),
    /**
     * 招待を作成（メールアドレス指定）
     * ※ メール送信は次フェーズ。まずはtoken表示で対応
     */
    inviteByEmail: protectedProcedure.input(z2.object({
      familyId: z2.number(),
      email: z2.string().email()
    })).mutation(async ({ ctx, input }) => {
      const family = await getFamilyByOwner(ctx.user.id);
      if (!family || family.id !== input.familyId) {
        throw new Error("\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093");
      }
      const token = nanoid(21);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      await createFamilyInvite(input.familyId, input.email, token, expiresAt);
      return {
        token,
        inviteUrl: `/family/invite/${token}`,
        expiresAt: expiresAt.toISOString()
      };
    }),
    /**
     * 招待を受諾
     */
    acceptInvite: protectedProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ ctx, input }) => {
      return await acceptFamilyInvite(input.token, ctx.user.id);
    }),
    /**
     * 家族メンバー一覧を取得
     */
    listMembers: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      const isMember = await isUserFamilyMember(ctx.user.id, input.familyId);
      if (!isMember) {
        return { members: [], error: "\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093" };
      }
      const members = await getFamilyMembers(input.familyId);
      return { members };
    }),
    /**
     * 招待一覧を取得（オーナーのみ）
     */
    listInvites: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      const family = await getFamilyByOwner(ctx.user.id);
      if (!family || family.id !== input.familyId) {
        return { invites: [], error: "\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093" };
      }
      const invites = await getFamilyInvites(input.familyId);
      return { invites };
    })
  }),
  // ============================================
  // Notification Router (In-App Inbox)
  // ============================================
  notification: router({
    /**
     * Get user's notifications (newest first)
     */
    list: protectedProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50),
      offset: z2.number().min(0).default(0)
    })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { notifications: [] };
      const items = await getNotifications(db, ctx.user.id, input.limit, input.offset);
      return { notifications: items };
    }),
    /**
     * Get unread notification count (for badge)
     */
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { count: 0 };
      const count = await getUnreadCount(db, ctx.user.id);
      return { count };
    }),
    /**
     * Mark notification(s) as read
     */
    markRead: protectedProcedure.input(z2.object({
      notificationId: z2.number().optional()
      // If omitted, mark all as read
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await markNotificationAsRead(db, ctx.user.id, input.notificationId);
      return { success: true };
    })
  }),
  // ============================================
  // Admin Router (Owner-only operations)
  // ============================================
  admin: router({
    /**
     * Manual cleanup of old read notifications
     * Only accessible by app owner (OWNER_OPEN_ID)
     */
    cleanupNotifications: protectedProcedure.input(z2.object({
      days: z2.number().min(1).max(365).default(90)
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId) {
        return { success: false, error: "unauthorized", deleted: 0 };
      }
      try {
        const { cleanupNotifications: cleanupNotifications2 } = await Promise.resolve().then(() => (init_cleanupNotifications(), cleanupNotifications_exports));
        const result = await cleanupNotifications2(input.days);
        return { success: true, ...result };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Admin] Cleanup failed:", errorMsg);
        return { success: false, error: errorMsg, deleted: 0 };
      }
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

// server/_core/sdk.ts
init_db();

// server/_core/firebaseAdmin.ts
import admin2 from "firebase-admin";
var firebaseApp2;
try {
  firebaseApp2 = admin2.app();
} catch {
  firebaseApp2 = admin2.initializeApp({
    projectId: "miraibin"
  });
}
var firebaseAuth = admin2.auth(firebaseApp2);
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

// server/_core/static.ts
import express from "express";
import fs from "fs";
import path from "path";
function serveStatic(app2) {
  const distPath = process.env.NODE_ENV === "development" ? path.resolve(import.meta.dirname, "../..", "dist", "public") : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/reminderBatch.ts
init_db();
init_db();

// server/reminderMailer.ts
function buildReminderSubject(daysBefore) {
  if (daysBefore === 1) {
    return "\u3010SilentMemo\u3011\u660E\u65E5\u304C\u958B\u5C01\u65E5\u3067\u3059";
  }
  return `\u3010SilentMemo\u3011\u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059\uFF08\u3042\u3068${daysBefore}\u65E5\uFF09`;
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
    \u3053\u306E\u30E1\u30FC\u30EB\u306FSilentMemo\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002<br>
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
\u3010SilentMemo\u3011\u958B\u5C01\u65E5\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059

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
\u3053\u306E\u30E1\u30FC\u30EB\u306FSilentMemo\u304B\u3089\u306E\u81EA\u52D5\u9001\u4FE1\u3067\u3059\u3002
\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u8A2D\u5B9A\u306F\u30DE\u30A4\u30EC\u30BF\u30FC\u304B\u3089\u5909\u66F4\u3067\u304D\u307E\u3059\u3002
  `.trim();
}
async function sendReminderEmail(params) {
  const { to } = params;
  const subject = buildReminderSubject(params.daysBefore);
  const html = buildReminderBodyHtml(params);
  const text2 = buildReminderBodyText(params);
  try {
    const result = await sendEmail({
      to,
      subject,
      text: text2,
      html,
      category: "reminder",
      meta: {
        letterId: params.letterId,
        daysBefore: params.daysBefore
      }
    });
    if (result.success) {
      console.log(`[ReminderMailer] Reminder sent to ${to}: ${subject}`);
      return true;
    } else {
      console.warn(`[ReminderMailer] Failed to send reminder: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.warn("[ReminderMailer] Error sending reminder:", error);
    return false;
  }
}

// server/reminderBatch.ts
import { format } from "date-fns";
import { ja } from "date-fns/locale";
async function runReminderBatch() {
  const result = {
    processed: 0,
    sent: 0,
    inboxCreated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  console.log("[ReminderBatch] Starting batch processing...");
  const reminders = await getPendingReminders2(100);
  console.log(`[ReminderBatch] Found ${reminders.length} pending reminders`);
  for (const reminder of reminders) {
    result.processed++;
    if (!reminder.letter) {
      console.warn(`[ReminderBatch] Letter not found for reminder ${reminder.id}`);
      await markReminderAsFailed2(reminder.id, "Letter not found");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "Letter not found" });
      continue;
    }
    if (!reminder.user) {
      console.warn(`[ReminderBatch] User not found for reminder ${reminder.id}`);
      await markReminderAsFailed2(reminder.id, "User not found");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "User not found" });
      continue;
    }
    const ownerEmail = reminder.user.notificationEmail || reminder.user.email;
    const trustedEmail = reminder.user.trustedContactEmail;
    if (!ownerEmail && !trustedEmail) {
      console.warn(`[ReminderBatch] No email for reminder ${reminder.id}`);
      await markReminderAsFailed2(reminder.id, "No email address");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "No email address" });
      continue;
    }
    if (!reminder.letter.unlockAt) {
      console.warn(`[ReminderBatch] No unlock date for reminder ${reminder.id}`);
      await markReminderAsFailed2(reminder.id, "No unlock date");
      result.failed++;
      result.errors.push({ reminderId: reminder.id, error: "No unlock date" });
      continue;
    }
    try {
      const db = await getDb();
      if (db) {
        const unlockAtStr = format(new Date(reminder.letter.unlockAt), "yyyy\u5E74MM\u6708dd\u65E5 HH:mm", { locale: ja });
        const recipientLabel = reminder.letter.recipientName || "\uFF08\u5B9B\u540D\u672A\u8A2D\u5B9A\uFF09";
        await createReminderNotification(
          db,
          reminder.ownerUserId,
          reminder.letterId,
          recipientLabel,
          reminder.daysBefore,
          unlockAtStr
        );
        result.inboxCreated++;
        console.log(`[ReminderBatch] Created inbox notification for reminder ${reminder.id}`);
      }
    } catch (inboxError) {
      console.warn(`[ReminderBatch] Failed to create inbox notification for ${reminder.id}:`, inboxError);
    }
    const { getAppBaseUrl: getAppBaseUrl2 } = await Promise.resolve().then(() => (init_url(), url_exports));
    const baseUrl = getAppBaseUrl2();
    const letterManagementUrl = `${baseUrl}/letters/${reminder.letterId}`;
    const baseEmailParams = {
      recipientName: reminder.letter.recipientName,
      unlockAt: reminder.letter.unlockAt,
      daysBefore: reminder.daysBefore,
      letterId: reminder.letterId,
      letterManagementUrl
    };
    let ownerSent = false;
    const isOwnerEmailVerified = reminder.user.notificationEmailVerified;
    if (ownerEmail && isOwnerEmailVerified) {
      ownerSent = await sendReminderEmail({ ...baseEmailParams, to: ownerEmail });
      if (ownerSent) {
        console.log(`[ReminderBatch] Sent reminder ${reminder.id} to owner: ${ownerEmail}`);
      }
    } else if (ownerEmail && !isOwnerEmailVerified) {
      console.log(`[ReminderBatch] Skipping email to ${ownerEmail} for reminder ${reminder.id}: not verified`);
    }
    let trustedSent = false;
    if (trustedEmail) {
      trustedSent = await sendReminderEmail({ ...baseEmailParams, to: trustedEmail });
      if (trustedSent) {
        console.log(`[ReminderBatch] Sent reminder ${reminder.id} to trusted contact: ${trustedEmail}`);
      }
    }
    try {
      const { sendReminderPush: sendReminderPush2 } = await Promise.resolve().then(() => (init_sendPush(), sendPush_exports));
      const pushResult = await sendReminderPush2(
        reminder.ownerUserId,
        reminder.letter.recipientName || "\u5927\u5207\u306A\u4EBA",
        reminder.daysBefore,
        reminder.letterId
      );
      if (pushResult.sent > 0) {
        console.log(`[ReminderBatch] Push sent to ${pushResult.sent} devices for reminder ${reminder.id}`);
      }
    } catch (pushErr) {
      console.warn(`[ReminderBatch] Push failed for reminder ${reminder.id}:`, pushErr);
    }
    if (ownerSent || trustedSent) {
      const marked = await markReminderAsSent2(reminder.id);
      if (marked) {
        result.sent++;
      } else {
        console.log(`[ReminderBatch] Reminder ${reminder.id} already sent (skipped)`);
        result.skipped++;
      }
    } else {
      await markReminderAsFailed2(reminder.id, "Email send failed");
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
    const { setupVite: setupVite2 } = await Promise.resolve().then(() => (init_vite(), vite_exports));
    await setupVite2(app, server);
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
