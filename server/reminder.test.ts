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


describe("updateLetterReminders - preserve sent reminders", () => {
  let testUserId2: number;
  let testLetterId2: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用ユーザーを作成
    const userResult = await db.insert(users).values({
      openId: `test-update-schedule-${Date.now()}`,
      name: "Test Update Schedule User",
      email: "test-update-schedule@example.com",
    }).$returningId();
    testUserId2 = userResult[0].id;

    // テスト用手紙を作成（100日後に開封）
    const unlockAt = new Date();
    unlockAt.setDate(unlockAt.getDate() + 100);
    
    const letterResult = await db.insert(letters).values({
      authorId: testUserId2,
      recipientName: "Test Recipient 2",
      recipientRelation: "child",
      templateName: "test-template",
      ciphertextUrl: "https://example.com/test2.enc",
      ciphertextIv: "test-iv-2",
      ciphertextSalt: "test-salt-2",
      ciphertextKdf: "PBKDF2",
      ciphertextKdfIters: 100000,
      serverShare: "test-server-share-2",
      encryptionIv: "test-encryption-iv-2",
      proofHash: "test-proof-hash-2",
      unlockAt,
    }).$returningId();
    testLetterId2 = letterResult[0].id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // テストデータをクリーンアップ
    await db.delete(letterReminders).where(eq(letterReminders.letterId, testLetterId2));
    await db.delete(letters).where(eq(letters.id, testLetterId2));
    await db.delete(users).where(eq(users.id, testUserId2));
  });

  it("should preserve sent reminders when updating schedule", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [letter] = await db.select().from(letters).where(eq(letters.id, testLetterId2));
    
    if (!letter || !letter.unlockAt) {
      throw new Error("Test letter not found");
    }

    // 初期リマインダーを作成
    await createRemindersForLetter(testLetterId2, testUserId2, letter.unlockAt, [90, 30, 7, 1]);

    // 30日前のリマインダーを送信済みにマーク
    const reminders = await getRemindersByLetterId(testLetterId2);
    const reminder30Days = reminders.find(r => r.daysBefore === 30);
    if (reminder30Days) {
      await markReminderAsSent(reminder30Days.id);
    }

    // スケジュールを更新（90日前と30日前のみに変更）
    await updateLetterReminders(testLetterId2, testUserId2, letter.unlockAt, [90, 30]);

    // 結果を確認
    const updatedReminders = await getRemindersByLetterId(testLetterId2);
    
    // 送信済みの30日前は保持される
    const sent30Days = updatedReminders.find(r => r.daysBefore === 30 && r.status === "sent");
    expect(sent30Days).toBeDefined();

    // 90日前は新規作成される
    const pending90Days = updatedReminders.find(r => r.daysBefore === 90 && r.status === "pending");
    expect(pending90Days).toBeDefined();

    // 7日前と1日前は削除される
    const reminder7Days = updatedReminders.find(r => r.daysBefore === 7);
    const reminder1Day = updatedReminders.find(r => r.daysBefore === 1);
    expect(reminder7Days).toBeUndefined();
    expect(reminder1Day).toBeUndefined();
  });

  it("should recalculate scheduledAt when unlockAt changes", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 新しい開封日時（150日後）
    const newUnlockAt = new Date();
    newUnlockAt.setDate(newUnlockAt.getDate() + 150);

    // スケジュールを更新
    await updateLetterReminders(testLetterId2, testUserId2, newUnlockAt, [90, 7]);

    // 結果を確認
    const updatedReminders = await getRemindersByLetterId(testLetterId2);
    
    // 90日前のリマインダーのscheduledAtが新しい開封日時に基づいて計算されている
    const reminder90Days = updatedReminders.find(r => r.daysBefore === 90 && r.status === "pending");
    if (reminder90Days) {
      const expectedDate = new Date(newUnlockAt);
      expectedDate.setDate(expectedDate.getDate() - 90);
      expect(reminder90Days.scheduledAt.toDateString()).toBe(expectedDate.toDateString());
    }

    // 7日前のリマインダーも新しい開封日時に基づいて計算されている
    const reminder7Days = updatedReminders.find(r => r.daysBefore === 7 && r.status === "pending");
    if (reminder7Days) {
      const expectedDate = new Date(newUnlockAt);
      expectedDate.setDate(expectedDate.getDate() - 7);
      expect(reminder7Days.scheduledAt.toDateString()).toBe(expectedDate.toDateString());
    }
  });
});
