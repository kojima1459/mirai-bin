import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * ユーザーテーブル（Manus OAuth）
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  notificationEmail: varchar("notificationEmail", { length: 320 }), // 未設定ならemailを使用
  trustedContactEmail: varchar("trustedContactEmail", { length: 320 }), // 信頼できる通知先（配偶者等）
  // リマインド通知設定
  notifyEnabled: boolean("notifyEnabled").default(true).notNull(), // 通知を受け取るか
  notifyDaysBefore: int("notifyDaysBefore").default(7).notNull(), // 何日前に通知（1,3,7,30,90,365）
  // メール検証
  notificationEmailVerified: boolean("notificationEmailVerified").default(false).notNull(),
  notificationEmailVerifyToken: varchar("notificationEmailVerifyToken", { length: 64 }),
  notificationEmailVerifyExpiresAt: timestamp("notificationEmailVerifyExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 手紙テーブル
 * 
 * ゼロ知識設計:
 * - サーバーは暗号文（ciphertextUrl）とメタデータのみ保持
 * - 本文（finalContent）は保存しない（nullable、将来的に削除）
 * - 復号キーはクライアント側でShamir分割
 * - サーバーはserverShareのみ保持（開封日時後に提供）
 * - clientShareは解錠コードで暗号化してwrappedClientShareとして保存
 */
export const letters = mysqlTable("letters", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),

  // 公開スコープ: private(自分のみ), family(家族グループ), link(URL共有)
  visibilityScope: mysqlEnum("visibilityScope", ["private", "family", "link"]).default("private").notNull(),
  familyId: int("familyId"), // FAMILYスコープ時のみ設定

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
  otsStatus: varchar("otsStatus", { length: 20 }).default("pending"), // pending, submitted, confirmed
  otsSubmittedAt: timestamp("otsSubmittedAt"),
  otsConfirmedAt: timestamp("otsConfirmedAt"),

  // 開封関連
  unlockAt: timestamp("unlockAt"),
  unlockPolicy: varchar("unlockPolicy", { length: 50 }).default("datetime"),
  isUnlocked: boolean("isUnlocked").default(false).notNull(),
  unlockedAt: timestamp("unlockedAt"),
  openedUserAgent: text("openedUserAgent"), // 開封時のUser-Agent（端末情報）

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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Letter = typeof letters.$inferSelect;
export type InsertLetter = typeof letters.$inferInsert;

/**
 * テンプレートテーブル
 * 
 * アコーディオンUI対応:
 * - category: 感情/親の本音/儀式
 * - subtitle: 1行説明（開かなくても選べる）
 * - recordingGuide: 90秒で話す順番（3ステップ）
 * - isRecommended: おすすめ3つに固定表示
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  subtitle: varchar("subtitle", { length: 200 }), // 1行説明
  description: text("description"),
  category: varchar("category", { length: 50 }).default("emotion").notNull(), // emotion/parent-truth/ritual/milestone
  prompt: text("prompt").notNull(),
  recordingPrompt: text("recordingPrompt").notNull(),
  recordingGuide: text("recordingGuide"), // 90秒で話す順番（JSON）
  exampleOneLiner: text("exampleOneLiner"),
  icon: varchar("icon", { length: 50 }),
  isRecommended: boolean("isRecommended").default(false).notNull(), // おすすめ3つ
  sortOrder: int("sortOrder").default(100).notNull(), // 表示順
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * 下書きテーブル
 * 
 * 注意: 下書きはサーバーに平文保存される
 * ゼロ知識の主張は「封緘後（sealed letter）」に限定
 */
export const drafts = mysqlTable("drafts", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Draft = typeof drafts.$inferSelect;
export type InsertDraft = typeof drafts.$inferInsert;

/**
 * リマインダーテーブル
 * 
 * X日前リマインド通知用
 * - 毎日バッチでscheduledAt <= nowかつsentAt IS NULLを検索
 * - 二重送信防止: sentAt IS NULLで原子的更新
 */
export const letterReminders = mysqlTable("letter_reminders", {
  id: int("id").autoincrement().primaryKey(),
  letterId: int("letterId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),

  // リマインダー種別
  type: varchar("type", { length: 50 }).default("before_unlock").notNull(), // before_unlock
  daysBefore: int("daysBefore").notNull(), // 90, 30, 7, 1

  // スケジュール
  scheduledAt: timestamp("scheduledAt").notNull(), // unlockAt - daysBefore
  sentAt: timestamp("sentAt"), // 送信済みならセット

  // ステータス
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, failed
  lastError: text("lastError"),

  // メタデータ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LetterReminder = typeof letterReminders.$inferSelect;
export type InsertLetterReminder = typeof letterReminders.$inferInsert;

/**
 * 共有トークンテーブル
 * 
 * 共有リンクの失効・再発行（Revocation / Rotation）対応:
 * - 1手紙に対して複数のトークン履歴を持てる
 * - status: active（有効）, revoked（無効化）, rotated（置換済み）
 * - activeなトークンは常に最大1件
 * - 無効化/置換されたトークンは410を返す
 */
export const letterShareTokens = mysqlTable("letter_share_tokens", {
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
  revokedAt: timestamp("revokedAt"),
});

export type LetterShareToken = typeof letterShareTokens.$inferSelect;
export type InsertLetterShareToken = typeof letterShareTokens.$inferInsert;

/**
 * 家族グループテーブル
 */
export const families = mysqlTable("families", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  name: varchar("name", { length: 100 }).default("マイファミリー"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Family = typeof families.$inferSelect;
export type InsertFamily = typeof families.$inferInsert;

/**
 * 家族メンバーテーブル
 * familyId + userId で一意
 */
export const familyMembers = mysqlTable("family_members", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "member"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = typeof familyMembers.$inferInsert;

/**
 * 家族招待テーブル
 * email招待 → 受諾で membership作成
 */
export const familyInvites = mysqlTable("family_invites", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").notNull(),
  invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FamilyInvite = typeof familyInvites.$inferSelect;
export type InsertFamilyInvite = typeof familyInvites.$inferInsert;

/**
 * インタビューセッションテーブル
 */
export const interviewSessions = mysqlTable("interview_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recipientName: varchar("recipientName", { length: 100 }), // 誰宛か
  topic: varchar("topic", { length: 100 }), // 話題（自分史、感謝、謝罪etc）
  status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = typeof interviewSessions.$inferInsert;

/**
 * チャットメッセージ履歴テーブル
 */
export const interviewMessages = mysqlTable("interview_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  sender: mysqlEnum("sender", ["ai", "user"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InterviewMessage = typeof interviewMessages.$inferSelect;
export type InsertInterviewMessage = typeof interviewMessages.$inferInsert;

/**
 * アプリ内通知テーブル
 * 
 * X日前リマインド等の通知を保存
 * - メール送信有無に関わらず必ずinboxに残る
 * - 本文に復号情報は絶対に含めない
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // reminder_before_unlock, letter_opened, family_invite
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  meta: text("meta"), // JSON: { letterId, recipientLabel, daysRemaining }
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Push通知購読テーブル
 * 
 * Web Push APIの購読情報を保存
 * - endpoint をユニークキーとして管理
 * - 複数端末から購読可能（userId + 複数endpoint）
 * - revokedAt が設定されると無効な購読として扱う
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: varchar("endpoint", { length: 500 }).notNull().unique(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 64 }).notNull(),
  userAgent: varchar("userAgent", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

