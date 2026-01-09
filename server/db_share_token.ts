import { eq, and } from "drizzle-orm";
import { letterShareTokens, LetterShareToken } from "../drizzle/schema";

// Drizzleの型定義（簡易化のためanyを使わず、最低限のインターフェースを定義するか、genericsを使う）
// ここでは any で逃げず、drizzle-ormの型を使うのが理想だが、
// 呼び出し元の型推論を活かすため、db引数はあえて緩くするか、正確に書く。
// mysql2のdrizzleインスタンス型: MySql2Database<Record<string, never>> (schemaなしの場合)
// schemaありの場合: MySql2Database<typeof schema>
// ただし循環参照を避けるため、ここでは `any` または interface で受ける。

type DbInterface = {
    select: () => any;
    insert: (table: any) => any;
    update: (table: any) => any;
    delete: (table: any) => any;
};

/**
 * トークンで共有トークンレコードを取得
 */
export async function getShareTokenRecord(db: DbInterface, token: string): Promise<LetterShareToken | undefined> {
    const result = await db.select().from(letterShareTokens).where(eq(letterShareTokens.token, token)).limit(1);
    return result[0];
}

/**
 * 手紙IDでアクティブな共有トークンを取得
 */
export async function getActiveShareToken(db: DbInterface, letterId: number): Promise<LetterShareToken | undefined> {
    const result = await db.select()
        .from(letterShareTokens)
        .where(and(
            eq(letterShareTokens.letterId, letterId),
            eq(letterShareTokens.status, "active")
        ))
        .limit(1);
    return result[0];
}

/**
 * 新しい共有トークンを作成
 */
export async function createShareToken(db: DbInterface, letterId: number, token: string): Promise<{ success: boolean; token: string }> {
    // 既存のactiveトークンがあれば先に無効化（常に1つだけactiveを保証）
    const existingActive = await getActiveShareToken(db, letterId);
    if (existingActive) {
        await db.update(letterShareTokens)
            .set({
                status: "rotated",
                revokedAt: new Date(),
                replacedByToken: token,
            })
            .where(eq(letterShareTokens.id, existingActive.id));
    }

    await db.insert(letterShareTokens).values({
        token,
        letterId,
        status: "active",
        viewCount: 0,
    });
    return { success: true, token };
}

/**
 * 共有トークンを無効化（revoke）
 */
export async function revokeShareToken(db: DbInterface, letterId: number, reason?: string): Promise<{ success: boolean; wasActive: boolean }> {
    // activeなトークンを取得
    const activeToken = await getActiveShareToken(db, letterId);
    if (!activeToken) {
        // activeなトークンがない
        return { success: true, wasActive: false };
    }

    // 原子的更新: status=activeの場合のみ更新
    await db.update(letterShareTokens)
        .set({
            status: "revoked",
            revokedAt: new Date(),
            revokeReason: reason || null,
        })
        .where(and(
            eq(letterShareTokens.id, activeToken.id),
            eq(letterShareTokens.status, "active")
        ));

    return { success: true, wasActive: true };
}

/**
 * 共有トークンを再発行（rotate）
 */
export async function rotateShareToken(db: DbInterface, letterId: number, newToken: string): Promise<{ success: boolean; newToken: string; oldToken?: string }> {
    // activeなトークンを取得
    const activeToken = await getActiveShareToken(db, letterId);

    if (activeToken) {
        // 既存のactiveトークンをrotatedに変更
        await db.update(letterShareTokens)
            .set({
                status: "rotated",
                revokedAt: new Date(),
                replacedByToken: newToken,
            })
            .where(and(
                eq(letterShareTokens.id, activeToken.id),
                eq(letterShareTokens.status, "active")
            ));
    }

    // 新しいactiveトークンを作成
    // createShareTokenを呼ぶと activeToken再取得などが走るため、ここでは直接insertする？
    // いや、createShareTokenはローテーションロジックを含んでいるので、
    // ここでactiveTokenをrotatedにした後だと、createShareToken内のgetActiveShareTokenはnullを返し、単純にinsertしてくれるはず。

    // しかし、並行リクエストがあった場合、activeTokenが無効化された直後にcreateShareTokenが呼ばれると安全。
    // ここでは明示的に createShareToken を呼ぶ（内部で再度チェックしても問題ない）。
    // ただ、createShareToken内でもupdateが走る（無駄なアップデートになる可能性はあるが、idempotentならOK）。

    // 最適化: ここでrotatedにしたので、createShareTokenは単純insertになるはず。
    await createShareToken(db, letterId, newToken);

    return {
        success: true,
        newToken,
        oldToken: activeToken?.token,
    };
}

/**
 * 共有トークンのアクセス統計を更新
 */
export async function incrementShareTokenViewCount(db: DbInterface, token: string): Promise<void> {
    const tokenRecord = await getShareTokenRecord(db, token);
    if (!tokenRecord) return;

    await db.update(letterShareTokens)
        .set({
            viewCount: tokenRecord.viewCount + 1,
            lastAccessedAt: new Date(),
        })
        .where(eq(letterShareTokens.token, token));
}

/**
 * 既存のletters.shareTokenをletterShareTokensに移行
 */
export async function migrateShareTokenIfNeeded(db: DbInterface, letterId: number, legacyToken: string): Promise<void> {
    // 既にactiveなトークンがあればスキップ
    const existingActive = await getActiveShareToken(db, letterId);
    if (existingActive) return;

    // 既に同じトークンが存在するかチェック
    const existingToken = await getShareTokenRecord(db, legacyToken);
    if (existingToken) return;

    // 移行: activeとして追加
    await createShareToken(db, letterId, legacyToken);
}
