import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, letters, templates, drafts, letterReminders, InsertLetter, InsertTemplate, InsertDraft, InsertLetterReminder, Letter, Template, Draft, LetterReminder } from "../drizzle/schema";
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

export async function updateUserNotificationEmail(userId: number, notificationEmail: string | null): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set({ notificationEmail }).where(eq(users.id, userId));
}

export async function getUserNotificationEmail(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db.select({ email: users.email, notificationEmail: users.notificationEmail }).from(users).where(eq(users.id, userId)).limit(1);
  if (result.length === 0) return null;
  
  // notificationEmailが設定されていればそれを使用、未設定ならアカウントメールを使用
  return result[0].notificationEmail || result[0].email || null;
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

export async function getLetterByShareToken(shareToken: string): Promise<Letter | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(letters).where(eq(letters.shareToken, shareToken)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateLetterShareToken(id: number, shareToken: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(letters).set({ shareToken }).where(eq(letters.id, id));
}

export async function incrementViewCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const letter = await getLetterById(id);
  if (letter) {
    await db.update(letters).set({ 
      viewCount: letter.viewCount + 1,
      lastViewedAt: new Date()
    }).where(eq(letters.id, id));
  }
}

/**
 * 手紙を開封済みにマーク（原子的更新）
 * 
 * WHERE isUnlocked = false で二重開封レースを防止
 * 
 * @param id 手紙ID
 * @returns 更新が成功したかどうか（既に開封済みの場合はfalse）
 */
export async function unlockLetter(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 原子的更新: isUnlocked = false の場合のみ更新
  const result = await db.update(letters).set({ 
    isUnlocked: true,
    unlockedAt: new Date()
  }).where(and(eq(letters.id, id), eq(letters.isUnlocked, false)));
  
  // affectedRows > 0 なら初回開封
  return (result as any)[0]?.affectedRows > 0;
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

  // 親から子への気持ちの承継をメインに、人生の節目に合わせたテンプレート
  const defaultTemplates: InsertTemplate[] = [
    // === 幼少期 === 
    {
      name: "10years",
      displayName: "10歳の誕生日に",
      description: "二桁の年齢を迎える節目の日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、10歳の誕生日を迎える子どもへの温かい手紙を作成してください。

【ルール】
- 親の愛情が伝わる温かい文体で
- 10年間の成長を振り返り、喜びを伝える
- これからの10年への期待と応援
- たとえ親がそばにいなくても、この想いは変わらないというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "10歳になる子どもに伝えたいことを、90秒で話してください。生まれてきてくれた喜び、成長の思い出、これからの願いなど。",
      exampleOneLiner: "10年間、毎日が宝物だったよ。",
      icon: "cake",
    },

    // === 小学校 ===
    {
      name: "elementary-graduation",
      displayName: "小学校卒業の日に",
      description: "6年間の成長を祝う門出の日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、小学校卒業を迎える子どもへの手紙を作成してください。

【ルール】
- 6年間の成長を振り返り、誇りに思う気持ち
- 入学式の日のこと、忘れられない思い出
- 中学生という新しいステージへの応援
- どんなときも味方だというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "小学校を卒業する子どもに伝えたいことを、90秒で話してください。6年間の思い出、成長への喜び、中学生になる子へのエールなど。",
      exampleOneLiner: "ランドセルが小さく見えるようになったね。",
      icon: "graduation-cap",
    },

    // === 中学校 ===
    {
      name: "junior-high-entrance",
      displayName: "中学入学の日に",
      description: "新しい制服に袖を通す日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、中学入学を迎える子どもへの手紙を作成してください。

【ルール】
- 新しい環境への不安を和らげる温かい言葉
- 新しい友達、新しい経験への期待
- 思春期の始まり、悩みがあっても大丈夫というメッセージ
- いつでも話を聞くよという安心感
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "中学生になる子どもに伝えたいことを、90秒で話してください。新しい環境への応援、思春期を迎える子へのメッセージなど。",
      exampleOneLiner: "制服姿、まぶしくて涙が出そうだよ。",
      icon: "school",
    },
    {
      name: "junior-high-graduation",
      displayName: "中学卒業の日に",
      description: "義務教育を終え、自分の道を選ぶ日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、中学卒業を迎える子どもへの手紙を作成してください。

【ルール】
- 義務教育を終えたことへの祝福
- 自分で進路を選んだことへの誇り
- これからの道は自分で切り拓くというエール
- どんな選択も応援するという無条件の愛
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "中学を卒業する子どもに伝えたいことを、90秒で話してください。3年間の成長、進路を選んだことへの想いなど。",
      exampleOneLiner: "自分で選んだ道、胸を張って歩いてね。",
      icon: "graduation-cap",
    },

    // === 高校 ===
    {
      name: "high-school-entrance",
      displayName: "高校入学の日に",
      description: "受験を乗り越え、新しいスタートを切る日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、高校入学を迎える子どもへの手紙を作成してください。

【ルール】
- 受験を乗り越えた努力を認める
- 高校生活への期待と応援
- 多くの経験をしてほしいという願い
- 失敗しても大丈夫、いつでも帰る場所があるという安心感
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "高校生になる子どもに伝えたいことを、90秒で話してください。受験への努力、高校生活への期待など。",
      exampleOneLiner: "受験勉強、本当に頑張ったね。",
      icon: "school",
    },
    {
      name: "high-school-graduation",
      displayName: "高校卒業の日に",
      description: "大人への扉を開く日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、高校卒業を迎える子どもへの手紙を作成してください。

【ルール】
- 18年間の成長を振り返り、感謝を伝える
- これからは自分の足で歩むというエール
- 親としての誇りと信頼
- たとえ離れていても、いつも応援しているというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "高校を卒業する子どもに伝えたいことを、90秒で話してください。3年間の思い出、これからの人生へのエールなど。",
      exampleOneLiner: "立派な大人になったね。誇りに思うよ。",
      icon: "graduation-cap",
    },

    // === 大学・専門学校 ===
    {
      name: "university-entrance",
      displayName: "大学入学の日に",
      description: "新しい学びの場所で羽ばたく日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、大学入学を迎える子どもへの手紙を作成してください。

【ルール】
- 受験を乗り越えた努力への称賛
- 一人暮らしや新生活への応援
- 多くの人と出会い、多くの経験をしてほしい
- 困ったときはいつでも連絡してというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "大学生になる子どもに伝えたいことを、90秒で話してください。新生活への応援、学びへの期待など。",
      exampleOneLiner: "たくさんの人と出会って、たくさんの経験をしてね。",
      icon: "book-open",
    },

    // === 成人 ===
    {
      name: "coming-of-age",
      displayName: "成人の日に",
      description: "18歳、大人としての第一歩を踏み出す日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、成人を迎える子どもへの手紙を作成してください。

【ルール】
- 18年間の成長を振り返り、感謝と祝福を伝える
- 大人としての責任と自由について
- 親から子への人生の教訓やアドバイス
- これからもずっと応援しているというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "成人を迎える子どもに伝えたいことを、90秒で話してください。生まれてからの18年間の思い出、大人としてのエールなど。",
      exampleOneLiner: "おめでとう。立派な大人になったね。",
      icon: "star",
    },

    // === 就職 ===
    {
      name: "first-job",
      displayName: "就職の日に",
      description: "社会人としての第一歩を踏み出す日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、就職を迎える子どもへの手紙を作成してください。

【ルール】
- 社会人としての門出を祝福
- 仕事の大変さとやりがいについて
- 親自身の社会人経験からのアドバイス
- 辛いときは無理しないで、いつでも帰ってきていいというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "社会人になる子どもに伝えたいことを、90秒で話してください。仕事へのアドバイス、応援の気持ちなど。",
      exampleOneLiner: "自分の力で稼ぐって、すごいことだよ。",
      icon: "briefcase",
    },

    // === 恋愛・結婚 ===
    {
      name: "first-love",
      displayName: "最初に恋をした日に",
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
    {
      name: "wedding-day",
      displayName: "結婚する日に",
      description: "人生の伴侶を見つけた日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、結婚を迎える子どもへの手紙を作成してください。

【ルール】
- 結婚への祝福と喜び
- 子どもを育ててきた日々の思い出
- 結婚生活へのアドバイス（親自身の経験から）
- 新しい家族への祝福と、これからも見守っているというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "結婚する子どもに伝えたいことを、90秒で話してください。祝福の言葉、結婚生活へのアドバイスなど。",
      exampleOneLiner: "幸せになってね。ずっと見守ってるよ。",
      icon: "heart",
    },

    // === 親になる ===
    {
      name: "becoming-parent",
      displayName: "子どもが生まれた日に",
      description: "自分も親になる日に",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、自分も親になった子どもへの手紙を作成してください。

【ルール】
- 孫の誕生への喜びと祝福
- 自分が親になったときの気持ちを思い出す
- 子育ての大変さと喜びについて
- いつでも助けになるよ、一緒に育てようというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "親になった子どもに伝えたいことを、90秒で話してください。孫の誕生への喜び、子育てのアドバイスなど。",
      exampleOneLiner: "おめでとう。あなたなら素敵な親になれるよ。",
      icon: "baby",
    },

    // === 特別な日 ===
    {
      name: "difficult-times",
      displayName: "辛いときに読んで",
      description: "人生の壁にぶつかったときに",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、辛いときに読んでほしい手紙を作成してください。

【ルール】
- 辛い時期を乗り越える勇気を与える
- 親自身も辛い時期があったという共感
- 無理しなくていい、逃げてもいいというメッセージ
- どんなときも味方だという無条件の愛
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "辛いときの子どもに伝えたいことを、90秒で話してください。励ましの言葉、自分の経験など。",
      exampleOneLiner: "大丈夫。あなたは一人じゃないよ。",
      icon: "hand-heart",
    },
    {
      name: "someday",
      displayName: "いつか読んでほしい手紙",
      description: "特定の日ではなく、いつか届けたい想い",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、いつか子どもに読んでほしい手紙を作成してください。

【ルール】
- 特定のイベントに縛られない、普遍的な親の想い
- 子どもへの愛情と感謝
- 人生で大切にしてほしいこと
- たとえ親がいなくなっても、この想いは永遠に変わらないというメッセージ
- 300〜500文字程度

【音声文字起こし】
{{transcription}}`,
      recordingPrompt: "子どもに伝えたい想いを、90秒で自由に話してください。愛情、感謝、人生の教訓など。",
      exampleOneLiner: "あなたのことを、ずっと愛しているよ。",
      icon: "mail",
    },
  ];

  for (const template of defaultTemplates) {
    await db.insert(templates).values(template);
  }

  console.log(`[Database] Seeded ${defaultTemplates.length} default templates`);
}


// ============================================
// Draft Queries
// ============================================

export async function createDraft(draft: InsertDraft): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(drafts).values(draft);
  return result[0].insertId;
}

export async function getDraftById(id: number): Promise<Draft | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDraftsByUser(userId: number): Promise<Draft[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(drafts)
    .where(eq(drafts.userId, userId))
    .orderBy(desc(drafts.updatedAt));
}

export async function updateDraft(id: number, updates: Partial<InsertDraft>): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(drafts).set(updates).where(eq(drafts.id, id));
}

export async function deleteDraft(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(drafts).where(eq(drafts.id, id));
}

export async function getDraftByUserAndId(userId: number, draftId: number): Promise<Draft | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ========================================
// リマインダー関連
// ========================================

/**
 * リマインダーを作成
 */
export async function createReminder(reminder: InsertLetterReminder): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(letterReminders).values(reminder);
  return result[0].insertId;
}

/**
 * 手紙のリマインダーを一括作成
 * @param letterId 手紙ID
 * @param ownerUserId オーナーユーザーID
 * @param unlockAt 開封日時
 * @param daysBeforeList X日前のリスト（例: [90, 30, 7, 1]）
 */
export async function createRemindersForLetter(
  letterId: number,
  ownerUserId: number,
  unlockAt: Date,
  daysBeforeList: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 既存のリマインダーを削除
  await db.delete(letterReminders).where(eq(letterReminders.letterId, letterId));

  // 新しいリマインダーを作成
  for (const daysBefore of daysBeforeList) {
    const scheduledAt = new Date(unlockAt.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    
    // 過去の日付はスキップ
    if (scheduledAt <= new Date()) {
      continue;
    }

    await db.insert(letterReminders).values({
      letterId,
      ownerUserId,
      type: "before_unlock",
      daysBefore,
      scheduledAt,
      status: "pending",
    });
  }
}

/**
 * 手紙のリマインダーを取得
 */
export async function getRemindersByLetterId(letterId: number): Promise<LetterReminder[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(letterReminders)
    .where(eq(letterReminders.letterId, letterId))
    .orderBy(letterReminders.daysBefore);
}

/**
 * 送信すべきリマインダーを取得（scheduledAt <= now かつ sentAt IS NULL）
 */
export async function getPendingReminders(limit: number = 100): Promise<(LetterReminder & { letter: Letter | null; user: { email: string | null; notificationEmail: string | null } | null })[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const now = new Date();
  
  // pendingかつscheduledAt <= nowのリマインダーを取得
  const reminders = await db.select().from(letterReminders)
    .where(and(
      eq(letterReminders.status, "pending"),
      // scheduledAt <= now
    ))
    .limit(limit);

  // scheduledAt <= now でフィルタリング（drizzle-ormのlte演算子を使用）
  const filteredReminders = reminders.filter(r => r.scheduledAt <= now);

  // 各リマインダーに手紙とユーザー情報を付加
  const result = await Promise.all(filteredReminders.map(async (reminder) => {
    const letter = await db.select().from(letters)
      .where(eq(letters.id, reminder.letterId))
      .limit(1);
    
    const user = await db.select({
      email: users.email,
      notificationEmail: users.notificationEmail,
    }).from(users)
      .where(eq(users.id, reminder.ownerUserId))
      .limit(1);

    return {
      ...reminder,
      letter: letter[0] || null,
      user: user[0] || null,
    };
  }));

  return result;
}

/**
 * リマインダーを送信済みにマーク（原子的更新で二重送信防止）
 */
export async function markReminderAsSent(reminderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // sentAt IS NULL の条件で更新（二重送信防止）
  const result = await db.update(letterReminders)
    .set({
      sentAt: new Date(),
      status: "sent",
    })
    .where(and(
      eq(letterReminders.id, reminderId),
      eq(letterReminders.status, "pending")
    ));

  // 更新件数が0なら既に送信済み
  return (result[0].affectedRows ?? 0) > 0;
}

/**
 * リマインダーを失敗にマーク
 */
export async function markReminderAsFailed(reminderId: number, error: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(letterReminders)
    .set({
      status: "failed",
      lastError: error,
    })
    .where(eq(letterReminders.id, reminderId));
}

/**
 * 手紙のリマインダー設定を更新
 */
export async function updateLetterReminders(
  letterId: number,
  ownerUserId: number,
  unlockAt: Date,
  daysBeforeList: number[]
): Promise<void> {
  await createRemindersForLetter(letterId, ownerUserId, unlockAt, daysBeforeList);
}

/**
 * 手紙のリマインダーを削除
 */
export async function deleteRemindersByLetterId(letterId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(letterReminders).where(eq(letterReminders.letterId, letterId));
}
