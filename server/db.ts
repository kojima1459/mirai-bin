import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, letters, templates, InsertLetter, InsertTemplate, Letter, Template } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Letter Queries
// ============================================

export async function createLetter(letter: InsertLetter): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(letters).values(letter);
  return result[0].insertId;
}

export async function getLetterById(id: number): Promise<Letter | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLettersByAuthor(authorId: number): Promise<Letter[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(letters)
    .where(eq(letters.authorId, authorId))
    .orderBy(desc(letters.createdAt));
}

export async function updateLetter(id: number, updates: Partial<InsertLetter>): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(letters).set(updates).where(eq(letters.id, id));
}

export async function deleteLetter(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(letters).where(eq(letters.id, id));
}

// ============================================
// Template Queries
// ============================================

export async function getAllTemplates(): Promise<Template[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(templates);
}

export async function getTemplateByName(name: string): Promise<Template | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(templates).where(eq(templates.name, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTemplate(template: InsertTemplate): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(templates).values(template);
  return result[0].insertId;
}

export async function seedTemplates(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot seed templates: database not available");
    return;
  }

  const existingTemplates = await getAllTemplates();
  if (existingTemplates.length > 0) {
    console.log("[Database] Templates already exist, skipping seed");
    return;
  }

  const defaultTemplates: InsertTemplate[] = [
    {
      name: "10years",
      displayName: "10歳へ",
      description: "10歳の誕生日を迎える子どもへの手紙",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、10歳の誕生日を迎える子どもへの温かい手紙を作成してください。

【ルール】
- 親の愛情が伝わる温かい文体で
- 子どもの成長を祝福する内容
- 将来への期待と応援のメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "10歳になる子どもに伝えたいことを、90秒で話してください。成長の喜び、思い出、将来への願いなど、心に浮かぶままに。",
      exampleOneLiner: "10年間、毎日が宝物だったよ。",
      icon: "cake",
    },
    {
      name: "graduation",
      displayName: "進学の朝に",
      description: "進学・卒業を迎える子どもへの手紙",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、進学・卒業を迎える子どもへの手紙を作成してください。

【ルール】
- 新しい門出を祝福する内容
- これまでの努力を認める言葉
- 新しい環境への励まし
- 親としての誇りを伝える
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "進学・卒業を迎える子どもに伝えたいことを、90秒で話してください。これまでの成長、新しい挑戦への応援など。",
      exampleOneLiner: "どんな道を選んでも、応援してるよ。",
      icon: "graduation-cap",
    },
    {
      name: "first-love",
      displayName: "最初に恋をした日へ",
      description: "恋を知った子どもへの手紙",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、恋を経験した子どもへの温かい手紙を作成してください。

【ルール】
- 恋愛という新しい感情を肯定する内容
- 傷つくこともあるけど大丈夫というメッセージ
- 親も同じ経験をしたという共感
- 自分を大切にしてほしいという願い
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "恋を知った子どもに伝えたいことを、90秒で話してください。自分の経験、アドバイス、応援の気持ちなど。",
      exampleOneLiner: "その気持ち、大切にしてね。",
      icon: "heart",
    },
  ];

  for (const template of defaultTemplates) {
    await db.insert(templates).values(template);
  }

  console.log("[Database] Seeded 3 default templates");
}
