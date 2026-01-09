import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, letters, templates, drafts, letterReminders, letterShareTokens, families, familyMembers, familyInvites, interviewSessions, interviewMessages, InsertLetter, InsertTemplate, InsertDraft, InsertLetterReminder, Letter, Template, Draft, LetterReminder, LetterShareToken, InsertLetterShareToken, Family, InsertFamily, FamilyMember, InsertFamilyMember, FamilyInvite, InsertFamilyInvite, InterviewSession, InsertInterviewSession, InterviewMessage, InsertInterviewMessage } from "../drizzle/schema";
import { ENV } from './_core/env';

// Share Token Logic Import
import * as ShareTokenLogic from "./db_share_token";
import * as ReminderLogic from "./db_reminder";

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

export async function updateUserEmail(userId: number, newEmail: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set({ email: newEmail }).where(eq(users.id, userId));
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
  const existingNames = new Set(existingTemplates.map(t => t.name));

  // 親から子への気持ちの承継をメインに、人生の節目に合わせたテンプレート
  const defaultTemplates: InsertTemplate[] = [
    // === 自由形式（おすすめ） ===
    {
      name: "free-format",
      displayName: "自由形式",
      subtitle: "あなたの言葉で、自由に想いを伝える",
      description: "テンプレートの形式にとらわれず、あなたの言葉で自由に手紙を書きます。口語表現や話し言葉の温かさをそのまま残します。",
      category: "milestone",
      icon: "edit-3",
      prompt: `あなたは親が子どもに宛てた手紙を書くアシスタントです。
以下の音声文字起こしをもとに、温かい手紙を作成してください。

【ルール】
- 話者の言葉をできるだけそのまま活かす
- 口語表現や話し言葉の温かさを保持する
- 明らかな言い間違いや重複のみ修正
- 長さは話者の意図に合わせる（制限なし）
- 形式的な挨拶文は追加しない
- 話者の感情やニュアンスを大切にする

【音壵文字起こし】
{{transcription}}`,
      recordingPrompt: "伝えたいことを、あなたの言葉で自由に話してください。日常の会話のように、思いのままに。",
      exampleOneLiner: "あなたの言葉で、自由に想いを伝える",
      isRecommended: true,
      sortOrder: 1,
    },
    {
      name: "raw-transcription",
      displayName: "文字起こしそのまま",
      subtitle: "録音した言葉を100%そのまま残す",
      description: "AIによる整形を一切行わず、文字起こし結果をそのまま手紙にします。言い間違いや「えーと」などのフィラーも含めて、あなたの声を完全に保存します。",
      category: "milestone",
      icon: "mic-2",
      prompt: `以下の音声文字起こしを、一切変更せずにそのまま出力してください。

【重要なルール】
- 文字起こしの内容を一切変更しない
- 修正、追加、削除は行わない
- 文章としての整形も一切行わない
- そのままの形で出力する

【音壵文字起こし】
{{transcription}}`,
      recordingPrompt: "伝えたいことを、思いのままに話してください。録音した言葉がそのまま手紙になります。",
      exampleOneLiner: "録音した言葉を100%そのまま残す",
      isRecommended: true,
      sortOrder: 2,
    },

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

  // 既存のテンプレートがない場合は全て追加、ある場合は存在しないもののみ追加
  const templatesToAdd = defaultTemplates.filter(t => !existingNames.has(t.name));

  if (templatesToAdd.length === 0) {
    console.log("[Database] All templates already exist, skipping seed");
    return;
  }

  for (const template of templatesToAdd) {
    await db.insert(templates).values(template);
  }

  console.log(`[Database] Added ${templatesToAdd.length} new templates: ${templatesToAdd.map(t => t.name).join(', ')}`);
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
  if (!db) throw new Error("Database not available");
  return ReminderLogic.createReminder(db, reminder);
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
  if (!db) throw new Error("Database not available");
  return ReminderLogic.createRemindersForLetter(db, letterId, ownerUserId, unlockAt, daysBeforeList);
}

/**
 * 手紙のリマインダーを取得
 */
export async function getRemindersByLetterId(letterId: number): Promise<LetterReminder[]> {
  const db = await getDb();
  if (!db) return [];
  return ReminderLogic.getRemindersByLetterId(db, letterId);
}

/**
 * 送信すべきリマインダーを取得（scheduledAt <= now かつ sentAt IS NULL）
 */
export async function getPendingReminders(limit: number = 100): Promise<(LetterReminder & { letter: Letter | null; user: { email: string | null; notificationEmail: string | null } | null })[]> {
  const db = await getDb();
  if (!db) return [];
  return ReminderLogic.getPendingReminders(db, limit);
}

/**
 * リマインダーを送信済みにマーク（原子的更新で二重送信防止）
 */
export async function markReminderAsSent(reminderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ReminderLogic.markReminderAsSent(db, reminderId);
}

/**
 * リマインダーを失敗にマーク
 */
export async function markReminderAsFailed(reminderId: number, error: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ReminderLogic.markReminderAsFailed(db, reminderId, error);
}

/**
 * 手紙のリマインダーを更新（未送信のみ再計算、送信済みは保持）
 * @param letterId 手紙ID
 * @param ownerUserId オーナーユーザーID
 * @param unlockAt 開封日時
 * @param daysBeforeList X日前のリスト（例: [90, 30, 7, 1]）
 */
export async function updateLetterReminders(
  letterId: number,
  ownerUserId: number,
  unlockAt: Date,
  daysBeforeList: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ReminderLogic.updateLetterReminders(db, letterId, ownerUserId, unlockAt, daysBeforeList);
}

/**
 * 手紙のリマインダーを削除
 */
export async function deleteRemindersByLetterId(letterId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ReminderLogic.deleteRemindersByLetterId(db, letterId);
}


// ============================================
// 共有トークン関連（失効・再発行対応）
// ============================================

/**
 * トークンで共有トークンレコードを取得
 */
export async function getShareTokenRecord(token: string): Promise<LetterShareToken | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ShareTokenLogic.getShareTokenRecord(db, token);
}

/**
 * 手紙IDでアクティブな共有トークンを取得
 */
export async function getActiveShareToken(letterId: number): Promise<LetterShareToken | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ShareTokenLogic.getActiveShareToken(db, letterId);
}

/**
 * 新しい共有トークンを作成
 */
export async function createShareToken(letterId: number, token: string): Promise<{ success: boolean; token: string }> {
  /* Logic delegated */
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ShareTokenLogic.createShareToken(db, letterId, token);
}

/**
 * 共有トークンを無効化（revoke）
 */
export async function revokeShareToken(letterId: number, reason?: string): Promise<{ success: boolean; wasActive: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ShareTokenLogic.revokeShareToken(db, letterId, reason);
}

/**
 * 共有トークンを再発行（rotate）
 */
export async function rotateShareToken(letterId: number, newToken: string): Promise<{ success: boolean; newToken: string; oldToken?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ShareTokenLogic.rotateShareToken(db, letterId, newToken);
}

/**
 * 共有トークンのアクセス統計を更新
 */
export async function incrementShareTokenViewCount(token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ShareTokenLogic.incrementShareTokenViewCount(db, token);
}

/**
 * 既存のletters.shareTokenをletterShareTokensに移行
 */
export async function migrateShareTokenIfNeeded(letterId: number, legacyToken: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return ShareTokenLogic.migrateShareTokenIfNeeded(db, letterId, legacyToken);
}


/**
 * 解錠コードを再発行（セキュリティ強固版、再発行は1回のみ）
 * - 新しい封筒（wrappedClientShare）のみ生成
 * - 解錠コードはDBに保存しない
 * - unlockCodeRegeneratedAtを設定して2回目の再発行を禁止
 * - 旧封筒は上書きされるため、旧コードは自動的に無効化
 * 
 * @param letterId 手紙ID
 * @param newEnvelope 新しい封筒データ
 * @returns 更新結果
 */
export async function regenerateUnlockCode(
  letterId: number,
  newEnvelope: {
    wrappedClientShare: string;
    wrappedClientShareIv: string;
    wrappedClientShareSalt: string;
    wrappedClientShareKdf: string;
    wrappedClientShareKdfIters: number;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(letters)
    .set({
      wrappedClientShare: newEnvelope.wrappedClientShare,
      wrappedClientShareIv: newEnvelope.wrappedClientShareIv,
      wrappedClientShareSalt: newEnvelope.wrappedClientShareSalt,
      wrappedClientShareKdf: newEnvelope.wrappedClientShareKdf,
      wrappedClientShareKdfIters: newEnvelope.wrappedClientShareKdfIters,
      unlockCodeRegeneratedAt: new Date(),
    })
    .where(eq(letters.id, letterId));

  return true;
}


// ============================================
// 公開スコープ関連（PRIVATE/FAMILY/LINK）
// ============================================

/**
 * ユーザーが所属する家族IDリストを取得
 */
export async function getUserFamilyIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const memberships = await db.select({ familyId: familyMembers.familyId })
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  return memberships.map(m => m.familyId);
}

/**
 * ユーザーが指定のfamilyのメンバーかどうか判定
 */
export async function isUserFamilyMember(userId: number, familyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId)))
    .limit(1);

  return result.length > 0;
}

/**
 * 手紙へのアクセス権限判定（共通関数）
 * PRIVATEはauthorIdのみ、FAMILYはメンバーのみ、LINKは別経路（shareToken）
 * 
 * 注意: この関数は「一覧取得」には使わない（WHERE句で分離すべき）
 * 個別取得の権限チェックに使用する
 */
export async function canAccessLetter(userId: number, letter: Letter): Promise<boolean> {
  if (letter.visibilityScope === "private") {
    // PRIVATEはauthorIdのみ許可（存在秘匿）
    return letter.authorId === userId;
  }
  if (letter.visibilityScope === "family") {
    // FAMILYはメンバーのみ許可
    if (!letter.familyId) return false;
    return await isUserFamilyMember(userId, letter.familyId);
  }
  // link: shareToken経由でアクセス（この関数では判定しない）
  return false;
}

/**
 * スコープ別の手紙リスト取得（WHERE句で完全分離）
 * 
 * 重要: 各スコープは完全に分離されたクエリを使用
 * PRIVATEが他スコープに混入することを防ぐ
 */
export async function getLettersByScope(userId: number, scope: "private" | "family" | "link"): Promise<Letter[]> {
  const db = await getDb();
  if (!db) return [];

  if (scope === "private") {
    // PRIVATE: 自分が作成 AND visibilityScope='private'
    return await db.select().from(letters)
      .where(and(
        eq(letters.authorId, userId),
        eq(letters.visibilityScope, "private")
      ))
      .orderBy(desc(letters.createdAt));
  }

  if (scope === "family") {
    // FAMILY: familyId IN (user's memberships) AND visibilityScope='family'
    const familyIds = await getUserFamilyIds(userId);
    if (familyIds.length === 0) return [];

    // 注意: authorIdでのOR条件は絶対に入れない（混線防止）
    const result: Letter[] = [];
    for (const fid of familyIds) {
      const familyLetters = await db.select().from(letters)
        .where(and(
          eq(letters.familyId, fid),
          eq(letters.visibilityScope, "family")
        ))
        .orderBy(desc(letters.createdAt));
      result.push(...familyLetters);
    }
    // 日付順でソート
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (scope === "link") {
    // LINK: 自分が作成 AND visibilityScope='link'（送信者の管理用）
    return await db.select().from(letters)
      .where(and(
        eq(letters.authorId, userId),
        eq(letters.visibilityScope, "link")
      ))
      .orderBy(desc(letters.createdAt));
  }

  return [];
}


// ============================================
// Family関連クエリ
// ============================================

/**
 * 家族グループを作成（owner自身をmemberに追加）
 */
export async function createFamily(ownerUserId: number, name?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(families).values({
    ownerUserId,
    name: name || "マイファミリー",
  });
  const familyId = result[0].insertId;

  // owner自身をmemberに追加
  await db.insert(familyMembers).values({
    familyId,
    userId: ownerUserId,
    role: "owner",
  });

  return familyId;
}

/**
 * オーナーの家族グループを取得
 */
export async function getFamilyByOwner(ownerUserId: number): Promise<Family | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(families)
    .where(eq(families.ownerUserId, ownerUserId))
    .limit(1);
  return result[0];
}

/**
 * ユーザーが所属する家族グループ一覧を取得
 */
export async function getFamilyMemberships(userId: number): Promise<Family[]> {
  const db = await getDb();
  if (!db) return [];

  const membershipIds = await getUserFamilyIds(userId);
  if (membershipIds.length === 0) return [];

  const result: Family[] = [];
  for (const fid of membershipIds) {
    const family = await db.select().from(families)
      .where(eq(families.id, fid))
      .limit(1);
    if (family[0]) result.push(family[0]);
  }
  return result;
}

/**
 * 家族メンバー一覧を取得
 */
export async function getFamilyMembers(familyId: number): Promise<(FamilyMember & { user?: { id: number; name: string | null; email: string | null } })[]> {
  const db = await getDb();
  if (!db) return [];

  const members = await db.select().from(familyMembers)
    .where(eq(familyMembers.familyId, familyId));

  // ユーザー情報を付加
  const result = await Promise.all(members.map(async (m) => {
    const user = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, m.userId))
      .limit(1);
    return { ...m, user: user[0] || undefined };
  }));

  return result;
}

/**
 * 家族招待を作成
 */
export async function createFamilyInvite(familyId: number, invitedEmail: string, token: string, expiresAt: Date): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(familyInvites).values({
    familyId,
    invitedEmail,
    token,
    expiresAt,
  });
  return result[0].insertId;
}

/**
 * 招待トークンで招待を取得
 */
export async function getFamilyInviteByToken(token: string): Promise<FamilyInvite | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(familyInvites)
    .where(eq(familyInvites.token, token))
    .limit(1);
  return result[0];
}

/**
 * 招待を受諾（membershipを作成、invite statusを更新）
 */
export async function acceptFamilyInvite(token: string, userId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invite = await getFamilyInviteByToken(token);
  if (!invite) {
    return { success: false, error: "招待が見つかりません" };
  }
  if (invite.status !== "pending") {
    return { success: false, error: "この招待は既に使用済みです" };
  }
  if (new Date() > invite.expiresAt) {
    return { success: false, error: "この招待は期限切れです" };
  }

  // 既にメンバーかチェック
  const alreadyMember = await isUserFamilyMember(userId, invite.familyId);
  if (alreadyMember) {
    return { success: false, error: "既にこのファミリーのメンバーです" };
  }

  // メンバーに追加
  await db.insert(familyMembers).values({
    familyId: invite.familyId,
    userId,
    role: "member",
  });

  // invite statusを更新
  await db.update(familyInvites)
    .set({ status: "accepted" })
    .where(eq(familyInvites.id, invite.id));

  return { success: true };
}

/**
 * 家族の招待一覧を取得
 */
export async function getFamilyInvites(familyId: number): Promise<FamilyInvite[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(familyInvites)
    .where(eq(familyInvites.familyId, familyId))
    .orderBy(desc(familyInvites.createdAt));
}

// ============================================
// AIインタビュー関連
// ============================================

/**
 * インタビューセッション作成
 */
export async function createInterviewSession(userId: number, recipientName?: string, topic?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(interviewSessions).values({
    userId,
    recipientName: recipientName || "誰か",
    topic: topic || "自分史",
    status: "active",
  });
  return result[0].insertId;
}

/**
 * インタビューセッション取得
 */
export async function getInterviewSession(sessionId: number): Promise<InterviewSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId))
    .limit(1);
  return result[0];
}

/**
 * ユーザーの進行中のセッションを取得
 */
export async function getActiveInterviewSession(userId: number): Promise<InterviewSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(interviewSessions)
    .where(and(
      eq(interviewSessions.userId, userId),
      eq(interviewSessions.status, "active")
    ))
    .orderBy(desc(interviewSessions.createdAt))
    .limit(1);
  return result[0];
}

/**
 * メッセージを追加
 */
export async function addInterviewMessage(sessionId: number, sender: "ai" | "user", content: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(interviewMessages).values({
    sessionId,
    sender,
    content,
  });
}

/**
 * チャット履歴を取得（古い順）
 */
export async function getInterviewHistory(sessionId: number): Promise<InterviewMessage[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(interviewMessages)
    .where(eq(interviewMessages.sessionId, sessionId))
    .orderBy(interviewMessages.createdAt); // 古い順
}

/**
 * セッションを完了にする
 */
export async function completeInterviewSession(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(interviewSessions)
    .set({ status: "completed" })
    .where(eq(interviewSessions.id, sessionId));
}
