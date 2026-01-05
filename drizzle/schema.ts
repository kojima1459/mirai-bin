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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 手紙テーブル
 */
export const letters = mysqlTable("letters", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  
  // 受取人情報
  recipientName: varchar("recipientName", { length: 100 }),
  recipientRelation: varchar("recipientRelation", { length: 50 }),
  
  // 音声データ
  audioUrl: varchar("audioUrl", { length: 500 }),
  audioDuration: int("audioDuration"),
  
  // 文字起こし
  transcription: text("transcription"),
  
  // AI生成
  aiDraft: text("aiDraft"),
  finalContent: text("finalContent").notNull(),
  templateUsed: varchar("templateUsed", { length: 50 }),
  
  // 暗号化関連
  isEncrypted: boolean("isEncrypted").default(true).notNull(),
  encryptionIv: varchar("encryptionIv", { length: 255 }).notNull(),
  ciphertextUrl: varchar("ciphertextUrl", { length: 500 }).notNull(),
  
  // 証跡関連
  proofHash: varchar("proofHash", { length: 64 }).notNull(),
  proofProvider: varchar("proofProvider", { length: 50 }).default("local"),
  txHash: varchar("txHash", { length: 66 }),
  proofCreatedAt: timestamp("proofCreatedAt"),
  
  // 解錠関連（Day 4で実装）
  unlockAt: timestamp("unlockAt"),
  unlockPolicy: varchar("unlockPolicy", { length: 50 }).default("datetime"),
  isUnlocked: boolean("isUnlocked").default(false).notNull(),
  unlockedAt: timestamp("unlockedAt"),
  
  // 鍵管理（Day 4で実装）
  keyShard1: text("keyShard1"),
  keyShard2: text("keyShard2"),
  keyShard3: text("keyShard3"),
  
  // メタデータ
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Letter = typeof letters.$inferSelect;
export type InsertLetter = typeof letters.$inferInsert;

/**
 * テンプレートテーブル
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  recordingPrompt: text("recordingPrompt").notNull(),
  exampleOneLiner: text("exampleOneLiner"),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
