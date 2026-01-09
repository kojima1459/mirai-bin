import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { letterReminders, letters, users } from "../drizzle/schema";
import * as ReminderLogic from "./db_reminder";

// インメモリデータストア
const mockData = {
  users: [] as any[],
  letters: [] as any[],
  letterReminders: [] as any[],
};

// Drizzle Mock Implementation (Minimal for ReminderLogic)
const createMockDb = () => {
  return {
    insert: (table: any) => ({
      values: (values: any) => ({
        $returningId: async () => {
          // Emulate returning ID
          const id = Math.floor(Math.random() * 100000);
          const record = { ...values, id };
          if (table === users) mockData.users.push(record);
          else if (table === letters) mockData.letters.push(record);
          else if (table === letterReminders) mockData.letterReminders.push(record);
          return [{ id }];
        },
        then: (resolve: any) => {
          // Emulate promise resolution for insert without returning
          const id = Math.floor(Math.random() * 100000);
          const record = { ...values, id };
          if (table === users) mockData.users.push(record);
          else if (table === letters) mockData.letters.push(record);
          else if (table === letterReminders) mockData.letterReminders.push(record);
          resolve([{ insertId: id, affectedRows: 1 }]);
        }
      })
    }),
    select: (fields?: any) => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          orderBy: (order: any) => {
            // Ignore order in mock for now, or implement sort
            let data: any[] = [];
            if (table === letterReminders) data = mockData.letterReminders;
            if (table === letters) data = mockData.letters;
            if (table === users) data = mockData.users;

            if (condition && typeof condition === 'function') {
              data = data.filter(condition);
            }
            // Sort limitation: simplified
            return data;
          },
          limit: async (n: number) => {
            let data: any[] = [];
            if (table === letterReminders) data = mockData.letterReminders;
            if (table === letters) data = mockData.letters;
            if (table === users) data = mockData.users;

            if (condition && typeof condition === 'function') {
              data = data.filter(condition);
            }
            return data.slice(0, n);
          },
          then: (resolve: any) => {
            let data: any[] = [];
            if (table === letterReminders) data = mockData.letterReminders;
            if (table === letters) data = mockData.letters;
            if (table === users) data = mockData.users;

            if (condition && typeof condition === 'function') {
              data = data.filter(condition);
            }
            resolve(data);
          }
        })
      })
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: async (condition: any) => {
          let data: any[] = [];
          if (table === letterReminders) data = mockData.letterReminders;

          let affectedRows = 0;
          if (typeof condition === 'function') {
            const targets = data.filter(condition);
            targets.forEach(t => {
              Object.assign(t, values);
              affectedRows++;
            });
          }
          return [{ affectedRows }];
        }
      })
    }),
    delete: (table: any) => ({
      where: async (condition: any) => {
        let data: any[] = [];
        if (table === letterReminders) {
          const initialLen = mockData.letterReminders.length;
          mockData.letterReminders = mockData.letterReminders.filter(item => !condition(item));
        }
      }
    }),
  };
};

// Mock Drizzle operators for db_reminder logic
vi.mock("drizzle-orm", async () => {
  return {
    eq: (col: any, val: any) => (item: any) => {
      // Check if col is from schema object or just string
      const colName = col.name;
      if (!colName) return false;
      return item[colName] === val;
    },
    and: (...conditions: any[]) => (item: any) => {
      return conditions.every(c => c(item));
    },
    desc: (col: any) => {
      // Placeholder for orderBy
      return {};
    }
  };
});

describe("Reminder Functions", () => {
  let testUserId: number;
  let testLetterId: number;
  const mockDb = createMockDb() as any;

  beforeAll(async () => {
    mockData.users = [];
    mockData.letters = [];
    mockData.letterReminders = [];

    // Setup User
    const user = {
      id: 1,
      name: "Reminder User",
      email: "reminder@example.com",
      openId: "reminder-user"
    };
    mockData.users.push(user);
    testUserId = user.id;

    // Setup Letter
    const letter = {
      id: 1,
      authorId: testUserId,
      status: "sealed"
    };
    mockData.letters.push(letter);
    testLetterId = letter.id;
  });

  afterAll(async () => {
    mockData.users = [];
    mockData.letters = [];
    mockData.letterReminders = [];
  });

  describe("createRemindersForLetter", () => {
    it("should create reminders for specified days before", async () => {
      const unlockAt = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000); // 100日後
      const daysBeforeList = [90, 30, 7];

      await ReminderLogic.createRemindersForLetter(mockDb, testLetterId, testUserId, unlockAt, daysBeforeList);

      const reminders = await ReminderLogic.getRemindersByLetterId(mockDb, testLetterId);
      expect(reminders.length).toBe(3);

      // 90日前のチェック
      const r90 = reminders.find(r => r.daysBefore === 90);
      expect(r90).toBeDefined();
      expect(r90?.status).toBe("pending");

      // 日付が正しいか（おおよそで確認）
      // scheduledAt ~= unlockAt - 90 days
      const expectedDate = new Date(unlockAt.getTime() - 90 * 24 * 60 * 60 * 1000);
      expect(r90?.scheduledAt.toISOString().slice(0, 10)).toBe(expectedDate.toISOString().slice(0, 10));
    });

    it("should skip past dates", async () => {
      const unlockAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10日後
      const daysBeforeList = [90, 7]; // 90日前は過去、7日前は未来

      await ReminderLogic.createRemindersForLetter(mockDb, testLetterId, testUserId, unlockAt, daysBeforeList);

      const reminders = await ReminderLogic.getRemindersByLetterId(mockDb, testLetterId);
      expect(reminders.length).toBe(1); // 7日前のみ
      expect(reminders[0].daysBefore).toBe(7);
    });
  });

  describe("updateLetterReminders", () => {
    it("should update reminders: keep sent, delete pending, add new", async () => {
      // Setup scenarios
      mockData.letterReminders = [];
      const unlockAt = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);

      // 既存: 90(sent), 30(pending)
      mockData.letterReminders.push({
        id: 101, letterId: testLetterId, ownerUserId: testUserId, daysBefore: 90, status: 'sent', scheduledAt: new Date(), type: 'before_unlock'
      });
      mockData.letterReminders.push({
        id: 102, letterId: testLetterId, ownerUserId: testUserId, daysBefore: 30, status: 'pending', scheduledAt: new Date(), type: 'before_unlock'
      });

      // Update to: 90, 7 (30 is removed, 7 is added)
      const daysBeforeList = [90, 7];

      await ReminderLogic.updateLetterReminders(mockDb, testLetterId, testUserId, unlockAt, daysBeforeList);

      const reminders = await ReminderLogic.getRemindersByLetterId(mockDb, testLetterId);

      // Check results
      const r90 = reminders.find(r => r.daysBefore === 90);
      expect(r90?.status).toBe('sent'); // Should stay sent

      const r30 = reminders.find(r => r.daysBefore === 30);
      expect(r30).toBeUndefined(); // Should be removed

      const r7 = reminders.find(r => r.daysBefore === 7);
      expect(r7?.status).toBe('pending'); // Should be created
    });
  });

  describe("getPendingReminders", () => {
    it("should return reminders scheduled for now or past", async () => {
      mockData.letterReminders = [];

      // Future reminder
      mockData.letterReminders.push({
        id: 201, letterId: testLetterId, ownerUserId: testUserId, daysBefore: 7, status: 'pending', scheduledAt: new Date(Date.now() + 100000), type: 'before_unlock'
      });

      // Past reminder (Should be picked up)
      mockData.letterReminders.push({
        id: 202, letterId: testLetterId, ownerUserId: testUserId, daysBefore: 1, status: 'pending', scheduledAt: new Date(Date.now() - 100000), type: 'before_unlock'
      });

      const pending = await ReminderLogic.getPendingReminders(mockDb);

      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(202);
      expect(pending[0].letter).toBeDefined();
      expect(pending[0].user).toBeDefined();
    });
  });

  describe("markReminderAsSent", () => {
    it("should mark as sent and set sentAt", async () => {
      mockData.letterReminders = [];
      const r = {
        id: 301, letterId: testLetterId, ownerUserId: testUserId, daysBefore: 1, status: 'pending', scheduledAt: new Date(), type: 'before_unlock'
      };
      mockData.letterReminders.push(r);

      const success = await ReminderLogic.markReminderAsSent(mockDb, 301);
      expect(success).toBe(true);

      const updated = mockData.letterReminders.find(item => item.id === 301);
      expect(updated.status).toBe('sent');
      expect(updated.sentAt).toBeDefined();
    });

    it("should fail if already sent (idempotency)", async () => {
      // status='sent' になっているので、検索条件(status='pending')にヒットせず更新件数0になるはず
      const success = await ReminderLogic.markReminderAsSent(mockDb, 301);
      expect(success).toBe(false);
    });
  });

  describe("markReminderAsFailed", () => {
    it("should mark as failed with error message", async () => {
      mockData.letterReminders = [];
      const r = {
        id: 401, letterId: testLetterId, ownerUserId: testUserId, daysBefore: 1, status: 'pending', scheduledAt: new Date(), type: 'before_unlock'
      };
      mockData.letterReminders.push(r);

      await ReminderLogic.markReminderAsFailed(mockDb, 401, "Test Error");

      const updated = mockData.letterReminders.find(item => item.id === 401);
      expect(updated.status).toBe("failed");
      expect(updated.lastError).toBe("Test Error");
    });
  });

  describe("deleteRemindersByLetterId", () => {
    it("should delete all reminders for letter", async () => {
      // setup
      mockData.letterReminders = [
        { id: 501, letterId: testLetterId, type: 'before_unlock' },
        { id: 502, letterId: testLetterId, type: 'before_unlock' },
        { id: 503, letterId: 999, type: 'before_unlock' } // Other letter
      ];

      await ReminderLogic.deleteRemindersByLetterId(mockDb, testLetterId);

      expect(mockData.letterReminders.length).toBe(1);
      expect(mockData.letterReminders[0].id).toBe(503);
    });
  });

});
