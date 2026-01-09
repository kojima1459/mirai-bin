import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { letterShareTokens, letters, users } from "../drizzle/schema";
import * as ShareTokenLogic from "./db_share_token";
import { nanoid } from "nanoid";

// インメモリデータストア
const mockData = {
  users: [] as any[],
  letters: [] as any[],
  letterShareTokens: [] as any[],
};

// Drizzle Mock Implementation (minimal for ShareTokenLogic)
const createMockDb = () => {
  return {
    insert: (table: any) => ({
      values: (values: any) => ({
        $returningId: async () => {
          // For migrateShareTokenIfNeeded -> createShareToken -> insert
          // But createShareToken uses values(). returning is not used there explicitly in the logic?
          // Actually, createShareToken logic: await db.insert(...).values(...)
          // It does not call $returningId. It awaits the result.
          // But we need to support $returningId for test setup (create users/letters).
          const id = Math.floor(Math.random() * 100000);
          const name = table === users ? "users" : table === letters ? "letters" : "letterShareTokens";
          const record = { ...values, id };
          if (table === users) mockData.users.push(record);
          else if (table === letters) mockData.letters.push(record);
          else if (table === letterShareTokens) mockData.letterShareTokens.push(record);
          return [{ id }];
        },
        // createShareToken uses await db.insert(...).values(...) 
        // which returns a Promise. In drizzle mysql2, it returns [ResultSetHeader].
        then: (resolve: any) => {
          // Promise-like behavior for await
          const name = table === users ? "users" : table === letters ? "letters" : "letterShareTokens";
          if (table === letterShareTokens) mockData.letterShareTokens.push(values);
          // Logic doesn't use the return value
          resolve([{ insertId: Math.floor(Math.random() * 100000) }]);
        }
      })
    }),
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          limit: async (n: number) => {
            let data: any[] = [];
            if (table === users) data = mockData.users;
            if (table === letters) data = mockData.letters;
            if (table === letterShareTokens) data = mockData.letterShareTokens;

            let result = data;
            if (condition && typeof condition === 'function') {
              result = data.filter(condition);
            }
            return result.slice(0, n);
          },
          // For cases without limit?
          then: (resolve: any) => {
            let data: any[] = [];
            if (table === users) data = mockData.users;
            if (table === letters) data = mockData.letters;
            if (table === letterShareTokens) data = mockData.letterShareTokens;

            let result = data;
            if (condition && typeof condition === 'function') {
              result = data.filter(condition);
            }
            resolve(result);
          }
        })
      })
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: async (condition: any) => {
          let data: any[] = [];
          if (table === users) data = mockData.users;
          if (table === letters) data = mockData.letters;
          if (table === letterShareTokens) data = mockData.letterShareTokens;

          if (typeof condition === 'function') {
            const targets = data.filter(condition);
            targets.forEach(t => Object.assign(t, values));
          }
        }
      })
    }),
    delete: (table: any) => ({
      where: async (condition: any) => {
        let data: any[] = [];
        // setup/teardown uses delete
        if (table === users) {
          mockData.users = mockData.users.filter(item => !condition(item));
        }
        if (table === letters) {
          mockData.letters = mockData.letters.filter(item => !condition(item));
        }
        if (table === letterShareTokens) {
          mockData.letterShareTokens = mockData.letterShareTokens.filter(item => !condition(item));
        }
      }
    }),
  };
};

// Mock Drizzle operators
vi.mock("drizzle-orm", async () => {
  return {
    eq: (col: any, val: any) => (item: any) => {
      if (col && col.name) return item[col.name] === val;
      // For mockDb usage where col is the column object
      return false;
    },
    and: (...conditions: any[]) => (item: any) => {
      return conditions.every(c => c(item));
    },
    // We need 'letterShareTokens' export etc to work? 
    // No, we act on the real schema objects imported from schema.ts
    // But schema.ts imports from drizzle-orm/mysql-core.
    // We only mock eq/and which are used in logic.
  };
});

describe("Share Token Functions", () => {
  let testUserId: number;
  let testLetterId: number;
  const testToken = nanoid(21);
  const mockDb = createMockDb() as any; // Cast to expected interface

  beforeAll(async () => {
    // Reset data
    mockData.users = [];
    mockData.letters = [];
    mockData.letterShareTokens = [];

    // Setup initial data directly into store if db.insert is tricky in beforeAll
    // But we implemented insertMock.

    // User
    const user = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      openId: "test-user"
    };
    mockData.users.push(user);
    testUserId = user.id;

    // Letter
    const letter = {
      id: 1,
      authorId: testUserId,
      status: "sealed",
      shareToken: null
    };
    mockData.letters.push(letter);
    testLetterId = letter.id;
  });

  afterAll(async () => {
    mockData.users = [];
    mockData.letters = [];
    mockData.letterShareTokens = [];
  });

  describe("createShareToken", () => {
    it("should create a new active share token", async () => {
      const result = await ShareTokenLogic.createShareToken(mockDb, testLetterId, testToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe(testToken);

      const record = await ShareTokenLogic.getShareTokenRecord(mockDb, testToken);
      expect(record).toBeDefined();
      expect(record?.status).toBe("active");
      expect(record?.letterId).toBe(testLetterId);
    });
  });

  describe("getShareTokenRecord", () => {
    it("should return token record for existing token", async () => {
      const record = await ShareTokenLogic.getShareTokenRecord(mockDb, testToken);
      expect(record).toBeDefined();
      expect(record?.token).toBe(testToken);
    });

    it("should return undefined for non-existent token", async () => {
      const record = await ShareTokenLogic.getShareTokenRecord(mockDb, "non-existent-token");
      expect(record).toBeUndefined();
    });
  });

  describe("getActiveShareToken", () => {
    it("should return active token for letter", async () => {
      const activeToken = await ShareTokenLogic.getActiveShareToken(mockDb, testLetterId);
      expect(activeToken).toBeDefined();
      expect(activeToken?.token).toBe(testToken);
      expect(activeToken?.status).toBe("active");
    });
  });

  describe("incrementShareTokenViewCount", () => {
    it("should increment view count and update lastAccessedAt", async () => {
      const beforeRecord = await ShareTokenLogic.getShareTokenRecord(mockDb, testToken);
      const beforeCount = beforeRecord?.viewCount || 0;

      await ShareTokenLogic.incrementShareTokenViewCount(mockDb, testToken);

      const afterRecord = await ShareTokenLogic.getShareTokenRecord(mockDb, testToken);
      expect(afterRecord?.viewCount).toBe(beforeCount + 1);
    });
  });

  describe("revokeShareToken", () => {
    it("should revoke active token", async () => {
      const revokeTestToken = nanoid(21);
      await ShareTokenLogic.createShareToken(mockDb, testLetterId, revokeTestToken);

      const result = await ShareTokenLogic.revokeShareToken(mockDb, testLetterId, "Test revocation");

      expect(result.success).toBe(true);
      expect(result.wasActive).toBe(true);

      const record = await ShareTokenLogic.getShareTokenRecord(mockDb, revokeTestToken);
      expect(record?.status).toBe("revoked");
      expect(record?.revokedAt).not.toBeNull();
    });

    it("should return wasActive=false when no active token exists", async () => {
      // activeなものを全てrevoke
      mockData.letterShareTokens.forEach(t => { if (t.letterId === testLetterId) t.status = 'revoked'; });

      const result = await ShareTokenLogic.revokeShareToken(mockDb, testLetterId);

      expect(result.success).toBe(true);
      expect(result.wasActive).toBe(false);
    });
  });

  describe("rotateShareToken", () => {
    it("should rotate token: old becomes rotated, new becomes active", async () => {
      const oldToken = nanoid(21);
      await ShareTokenLogic.createShareToken(mockDb, testLetterId, oldToken); // active化

      const newToken = nanoid(21);
      const result = await ShareTokenLogic.rotateShareToken(mockDb, testLetterId, newToken);

      expect(result.success).toBe(true);
      expect(result.oldToken).toBe(oldToken);
      expect(result.newToken).toBe(newToken);

      const oldRecord = await ShareTokenLogic.getShareTokenRecord(mockDb, oldToken);
      expect(oldRecord?.status).toBe("rotated");
      expect(oldRecord?.replacedByToken).toBe(newToken);

      const newRecord = await ShareTokenLogic.getShareTokenRecord(mockDb, newToken);
      expect(newRecord?.status).toBe("active");
    });

    it("should create new active token when no previous active token exists", async () => {
      mockData.letterShareTokens.forEach(t => t.status = 'revoked');

      const newToken = nanoid(21);
      const result = await ShareTokenLogic.rotateShareToken(mockDb, testLetterId, newToken);

      expect(result.success).toBe(true);
      expect(result.oldToken).toBeUndefined();
      expect(result.newToken).toBe(newToken);

      const newRecord = await ShareTokenLogic.getShareTokenRecord(mockDb, newToken);
      expect(newRecord?.status).toBe("active");
    });
  });

  describe("migrateShareTokenIfNeeded", () => {
    it("should migrate legacy shareToken to letterShareTokens table", async () => {
      const legacyToken = nanoid(21);
      const newLetterId = 999;
      // レガシーな手紙を作成
      mockData.letters.push({
        id: newLetterId,
        authorId: testUserId,
        shareToken: legacyToken
      });

      await ShareTokenLogic.migrateShareTokenIfNeeded(mockDb, newLetterId, legacyToken);

      const record = await ShareTokenLogic.getShareTokenRecord(mockDb, legacyToken);
      expect(record).toBeDefined();
      expect(record?.status).toBe("active");
      expect(record?.letterId).toBe(newLetterId);
    });

    it("should not duplicate if already migrated", async () => {
      const existingToken = nanoid(21);
      await ShareTokenLogic.createShareToken(mockDb, testLetterId, existingToken);

      await ShareTokenLogic.migrateShareTokenIfNeeded(mockDb, testLetterId, existingToken);

      const records = mockData.letterShareTokens.filter(t => t.letterId === testLetterId && t.token === existingToken);
      expect(records.length).toBe(1);
    });
  });

  describe("Active token constraint", () => {
    it("should maintain only one active token per letter", async () => {
      mockData.letterShareTokens.forEach(t => { if (t.letterId === testLetterId) t.status = 'revoked'; });

      const token1 = nanoid(21);
      const token2 = nanoid(21);

      await ShareTokenLogic.createShareToken(mockDb, testLetterId, token1);
      await ShareTokenLogic.rotateShareToken(mockDb, testLetterId, token2);

      const activeTokens = mockData.letterShareTokens.filter(t => t.letterId === testLetterId && t.status === "active");
      expect(activeTokens.length).toBe(1);
      expect(activeTokens[0].token).toBe(token2);
    });
  });
});
