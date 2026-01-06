import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { letterShareTokens, letters, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { 
  getDb,
  createShareToken, 
  getShareTokenRecord, 
  getActiveShareToken, 
  revokeShareToken, 
  rotateShareToken,
  migrateShareTokenIfNeeded,
  incrementShareTokenViewCount
} from "./db";
import { nanoid } from "nanoid";

describe("Share Token Functions", () => {
  let testUserId: number;
  let testLetterId: number;
  const testToken = nanoid(21);

  beforeAll(async () => {
    const db = await getDb();
    
    // テスト用ユーザーを作成
    const userResult = await db.insert(users).values({
      openId: `test-share-token-${Date.now()}`,
      name: "Share Token Test User",
      email: `sharetoken-test-${Date.now()}@example.com`,
    }).$returningId();
    testUserId = userResult[0].id;

    // テスト用手紙を作成
    const letterResult = await db.insert(letters).values({
      authorId: testUserId,
      recipientName: "Test Recipient",
      recipientRelation: "child",
      encryptionIv: "test-iv",
      ciphertextUrl: "https://example.com/test.enc",
      proofHash: "test-proof-hash",
      status: "sealed",
    }).$returningId();
    testLetterId = letterResult[0].id;
  });

  afterAll(async () => {
    const db = await getDb();
    // テストデータをクリーンアップ
    await db.delete(letterShareTokens).where(eq(letterShareTokens.letterId, testLetterId));
    await db.delete(letters).where(eq(letters.id, testLetterId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe("createShareToken", () => {
    it("should create a new active share token", async () => {
      const result = await createShareToken(testLetterId, testToken);
      
      expect(result.success).toBe(true);
      expect(result.token).toBe(testToken);
      
      // DBに保存されていることを確認
      const record = await getShareTokenRecord(testToken);
      expect(record).toBeDefined();
      expect(record?.status).toBe("active");
      expect(record?.letterId).toBe(testLetterId);
    });
  });

  describe("getShareTokenRecord", () => {
    it("should return token record for existing token", async () => {
      const record = await getShareTokenRecord(testToken);
      
      expect(record).toBeDefined();
      expect(record?.token).toBe(testToken);
      expect(record?.status).toBe("active");
    });

    it("should return undefined for non-existent token", async () => {
      const record = await getShareTokenRecord("non-existent-token");
      expect(record).toBeUndefined();
    });
  });

  describe("getActiveShareToken", () => {
    it("should return active token for letter", async () => {
      const activeToken = await getActiveShareToken(testLetterId);
      
      expect(activeToken).toBeDefined();
      expect(activeToken?.token).toBe(testToken);
      expect(activeToken?.status).toBe("active");
    });
  });

  describe("incrementShareTokenViewCount", () => {
    it("should increment view count and update lastAccessedAt", async () => {
      const beforeRecord = await getShareTokenRecord(testToken);
      const beforeCount = beforeRecord?.viewCount || 0;
      
      await incrementShareTokenViewCount(testToken);
      
      const afterRecord = await getShareTokenRecord(testToken);
      expect(afterRecord?.viewCount).toBe(beforeCount + 1);
      expect(afterRecord?.lastAccessedAt).not.toBeNull();
    });
  });

  describe("revokeShareToken", () => {
    it("should revoke active token", async () => {
      // 新しいトークンを作成
      const revokeTestToken = nanoid(21);
      await createShareToken(testLetterId, revokeTestToken);
      
      const result = await revokeShareToken(testLetterId, "Test revocation");
      
      expect(result.success).toBe(true);
      expect(result.wasActive).toBe(true);
      
      // トークンがrevokedになっていることを確認
      const record = await getShareTokenRecord(revokeTestToken);
      expect(record?.status).toBe("revoked");
      expect(record?.revokedAt).not.toBeNull();
    });

    it("should return wasActive=false when no active token exists", async () => {
      // 全てのトークンをrevoke済みの状態で
      const result = await revokeShareToken(testLetterId);
      
      expect(result.success).toBe(true);
      expect(result.wasActive).toBe(false);
    });
  });

  describe("rotateShareToken", () => {
    it("should rotate token: old becomes rotated, new becomes active", async () => {
      // 新しいactiveトークンを作成
      const oldToken = nanoid(21);
      await createShareToken(testLetterId, oldToken);
      
      const newToken = nanoid(21);
      const result = await rotateShareToken(testLetterId, newToken);
      
      expect(result.success).toBe(true);
      expect(result.oldToken).toBe(oldToken);
      expect(result.newToken).toBe(newToken);
      
      // 旧トークンがrotatedになっていることを確認
      const oldRecord = await getShareTokenRecord(oldToken);
      expect(oldRecord?.status).toBe("rotated");
      expect(oldRecord?.replacedByToken).toBe(newToken);
      
      // 新トークンがactiveになっていることを確認
      const newRecord = await getShareTokenRecord(newToken);
      expect(newRecord?.status).toBe("active");
    });

    it("should create new active token when no previous active token exists", async () => {
      // 全てのトークンをrevoke
      await revokeShareToken(testLetterId);
      
      const newToken = nanoid(21);
      const result = await rotateShareToken(testLetterId, newToken);
      
      expect(result.success).toBe(true);
      expect(result.oldToken).toBeUndefined();
      expect(result.newToken).toBe(newToken);
      
      // 新トークンがactiveになっていることを確認
      const newRecord = await getShareTokenRecord(newToken);
      expect(newRecord?.status).toBe("active");
    });
  });

  describe("migrateShareTokenIfNeeded", () => {
    it("should migrate legacy shareToken to letterShareTokens table", async () => {
      const db = await getDb();
      
      // 新しいテスト用手紙を作成（legacyトークン付き）
      const legacyToken = nanoid(21);
      const newLetterResult = await db.insert(letters).values({
        authorId: testUserId,
        recipientName: "Legacy Test",
        recipientRelation: "child",
        encryptionIv: "test-iv",
        ciphertextUrl: "https://example.com/test.enc",
        proofHash: "test-proof-hash-legacy",
        status: "sealed",
        shareToken: legacyToken,
      }).$returningId();
      const newLetter = { id: newLetterResult[0].id };
      
      // 移行を実行
      await migrateShareTokenIfNeeded(newLetter.id, legacyToken);
      
      // letterShareTokensテーブルに移行されていることを確認
      const record = await getShareTokenRecord(legacyToken);
      expect(record).toBeDefined();
      expect(record?.status).toBe("active");
      expect(record?.letterId).toBe(newLetter.id);
      
      // クリーンアップ
      await db.delete(letterShareTokens).where(eq(letterShareTokens.letterId, newLetter.id));
      await db.delete(letters).where(eq(letters.id, newLetter.id));
    });

    it("should not duplicate if already migrated", async () => {
      const db = await getDb();
      
      // 既にletterShareTokensにあるトークン
      const existingToken = nanoid(21);
      await createShareToken(testLetterId, existingToken);
      
      // 再度移行を試みる
      await migrateShareTokenIfNeeded(testLetterId, existingToken);
      
      // 重複していないことを確認
      const records = await db.select()
        .from(letterShareTokens)
        .where(and(
          eq(letterShareTokens.letterId, testLetterId),
          eq(letterShareTokens.token, existingToken)
        ));
      
      expect(records.length).toBe(1);
    });
  });

  describe("Active token constraint", () => {
    it("should maintain only one active token per letter", async () => {
      const db = await getDb();
      
      // 複数回rotateしても、activeは常に1つ
      const token1 = nanoid(21);
      const token2 = nanoid(21);
      const token3 = nanoid(21);
      
      await rotateShareToken(testLetterId, token1);
      await rotateShareToken(testLetterId, token2);
      await rotateShareToken(testLetterId, token3);
      
      // activeなトークンは1つだけ
      const activeTokens = await db.select()
        .from(letterShareTokens)
        .where(and(
          eq(letterShareTokens.letterId, testLetterId),
          eq(letterShareTokens.status, "active")
        ));
      
      expect(activeTokens.length).toBe(1);
      expect(activeTokens[0].token).toBe(token3);
    });
  });
});
