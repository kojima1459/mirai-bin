import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";
import type { TrpcContext } from "./_core/context";

// 1. Hoisted Mock Data & DB
const { mockDb, mockData } = vi.hoisted(() => {
  const mockData = {
    users: [] as any[],
    letters: [] as any[],
    templates: [] as any[],
    drafts: [] as any[],
  };

  const mockDb = {
    _getTableData: (table: any) => {
      // Simple name matching
      const name = table.name || (typeof table === 'string' ? table : '') || table._?.name || table.originalName;
      if (name === 'users') return mockData.users;
      if (name === 'letters') return mockData.letters;
      if (name === 'templates') return mockData.templates;
      if (name === 'drafts') return mockData.drafts;
      return [];
    },
    // select chain
    select: (fields?: any) => mockDb._createSelectQuery(),
    _createSelectQuery: () => ({
      from: (table: any) => ({
        where: (condition: any) => mockDb._createSelectQueryWithCondition(table, condition),
        orderBy: (order: any) => mockDb._createSelectQueryWithCondition(table, undefined),
        limit: async (n: number) => mockDb._fetch(table, undefined, n),
        then: (resolve: any) => resolve(mockDb._fetch(table)) // fetch all
      })
    }),
    _createSelectQueryWithCondition: (table: any, condition?: any) => ({
      orderBy: (order: any) => ({
        limit: async (n: number) => mockDb._fetch(table, condition, n),
        then: (resolve: any) => resolve(mockDb._fetch(table, condition))
      }),
      limit: async (n: number) => mockDb._fetch(table, condition, n),
      then: (resolve: any) => resolve(mockDb._fetch(table, condition))
    }),

    insert: (table: any) => ({
      values: (values: any) => ({
        $returningId: async () => mockDb._insert(table, values),
        onDuplicateKeyUpdate: async (opts: any) => mockDb._insert(table, values, opts),
        then: (resolve: any) => resolve(mockDb._insert(table, values))
      })
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: async (condition: any) => mockDb._update(table, values, condition)
      })
    }),
    delete: (table: any) => ({
      where: async (condition: any) => mockDb._delete(table, condition)
    }),

    _fetch: (table: any, condition?: any, limit?: number) => {
      let data = mockDb._getTableData(table);
      if (condition && typeof condition === 'function') {
        data = data.filter(condition);
      }
      if (limit) data = data.slice(0, limit);
      return [...data];
    },
    _insert: (table: any, values: any, upsertOpts?: any) => {
      const data = mockDb._getTableData(table);
      if (upsertOpts && (table.name === 'users' || table === 'users')) {
        const existing = data.find((u: any) => u.openId === values.openId);
        if (existing) {
          Object.assign(existing, upsertOpts.set);
          return [{ insertId: existing.id }];
        }
      }
      const id = Math.floor(Math.random() * 1000000);
      data.push({ ...values, id });
      return [{ insertId: id }];
    },
    _update: (table: any, values: any, condition: any) => {
      const data = mockDb._getTableData(table);
      let count = 0;
      if (condition && typeof condition === 'function') {
        data.forEach((item: any) => {
          if (condition(item)) {
            Object.assign(item, values);
            count++;
          }
        });
      }
      return [{ affectedRows: count }];
    },
    _delete: (table: any, condition: any) => {
      const name = table.name || (typeof table === 'string' ? table : '') || table._?.name || table.originalName;;
      let key = '';
      if (name === 'users') key = 'users';
      if (name === 'letters') key = 'letters';
      if (name === 'templates') key = 'templates';
      if (name === 'drafts') key = 'drafts';

      if (key) {
        const originalLength = (mockData as any)[key].length;
        (mockData as any)[key] = (mockData as any)[key].filter((item: any) => !condition(item));
        return [{ affectedRows: originalLength - (mockData as any)[key].length }];
      }
      return [{ affectedRows: 0 }];
    }
  };

  return { mockDb, mockData };
});


// 3. Mock Modules
vi.mock("drizzle-orm", () => ({
  eq: (col: any, val: any) => {
    return (item: any) => {
      const key = col.name;
      if (!key) return false;
      return item[key] === val;
    };
  },
  and: (...conditions: any[]) => (item: any) => conditions.every(c => c && c(item)),
  desc: () => ({}),
  asc: () => ({}),
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => mockDb,
}));

// Mock db.ts
vi.mock("./db", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(mockDb), // Still needed for explicit imports
  };
});

// Mock Schema
vi.mock("../drizzle/schema", async (importOriginal) => {
  const actual: any = await importOriginal();
  const addName = (t: any, n: string) => { if (t) t.name = n; return t; };
  return {
    ...actual,
    users: addName(actual.users || {}, 'users'),
    letters: addName(actual.letters || {}, 'letters'),
    templates: addName(actual.templates || {}, 'templates'),
    drafts: addName(actual.drafts || {}, 'drafts'),
  };
});

// Mock environment for db.ts internal usage
process.env.DATABASE_URL = "mysql://mock:3306/mock";

// Import appRouter AFTER mocks
import { appRouter } from "./routers";

// Helper functions for context
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("template.list", () => {
  beforeEach(() => {
    // Seed templates if empty
    mockData.templates = [];
    mockData.templates.push({ name: '10years', displayName: '10歳の誕生日に' });
  });

  it("returns templates for public access", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.template.list();
    expect(Array.isArray(result)).toBe(true);
    // seedTemplates might fail silently if mocked db doesn't fully support its query
    // but we expect at least the one we pushed
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBeDefined();
  });
});

describe("letter router", () => {
  beforeEach(() => {
    mockData.letters = [];
    mockData.users = [];

    const user = {
      id: 1,
      openId: "test-user-123",
      email: "test@example.com"
    };
    mockData.users.push(user);

    mockData.letters.push({
      id: 10,
      authorId: 1,
      status: 'sealed',
      createdAt: new Date(),
      visibilityScope: 'private'
    });
  });

  describe("letter.list", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.letter.list({ scope: 'private' })).rejects.toThrow();
    });

    it("returns letters for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.letter.list({ scope: 'private' });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(10);
    });
  });

  describe("letter.create", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.letter.create({
          finalContent: "Test content",
          encryptionIv: "test-iv",
          ciphertextUrl: "https://example.com/ciphertext",
          proofHash: "abc123",
          serverShare: "share",
        })
      ).rejects.toThrow();
    });
  });
});

describe("ai router", () => {
  describe("ai.transcribe", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.ai.transcribe({
          audioUrl: "https://example.com/audio.webm",
        })
      ).rejects.toThrow();
    });
  });

  describe("ai.generateDraft", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.ai.generateDraft({
          transcription: "Test transcription",
          templateName: "10years",
        })
      ).rejects.toThrow();
    });
  });
});

describe("storage router", () => {
  describe("storage.uploadAudio", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.storage.uploadAudio({
          audioBase64: "dGVzdA==",
          mimeType: "audio/webm",
        })
      ).rejects.toThrow();
    });
  });

  describe("storage.uploadCiphertext", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.storage.uploadCiphertext({
          ciphertextBase64: "dGVzdA==",
        })
      ).rejects.toThrow();
    });
  });
});


describe("letter.updateSchedule", () => {
  it("requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.letter.updateSchedule({
        letterId: 1,
        unlockAt: new Date().toISOString(),
      })
    ).rejects.toThrow();
  });

  it("requires valid letterId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.letter.updateSchedule({
      letterId: 999999,
      unlockAt: new Date().toISOString(),
    })
    ).rejects.toThrow();
  });
});


describe("user.updateEmail", () => {
  it("requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.updateEmail({
        newEmail: "newemail@example.com",
      })
    ).rejects.toThrow();
  });

  it("requires valid email format", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.updateEmail({
        newEmail: "invalid-email",
      })
    ).rejects.toThrow();
  });
});


describe("letter.regenerateUnlockCode", () => {
  it("requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.letter.regenerateUnlockCode({
        id: 1,
        newEnvelope: {
          wrappedClientShare: "test",
          wrappedClientShareIv: "test-iv",
          wrappedClientShareSalt: "test-salt",
          wrappedClientShareKdf: "pbkdf2",
          wrappedClientShareKdfIters: 100000,
        },
      })
    ).rejects.toThrow();
  });

  it("requires valid letterId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.letter.regenerateUnlockCode({
      id: 999999,
      newEnvelope: {
        wrappedClientShare: "test",
        wrappedClientShareIv: "test-iv",
        wrappedClientShareSalt: "test-salt",
        wrappedClientShareKdf: "pbkdf2",
        wrappedClientShareKdfIters: 100000,
      },
    });
    expect(result.success).toBe(false);
  });
});
