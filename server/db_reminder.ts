import { eq, and, desc } from "drizzle-orm";
import { letterReminders, letters, users, LetterReminder, InsertLetterReminder, Letter } from "../drizzle/schema";

// Drizzleの型定義簡易版
type DbInterface = {
    select: (args?: any) => any;
    insert: (table: any) => any;
    update: (table: any) => any;
    delete: (table: any) => any;
};

/**
 * リマインダーを作成
 */
export async function createReminder(db: DbInterface, reminder: InsertLetterReminder): Promise<number> {
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
    db: DbInterface,
    letterId: number,
    ownerUserId: number,
    unlockAt: Date,
    daysBeforeList: number[]
): Promise<void> {
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
export async function getRemindersByLetterId(db: DbInterface, letterId: number): Promise<LetterReminder[]> {
    return await db.select().from(letterReminders)
        .where(eq(letterReminders.letterId, letterId))
        .orderBy(letterReminders.daysBefore);
}

/**
 * 送信すべきリマインダーを取得（scheduledAt <= now かつ sentAt IS NULL）
 */
export async function getPendingReminders(db: DbInterface, limit: number = 100): Promise<(LetterReminder & { letter: Letter | null; user: { email: string | null; notificationEmail: string | null } | null })[]> {
    const now = new Date();

    // pendingかつscheduledAt <= nowのリマインダーを取得
    // 注: drizzle-ormの演算子をロジック層で使うため、テスト時にはこれらもmockが必要になるか、
    // あるいはdb.select()...where(and(...)) の構造自体をモックが解釈する必要がある。
    // 現在の簡易モックでは and や eq は単に true/false を返す関数を生成するだけなので、
    // db実装側でそれを解釈するロジックが必要。
    // しかし、shareToken.test.ts ではうまくいった。

    const reminders = await db.select().from(letterReminders)
        .where(and(
            eq(letterReminders.status, "pending"),
            // scheduledAt <= now condition is handled by filter below for test simplicity if needed,
            // but in real DB query we want it in WHERE.
            // Drizzle Mock is tricky here. 
            // Current implementation fetches by status='pending' then filters in JS?
            // No, let's keep it consistent with original code which fetches then filters in JS mostly?
            // Original code:
            // .where(and(eq(letterReminders.status, "pending")))
            // .limit(limit);
            // const filteredReminders = reminders.filter(r => r.scheduledAt <= now);
            // It seems original code was doing filtering in memory too for the date part?
            // Yes, see L803 in original db.ts view.
        ))
        .limit(limit);

    // scheduledAt <= now でフィルタリング（drizzle-ormのlte演算子を使用）
    // 実際にはDBクエリで絞るべきだが、元のコードがJSでfilterしていたのでそれに従う。
    const filteredReminders = reminders.filter((r: LetterReminder) => r.scheduledAt <= now);

    // 各リマインダーに手紙とユーザー情報を付加
    const result = await Promise.all(filteredReminders.map(async (reminder: LetterReminder) => {
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
export async function markReminderAsSent(db: DbInterface, reminderId: number): Promise<boolean> {
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
    return (result[0]?.affectedRows ?? 0) > 0;
}

/**
 * リマインダーを失敗にマーク
 */
export async function markReminderAsFailed(db: DbInterface, reminderId: number, error: string): Promise<void> {
    await db.update(letterReminders)
        .set({
            status: "failed",
            lastError: error,
        })
        .where(eq(letterReminders.id, reminderId));
}

/**
 * 手紙のリマインダーを更新（未送信のみ再計算、送信済みは保持）
 */
export async function updateLetterReminders(
    db: DbInterface,
    letterId: number,
    ownerUserId: number,
    unlockAt: Date,
    daysBeforeList: number[]
): Promise<void> {
    // 既存のリマインダーを取得
    const existingReminders = await db.select().from(letterReminders)
        .where(eq(letterReminders.letterId, letterId));

    // 送信済みのリマインダーを保持
    const sentReminders = existingReminders.filter((r: LetterReminder) => r.status === "sent");
    const sentDaysBefore = new Set(sentReminders.map((r: LetterReminder) => r.daysBefore));

    // 未送信のリマインダーを削除
    await db.delete(letterReminders).where(and(
        eq(letterReminders.letterId, letterId),
        eq(letterReminders.status, "pending")
    ));

    // 新しいリマインダーを作成（送信済みでないもののみ）
    for (const daysBefore of daysBeforeList) {
        // 既に送信済みの日数はスキップ
        if (sentDaysBefore.has(daysBefore)) {
            continue;
        }

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
 * 手紙のリマインダーを削除
 */
export async function deleteRemindersByLetterId(db: DbInterface, letterId: number): Promise<void> {
    await db.delete(letterReminders).where(eq(letterReminders.letterId, letterId));
}
