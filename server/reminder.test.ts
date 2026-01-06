import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { letters, letterReminders, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb, createRemindersForLetter, getRemindersByLetterId, updateLetterReminders, deleteRemindersByLetterId, getPendingReminders, markReminderAsSent, markReminderAsFailed } from "./db";

describe("Reminder Functions", () => {
  let testUserId: number;
  let testLetterId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用ユーザーを作成
    const userResult = await db.insert(users).values({
      openId: `test-reminder-${Date.now()}`,
      name: "Test Reminder User",
      email: "test-reminder@example.com",
    }).$returningId();
    testUserId = userResult[0].id;

    // テスト用手紙を作成（100日後に開封）
    const unlockAt = new Date();
    unlockAt.setDate(unlockAt.getDate() + 100);
    
    const letterResult = await db.insert(letters).values({
      authorId: testUserId,
      recipientName: "Test Recipient",
      recipientRelation: "child",
      templateName: "test-template",
      ciphertextUrl: "https://example.com/test.enc",
      ciphertextIv: "test-iv",
      ciphertextSalt: "test-salt",
      ciphertextKdf: "PBKDF2",
      ciphertextKdfIters: 100000,
      serverShare: "test-server-share",
      encryptionIv: "test-encryption-iv",
      proofHash: "test-proof-hash",
      unlockAt,
    }).$returningId();
    testLetterId = letterResult[0].id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // テストデータをクリーンアップ
    await db.delete(letterReminders).where(eq(letterReminders.letterId, testLetterId));
    await db.delete(letters).where(eq(letters.id, testLetterId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe("createRemindersForLetter", () => {
    it("should create reminders for specified days before unlock date", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [letter] = await db.select().from(letters).where(eq(letters.id, testLetterId));
      
      if (!letter || !letter.unlockAt) {
        throw new Error("Test letter not found");
      }

      const daysBeforeList = [30, 7, 1];
      await createRemindersForLetter(testLetterId, testUserId, letter.unlockAt, daysBeforeList);

      const reminders = await getRemindersByLetterId(testLetterId);
      expect(reminders.length).toBe(3);
      expect(reminders.map(r => r.daysBefore).sort((a, b) => b - a)).toEqual([30, 7, 1]);
    });

    it("should calculate correct scheduledAt from unlockAt", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const reminders = await getRemindersByLetterId(testLetterId);
      const [letter] = await db.select().from(letters).where(eq(letters.id, testLetterId));

      if (!letter || !letter.unlockAt) {
        throw new Error("Test letter not found");
      }

      for (const reminder of reminders) {
        const expectedScheduledAt = new Date(letter.unlockAt);
        expectedScheduledAt.setDate(expectedScheduledAt.getDate() - reminder.daysBefore);
        
        // 日付が一致することを確認（時間は09:00 JSTに設定されるため、日付のみ比較）
        expect(reminder.scheduledAt.toDateString()).toBe(expectedScheduledAt.toDateString());
      }
    });
  });

  describe("updateLetterReminders", () => {
    it("should update reminders when days change", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [letter] = await db.select().from(letters).where(eq(letters.id, testLetterId));
      
      if (!letter || !letter.unlockAt) {
        throw new Error("Test letter not found");
      }

      // 90日前と1日前に変更
      await updateLetterReminders(testLetterId, testUserId, letter.unlockAt, [90, 1]);

      const reminders = await getRemindersByLetterId(testLetterId);
      // 100日後の開封日なので90日前と1日前の両方が作成される
      expect(reminders.length).toBe(2);
      expect(reminders.map(r => r.daysBefore).sort((a, b) => b - a)).toEqual([90, 1]);
    });
  });

  describe("deleteRemindersByLetterId", () => {
    it("should delete all reminders for a letter", async () => {
      await deleteRemindersByLetterId(testLetterId);

      const reminders = await getRemindersByLetterId(testLetterId);
      expect(reminders.length).toBe(0);
    });
  });

  describe("getPendingReminders", () => {
    it("should return reminders that are due", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [letter] = await db.select().from(letters).where(eq(letters.id, testLetterId));
      
      if (!letter || !letter.unlockAt) {
        throw new Error("Test letter not found");
      }

      // 過去の日付でリマインダーを作成（即座に送信対象になる）
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      await db.insert(letterReminders).values({
        letterId: testLetterId,
        ownerUserId: testUserId,
        daysBefore: 7,
        scheduledAt: pastDate,
        status: "pending",
      });

      const pending = await getPendingReminders(10);
      const testReminder = pending.find(r => r.letterId === testLetterId);
      
      expect(testReminder).toBeDefined();
      expect(testReminder?.status).toBe("pending");
    });
  });

  describe("markReminderAsSent", () => {
    it("should mark reminder as sent and set sentAt", async () => {
      const reminders = await getRemindersByLetterId(testLetterId);
      const pendingReminder = reminders.find(r => r.status === "pending");
      
      if (!pendingReminder) {
        throw new Error("No pending reminder found");
      }

      const result = await markReminderAsSent(pendingReminder.id);
      expect(result).toBe(true);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [updated] = await db.select().from(letterReminders).where(eq(letterReminders.id, pendingReminder.id));
      
      expect(updated?.status).toBe("sent");
      expect(updated?.sentAt).not.toBeNull();
    });

    it("should return false if already sent (prevent double send)", async () => {
      const reminders = await getRemindersByLetterId(testLetterId);
      const sentReminder = reminders.find(r => r.status === "sent");
      
      if (!sentReminder) {
        throw new Error("No sent reminder found");
      }

      const result = await markReminderAsSent(sentReminder.id);
      expect(result).toBe(false);
    });
  });

  describe("markReminderAsFailed", () => {
    it("should mark reminder as failed with error message", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [letter] = await db.select().from(letters).where(eq(letters.id, testLetterId));
      
      if (!letter || !letter.unlockAt) {
        throw new Error("Test letter not found");
      }

      // 新しいリマインダーを作成
      const newReminderResult = await db.insert(letterReminders).values({
        letterId: testLetterId,
        ownerUserId: testUserId,
        daysBefore: 3,
        scheduledAt: new Date(),
        status: "pending",
      }).$returningId();

      await markReminderAsFailed(newReminderResult[0].id, "Test error message");

      const [updated] = await db.select().from(letterReminders).where(eq(letterReminders.id, newReminderResult[0].id));
      
      expect(updated?.status).toBe("failed");
      expect(updated?.lastError).toBe("Test error message");
    });
  });
});
