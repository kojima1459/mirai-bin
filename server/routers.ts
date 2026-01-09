import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { eq, isNull, and } from "drizzle-orm";
import {
  createLetter,
  getLetterById,
  getLettersByAuthor,
  updateLetter,
  deleteLetter,
  getAllTemplates,
  getTemplateByName,
  seedTemplates,
  getLetterByShareToken,
  updateLetterShareToken,
  incrementViewCount,
  unlockLetter,
  createDraft,
  getDraftById,
  getDraftsByUser,
  updateDraft,
  deleteDraft,
  getDraftByUserAndId,
  updateUserNotificationEmail,
  updateUserEmail,
  updateUserTrustedContactEmail,
  createRemindersForLetter,
  getRemindersByLetterId,
  updateLetterReminders,
  deleteRemindersByLetterId,
  getShareTokenRecord,
  getActiveShareToken,
  createShareToken,
  revokeShareToken,
  rotateShareToken,
  incrementShareTokenViewCount,
  migrateShareTokenIfNeeded,
  regenerateUnlockCode,
  getLettersByScope,
  canAccessLetter,
  createFamily,
  getFamilyByOwner,
  getFamilyMemberships,
  getFamilyMembers,
  createFamilyInvite,
  acceptFamilyInvite,
  getFamilyInvites,
  isUserFamilyMember,
  createInterviewSession,
  getInterviewSession,
  getActiveInterviewSession,
  addInterviewMessage,
  getInterviewHistory,
  completeInterviewSession,
  updateUserNotificationSettings,
} from "./db";
import { pushSubscriptions, users } from "../drizzle/schema";
import { invokeLLM, Role } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { stampHash, generateProofInfo } from "./opentimestamps";
import { canProvideServerShare } from "./shamir";
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  createReminderNotification,
} from "./db_notification";
import { getDb } from "./db";
import { sendEmail } from "./_core/email/sendEmail";
import {
  buildVerificationEmailSubject,
  buildVerificationEmailHtml,
  buildVerificationEmailText,
  buildOpenNotificationSubject,
  buildOpenNotificationHtml,
  buildOpenNotificationText,
} from "./_core/email/emailTemplates";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================
  // User Settings Router
  // ============================================
  user: router({
    /**
     * 通知先メールを更新
     * 未設定（null）ならアカウントメールを使用
     * 変更時はverified=falseにリセットされ、検証メールを送る
     */
    updateNotificationEmail: protectedProcedure
      .input(z.object({
        notificationEmail: z.string().email().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input.notificationEmail) {
          // Generate verification token
          const verifyToken = nanoid(32);
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

          await db.update(users).set({
            notificationEmail: input.notificationEmail,
            notificationEmailVerified: false,
            notificationEmailVerifyToken: verifyToken,
            notificationEmailVerifyExpiresAt: expiresAt,
          }).where(eq(users.id, ctx.user.id));

          // Send verification email
          try {
            const subject = buildVerificationEmailSubject();
            const html = buildVerificationEmailHtml({ token: verifyToken, email: input.notificationEmail });
            const text = buildVerificationEmailText({ token: verifyToken, email: input.notificationEmail });

            await sendEmail({
              to: input.notificationEmail,
              subject,
              text,
              html,
              category: "email_verification",
              meta: { userId: ctx.user.id },
            });
            console.log(`[Email Verification] Sent to ${input.notificationEmail}`);
          } catch (emailErr) {
            // Email send failure should not block the operation
            console.warn(`[Email Verification] Failed to send:`, emailErr);
          }

          return { success: true, requiresVerification: true };
        } else {
          // Clearing notification email
          await db.update(users).set({
            notificationEmail: null,
            notificationEmailVerified: false,
            notificationEmailVerifyToken: null,
            notificationEmailVerifyExpiresAt: null,
          }).where(eq(users.id, ctx.user.id));
          return { success: true, requiresVerification: false };
        }
      }),

    /**
     * メール検証トークンで確認
     */
    verifyNotificationEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.select().from(users)
          .where(eq(users.notificationEmailVerifyToken, input.token))
          .limit(1);

        if (result.length === 0) {
          return { success: false, error: "invalid_token" };
        }

        const user = result[0];
        const now = new Date();
        if (user.notificationEmailVerifyExpiresAt && user.notificationEmailVerifyExpiresAt < now) {
          return { success: false, error: "token_expired" };
        }

        await db.update(users).set({
          notificationEmailVerified: true,
          notificationEmailVerifyToken: null,
          notificationEmailVerifyExpiresAt: null,
        }).where(eq(users.id, user.id));

        return { success: true };
      }),

    /**
     * 現在の設定を取得
     */
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        return {
          notificationEmail: ctx.user.notificationEmail || null,
          notificationEmailVerified: ctx.user.notificationEmailVerified ?? false,
          trustedContactEmail: ctx.user.trustedContactEmail || null,
          accountEmail: ctx.user.email || null,
          notifyEnabled: ctx.user.notifyEnabled ?? true,
          notifyDaysBefore: ctx.user.notifyDaysBefore ?? 7,
        };
      }),

    /**
     * 信頼できる通知先メールを更新
     * 配偶者などの通知先（リマインド/初回開封通知を送信）
     */
    updateTrustedContactEmail: protectedProcedure
      .input(z.object({
        trustedContactEmail: z.string().email().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserTrustedContactEmail(ctx.user.id, input.trustedContactEmail);
        return { success: true };
      }),

    /**
     * リマインド通知設定を更新
     */
    updateNotificationSettings: protectedProcedure
      .input(z.object({
        notifyEnabled: z.boolean(),
        notifyDaysBefore: z.number().int().min(1).max(365),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserNotificationSettings(ctx.user.id, input.notifyEnabled, input.notifyDaysBefore);

        // 既存の未開封手紙のリマインダーを再計算
        const letters = await getLettersByAuthor(ctx.user.id);
        const futureLetters = letters.filter(l =>
          l.unlockAt && new Date(l.unlockAt) > new Date() && !l.unlockedAt
        );

        for (const letter of futureLetters) {
          if (!input.notifyEnabled) {
            // 通知無効化: 未送信リマインダーをキャンセル
            await deleteRemindersByLetterId(letter.id);
          } else {
            // 通知日数変更: リマインダー再計算
            await updateLetterReminders(letter.id, ctx.user.id, new Date(letter.unlockAt!), [input.notifyDaysBefore]);
          }
        }

        return { success: true };
      }),

    /**
     * アカウントメールを変更
     * 注意: 実際の本番環境では確認メール送信が必要
     * 現在は簡易的に即座変更
     */
    updateEmail: protectedProcedure
      .input(z.object({
        newEmail: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserEmail(ctx.user.id, input.newEmail);
        return { success: true };
      }),

    // ============================================
    // Push Notification Subscription Management
    // ============================================

    /**
     * Get VAPID public key for client subscription
     */
    getVapidPublicKey: publicProcedure.query(() => {
      return { publicKey: ENV.vapidPublicKey || null };
    }),

    /**
     * Get push subscription status for current user
     */
    getPushStatus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { subscriptions: [], isConfigured: false };

      const subs = await db.select({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        createdAt: pushSubscriptions.createdAt,
        revokedAt: pushSubscriptions.revokedAt,
      })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, ctx.user.id));

      return {
        subscriptions: subs.filter(s => !s.revokedAt),
        isConfigured: !!ENV.vapidPublicKey,
      };
    }),

    /**
     * Register push subscription
     */
    registerPushSubscription: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check if subscription already exists
        const existing = await db.select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, input.endpoint))
          .limit(1);

        if (existing.length > 0) {
          // Reactivate if revoked, update if different user
          await db.update(pushSubscriptions)
            .set({
              userId: ctx.user.id,
              p256dh: input.p256dh,
              auth: input.auth,
              userAgent: input.userAgent || null,
              revokedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(pushSubscriptions.endpoint, input.endpoint));
          return { success: true, action: "updated" };
        }

        // Insert new subscription
        await db.insert(pushSubscriptions).values({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent || null,
        });

        return { success: true, action: "created" };
      }),

    /**
     * Unregister push subscription
     */
    unregisterPushSubscription: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Mark as revoked (don't delete for audit)
        await db.update(pushSubscriptions)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(pushSubscriptions.userId, ctx.user.id),
              eq(pushSubscriptions.endpoint, input.endpoint)
            )
          );

        return { success: true };
      }),
  }),

  // ============================================
  // Template Router
  // ============================================
  template: router({
    list: publicProcedure.query(async () => {
      // Seed templates if not exist
      await seedTemplates();
      return await getAllTemplates();
    }),

    getByName: publicProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        return await getTemplateByName(input.name);
      }),
  }),

  // ============================================
  // Letter Router（ゼロ知識設計）
  // ============================================
  letter: router({
    /**
     * 手紙作成（ゼロ知識版）
     * 
     * - サーバーには暗号文とメタデータのみ送信
     * - 本文（finalContent）は送信しない
     * - 復号キーは送信しない（クライアント側でShamir分割済み）
     * - serverShareのみサーバーに保存
     */
    create: protectedProcedure
      .input(z.object({
        recipientName: z.string().optional(),
        recipientRelation: z.string().optional(),
        audioUrl: z.string().optional(),
        audioDuration: z.number().optional(),
        templateUsed: z.string().optional(),
        // 暗号化関連（本文は送らない）
        encryptionIv: z.string(),
        ciphertextUrl: z.string(),
        // 暗号化済み音声（ゼロ知識）
        encryptedAudioUrl: z.string().optional(),
        encryptedAudioIv: z.string().optional(),
        encryptedAudioMimeType: z.string().optional(),
        encryptedAudioByteSize: z.number().optional(),
        encryptedAudioDurationSec: z.number().optional(),
        encryptedAudioCryptoVersion: z.string().optional(),
        // 証跡
        proofHash: z.string(),
        // タイムロック
        unlockAt: z.date().optional(),
        unlockPolicy: z.string().optional(),
        // Shamir（クライアント分割済み）
        useShamir: z.boolean().default(true),
        serverShare: z.string(), // クライアントで分割済みのserverShare
        // 公開スコープ
        visibilityScope: z.enum(["private", "family", "link"]).default("private"),
        familyId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letterId = await createLetter({
          authorId: ctx.user.id,
          recipientName: input.recipientName,
          recipientRelation: input.recipientRelation,
          audioUrl: input.audioUrl,
          audioDuration: input.audioDuration,
          templateUsed: input.templateUsed,
          encryptionIv: input.encryptionIv,
          ciphertextUrl: input.ciphertextUrl,
          // 暗号化済み音声
          encryptedAudioUrl: input.encryptedAudioUrl,
          encryptedAudioIv: input.encryptedAudioIv,
          encryptedAudioMimeType: input.encryptedAudioMimeType,
          encryptedAudioByteSize: input.encryptedAudioByteSize,
          encryptedAudioDurationSec: input.encryptedAudioDurationSec,
          encryptedAudioCryptoVersion: input.encryptedAudioCryptoVersion,
          proofHash: input.proofHash,
          unlockAt: input.unlockAt,
          unlockPolicy: input.unlockPolicy || "datetime",
          status: "sealed",
          proofCreatedAt: new Date(),
          // Shamirシェア（serverShareのみ保存）
          serverShare: input.serverShare,
          useShamir: input.useShamir,
          // 公開スコープ
          visibilityScope: input.visibilityScope,
          familyId: input.familyId ?? null,
        });

        // OpenTimestampsにハッシュを送信（非同期で実行）
        stampHash(input.proofHash, letterId).then(async (result) => {
          if (result.success && result.otsFileUrl) {
            await updateLetter(letterId, {
              otsFileUrl: result.otsFileUrl,
              otsStatus: "submitted",
              otsSubmittedAt: new Date(),
            });
            console.log(`[OTS] Letter ${letterId} submitted to OpenTimestamps`);
          } else {
            console.warn(`[OTS] Failed to stamp letter ${letterId}: `, result.error);
          }
        }).catch((error) => {
          console.error(`[OTS] Error stamping letter ${letterId}: `, error);
        });

        // リマインダー自動作成（ユーザー設定に基づく）
        if (input.unlockAt && ctx.user.notifyEnabled !== false) {
          const daysBefore = ctx.user.notifyDaysBefore ?? 7;
          createRemindersForLetter(letterId, ctx.user.id, new Date(input.unlockAt), [daysBefore]).catch((err) => {
            console.warn(`[Reminder] Failed to create reminder for letter ${letterId}:`, err);
          });
        }

        return { id: letterId };
      }),

    /**
     * 解錠コードで暗号化されたclientShareを保存（封筒設定）
     */
    setUnlockEnvelope: protectedProcedure
      .input(z.object({
        id: z.number(),
        wrappedClientShare: z.string(),
        wrappedClientShareIv: z.string(),
        wrappedClientShareSalt: z.string(),
        wrappedClientShareKdf: z.string(),
        wrappedClientShareKdfIters: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.id);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");

        await updateLetter(input.id, {
          wrappedClientShare: input.wrappedClientShare,
          wrappedClientShareIv: input.wrappedClientShareIv,
          wrappedClientShareSalt: input.wrappedClientShareSalt,
          wrappedClientShareKdf: input.wrappedClientShareKdf,
          wrappedClientShareKdfIters: input.wrappedClientShareKdfIters,
        });

        return { ok: true };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const letter = await getLetterById(input.id);
        if (!letter) return null;
        // Only author can view their own letters
        if (letter.authorId !== ctx.user.id) return null;
        return letter;
      }),

    list: protectedProcedure
      .input(z.object({ scope: z.enum(["private", "family", "link"]) }))
      .query(async ({ ctx, input }) => {
        // スコープ別の完全分離クエリを使用（PRIVATE混入防止）
        return await getLettersByScope(ctx.user.id, input.scope);
      }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.id);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");
        if (letter.isUnlocked) throw new Error("Cannot cancel an unlocked letter");

        await updateLetter(input.id, { status: "canceled" });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.id);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");

        await deleteLetter(input.id);
        return { success: true };
      }),

    // 共有リンク生成
    generateShareLink: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.id);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");

        // 既にactiveな共有トークンがあればそれを返す
        const existingToken = await getActiveShareToken(input.id);
        if (existingToken) {
          return { shareToken: existingToken.token };
        }

        // 既存のletters.shareTokenがあれば移行
        if (letter.shareToken) {
          await migrateShareTokenIfNeeded(input.id, letter.shareToken);
          return { shareToken: letter.shareToken };
        }

        // 新しい共有トークンを生成
        const shareToken = nanoid(21);
        await createShareToken(input.id, shareToken);
        // 互換性のためletters.shareTokenも更新
        await updateLetterShareToken(input.id, shareToken);
        // 共有リンク発行時にvisibilityScopeを'link'に変更（PRIVATE/FAMILYからの変換も含む）
        await updateLetter(input.id, { visibilityScope: "link", familyId: null });

        return { shareToken };
      }),

    /**
     * 共有リンクを無効化（revoke）
     * - 漏洩事故時に即座に止血できる
     * - 無効化されたトークンは410を返す
     */
    revokeShareLink: protectedProcedure
      .input(z.object({
        letterId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.letterId);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");

        // 既存のletters.shareTokenがあれば先に移行
        if (letter.shareToken) {
          await migrateShareTokenIfNeeded(input.letterId, letter.shareToken);
        }

        const result = await revokeShareToken(input.letterId, input.reason);
        return { success: result.success, wasActive: result.wasActive };
      }),

    /**
     * 共有リンクを再発行（rotate）
     * - 旧トークンは無効化され、新トークンが発行される
     * - 旧トークンでアクセスすると410が返る
     */
    rotateShareLink: protectedProcedure
      .input(z.object({ letterId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.letterId);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");

        // 既存のletters.shareTokenがあれば先に移行
        if (letter.shareToken) {
          await migrateShareTokenIfNeeded(input.letterId, letter.shareToken);
        }

        // 新しいトークンを生成して再発行
        const newToken = nanoid(21);
        const result = await rotateShareToken(input.letterId, newToken);

        // 互換性のためletters.shareTokenも更新
        await updateLetterShareToken(input.letterId, newToken);

        return {
          success: result.success,
          newShareToken: result.newToken,
          oldShareToken: result.oldToken,
        };
      }),

    /**
     * 開封日時とリマインダースケジュールを更新
     * - unlockAtを変更すると未送信のreminderのscheduledAtも再計算
     * - 既に開封済み（openedAtがある）の場合は変更不可
     */
    updateSchedule: protectedProcedure
      .input(z.object({
        letterId: z.number(),
        unlockAt: z.string().optional(), // ISO8601
        reminderDaysBeforeList: z.array(z.number()).optional(), // [90, 30, 7, 1]
        reminderEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.letterId);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");

        // 既に開封済みの場合は変更不可
        if (letter.unlockedAt) {
          throw new Error("既に開封された手紙の開封日時は変更できません");
        }

        // unlockAtの更新
        let newUnlockAt = letter.unlockAt;
        if (input.unlockAt !== undefined) {
          newUnlockAt = new Date(input.unlockAt);
          await updateLetter(input.letterId, { unlockAt: newUnlockAt });
        }

        // リマインダーの更新（unlockAtがある場合のみ）
        if (newUnlockAt && input.reminderDaysBeforeList !== undefined) {
          if (input.reminderEnabled === false || input.reminderDaysBeforeList.length === 0) {
            // リマインダーを削除
            await deleteRemindersByLetterId(input.letterId);
          } else {
            // リマインダーを更新（未送信のみ再計算）
            await updateLetterReminders(
              input.letterId,
              ctx.user.id,
              newUnlockAt,
              input.reminderDaysBeforeList
            );
          }
        }

        // 更新後のリマインダーを取得
        const reminders = await getRemindersByLetterId(input.letterId);
        const updatedLetter = await getLetterById(input.letterId);

        return {
          success: true,
          unlockAt: updatedLetter?.unlockAt?.toISOString() || null,
          reminders,
        };
      }),

    /**
     * 共有トークンの状態を取得
     */
    getShareLinkStatus: protectedProcedure
      .input(z.object({ letterId: z.number() }))
      .query(async ({ ctx, input }) => {
        const letter = await getLetterById(input.letterId);
        if (!letter) throw new Error("Letter not found");
        if (letter.authorId !== ctx.user.id) throw new Error("Unauthorized");

        const activeToken = await getActiveShareToken(input.letterId);

        return {
          hasActiveLink: !!activeToken,
          shareToken: activeToken?.token || null,
          viewCount: activeToken?.viewCount || 0,
          lastAccessedAt: activeToken?.lastAccessedAt?.toISOString() || null,
          createdAt: activeToken?.createdAt?.toISOString() || null,
        };
      }),

    /**
     * 共有リンクから手紙を取得（公開エンドポイント）
     * 
     * ゼロ知識設計:
     * - 本文（finalContent）は返さない
     * - 暗号文URL、IV、封筒（wrappedClientShare）を返す
     * - serverShareは開封日時後にのみ返す
     */
    getByShareToken: publicProcedure
      .input(z.object({
        shareToken: z.string(),
        userAgent: z.string().optional(),
      }))
      .query(async ({ input }) => {
        // Bot検出
        const botPatterns = [
          /bot/i, /crawler/i, /spider/i, /slurp/i, /facebook/i,
          /twitter/i, /linkedin/i, /pinterest/i, /telegram/i,
          /whatsapp/i, /discord/i, /slack/i, /preview/i,
          /googlebot/i, /bingbot/i, /yandex/i, /baidu/i,
          /duckduck/i, /sogou/i, /exabot/i, /facebot/i,
          /ia_archiver/i, /mj12bot/i, /semrush/i, /ahref/i,
          /curl/i, /wget/i, /python/i, /java/i, /php/i,
          /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
        ];

        const userAgent = input.userAgent || "";
        const isBot = botPatterns.some(pattern => pattern.test(userAgent));

        if (isBot) {
          // BotにはOGP用の最小限の情報のみ返す
          return {
            isBot: true,
            title: "未来便 - 大切な人への手紙",
            description: "未来の特別な日に届く手紙があなたを待っています。",
          };
        }

        // トークン状態チェック（letterShareTokensテーブル）
        const tokenRecord = await getShareTokenRecord(input.shareToken);
        if (tokenRecord) {
          // トークンが無効化されている場合
          if (tokenRecord.status === "revoked") {
            return {
              error: "revoked",
              message: "この共有リンクは無効化されました。送信者にお問い合わせください。",
            };
          }
          // トークンが置換されている場合
          if (tokenRecord.status === "rotated") {
            return {
              error: "rotated",
              message: "この共有リンクは新しいリンクに置き換えられました。送信者に新しいリンクをお問い合わせください。",
            };
          }
          // activeなトークンの場合、アクセス統計を更新
          await incrementShareTokenViewCount(input.shareToken);
        }

        const letter = await getLetterByShareToken(input.shareToken);
        if (!letter) {
          return { error: "not_found" };
        }

        // visibilityScopeが'link'以外の場合は404（private/familyは公開しない）
        if (letter.visibilityScope !== "link") {
          return { error: "not_found" };
        }

        // キャンセルされた手紙は表示しない
        if (letter.status === "canceled") {
          return { error: "canceled" };
        }

        // 開封日時チェック
        const now = new Date();
        const unlockAt = letter.unlockAt ? new Date(letter.unlockAt) : null;
        const canUnlock = !unlockAt || now >= unlockAt;

        // 閲覧数をインクリメント（後方互換性のためlettersテーブルも更新）
        await incrementViewCount(letter.id);

        // Shamirシェアの提供判定
        const shouldProvideServerShare = letter.useShamir && canProvideServerShare(unlockAt);

        // 封筒（解錠コードで暗号化されたclientShare）
        const unlockEnvelope = letter.wrappedClientShare ? {
          wrappedClientShare: letter.wrappedClientShare,
          wrappedClientShareIv: letter.wrappedClientShareIv || "",
          wrappedClientShareSalt: letter.wrappedClientShareSalt || "",
          wrappedClientShareKdf: letter.wrappedClientShareKdf || "pbkdf2-sha256",
          wrappedClientShareKdfIters: letter.wrappedClientShareKdfIters || 200000,
        } : null;

        if (!canUnlock) {
          // まだ開封できない（サーバーシェアも提供しない）
          return {
            isBot: false,
            canUnlock: false,
            unlockAt: unlockAt?.toISOString(),
            recipientName: letter.recipientName,
            templateUsed: letter.templateUsed,
            useShamir: letter.useShamir,
            // サーバーシェアは開封日時前なので提供しない
            serverShare: null,
            // 封筒は常に返す（解錠コードがないと開けない）
            unlockEnvelope,
          };
        }

        // 開封可能
        // 注意: ここでは開封済みにしない（復号成功後にmarkOpenedを呼ぶ）

        // 証跡情報を生成
        const proofInfo = generateProofInfo(
          letter.proofHash,
          letter.otsStatus || "pending",
          letter.otsSubmittedAt || undefined,
          letter.otsConfirmedAt || undefined
        );

        return {
          isBot: false,
          canUnlock: true,
          useShamir: letter.useShamir,
          // 開封日時後なのでサーバーシェアを提供
          serverShare: shouldProvideServerShare ? letter.serverShare : null,
          // 封筒（解錠コードで暗号化されたclientShare）
          unlockEnvelope,
          // 暗号化済み音声（開封日時後のみ提供）
          encryptedAudio: letter.encryptedAudioUrl ? {
            url: letter.encryptedAudioUrl,
            iv: letter.encryptedAudioIv,
            mimeType: letter.encryptedAudioMimeType,
            byteSize: letter.encryptedAudioByteSize,
            durationSec: letter.encryptedAudioDurationSec,
            cryptoVersion: letter.encryptedAudioCryptoVersion,
          } : null,
          letter: {
            id: letter.id,
            recipientName: letter.recipientName,
            templateUsed: letter.templateUsed,
            // 本文は返さない（ゼロ知識）
            encryptionIv: letter.encryptionIv,
            ciphertextUrl: letter.ciphertextUrl,
            createdAt: letter.createdAt.toISOString(),
            unlockAt: unlockAt?.toISOString(),
            unlockedAt: letter.unlockedAt?.toISOString(),
            proofHash: letter.proofHash,
            proofInfo,
          },
        };
      }),

    /**
     * 手紙を開封済みにマーク（復号成功後にクライアントから呼ぶ）
     * 
     * ゼロ知識設計:
     * - getByShareTokenでは開封済みにしない（Botや誤アクセス対策）
     * - 復号成功後にこのAPIを呼んで開封済みにする
     * - WHERE isUnlocked = false で原子的更新（二重開封レース防止）
     */
    markOpened: publicProcedure
      .input(z.object({
        shareToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        const letter = await getLetterByShareToken(input.shareToken);
        if (!letter) {
          return { success: false, error: "not_found" };
        }

        // キャンセルされた手紙は開封できない
        if (letter.status === "canceled") {
          return { success: false, error: "canceled" };
        }

        // 開封日時チェック
        const now = new Date();
        const unlockAt = letter.unlockAt ? new Date(letter.unlockAt) : null;
        if (unlockAt && now < unlockAt) {
          return { success: false, error: "not_yet" };
        }

        // 原子的更新（既に開封済みならfalseが返る）
        const isFirstOpen = await unlockLetter(letter.id);

        // 初回開封時にオーナーに通知
        if (isFirstOpen) {
          // 1) Manus owner notification (existing)
          try {
            const { notifyOwner } = await import("./_core/notification");
            const unlockTimeStr = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            await notifyOwner({
              title: `未来便: 手紙が開封されました`,
              content: `あなたの手紙が開封されました。\n\n宛先: ${letter.recipientName || "未設定"} \n開封日時: ${unlockTimeStr} \n\n※ 本文はゼロ知識設計のため、運営者も読めません。`,
            });
          } catch (err) {
            console.warn("[markOpened] Failed to notify owner (Manus):", err);
          }

          // 2) Email notification to owner (if verified email exists)
          try {
            const db = await getDb();
            if (db) {
              const ownerResult = await db.select({
                email: users.email,
                notificationEmail: users.notificationEmail,
                notificationEmailVerified: users.notificationEmailVerified,
              }).from(users).where(eq(users.id, letter.authorId)).limit(1);

              const owner = ownerResult[0];
              if (owner) {
                const ownerEmail = owner.notificationEmail || owner.email;
                const isVerified = owner.notificationEmailVerified || !owner.notificationEmail;

                if (ownerEmail && isVerified) {
                  const recipientLabel = letter.recipientName || "大切な人";
                  const letterManagementUrl = `${ENV.appBaseUrl}/letters/${letter.id}`;

                  const subject = buildOpenNotificationSubject();
                  const html = buildOpenNotificationHtml({
                    recipientLabel,
                    openedAt: new Date(),
                    letterManagementUrl,
                  });
                  const text = buildOpenNotificationText({
                    recipientLabel,
                    openedAt: new Date(),
                    letterManagementUrl,
                  });

                  await sendEmail({
                    to: ownerEmail,
                    subject,
                    text,
                    html,
                    category: "letter_opened",
                    meta: { letterId: letter.id },
                  });
                  console.log(`[markOpened] Open notification email sent to ${ownerEmail}`);
                }
              }
            }
          } catch (emailErr) {
            console.warn("[markOpened] Failed to send open notification email:", emailErr);
          }

          // 3) Push notification to owner (if subscribed)
          try {
            const { sendOpenedPush } = await import("./_core/push/sendPush");
            const recipientLabel = letter.recipientName || "大切な人";
            const pushResult = await sendOpenedPush(
              letter.authorId,
              recipientLabel,
              letter.id
            );
            if (pushResult.sent > 0) {
              console.log(`[markOpened] Push sent to ${pushResult.sent} devices`);
            }
          } catch (pushErr) {
            console.warn("[markOpened] Failed to send open notification push:", pushErr);
          }
        }

        return {
          success: true,
          isFirstOpen,
        };
      }),

    /**
     * 解錠コード再発行（セキュリティ強固版、再発行は1回のみ）
     * 
     * - 新しい封筒（wrappedClientShare）のみ生成
     * - 解錠コードはDBに保存しない
     * - 旧封筒は上書きされるため、旧コードは自動的に無効化
     * - 2回目の再発行は禁止
     */
    regenerateUnlockCode: protectedProcedure
      .input(z.object({
        id: z.number(),
        newEnvelope: z.object({
          wrappedClientShare: z.string(),
          wrappedClientShareIv: z.string(),
          wrappedClientShareSalt: z.string(),
          wrappedClientShareKdf: z.string(),
          wrappedClientShareKdfIters: z.number(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterById(input.id);

        if (!letter) {
          return { success: false, error: "not_found" };
        }

        // 所有者チェック
        if (letter.authorId !== ctx.user.id) {
          return { success: false, error: "forbidden" };
        }

        // 開封済みの手紙は再発行不可
        if (letter.isUnlocked) {
          return { success: false, error: "already_opened" };
        }

        // 既に再発行済みの場合はエラー（1回のみ）
        if (letter.unlockCodeRegeneratedAt) {
          return { success: false, error: "already_regenerated" };
        }

        // 再発行実行
        await regenerateUnlockCode(input.id, input.newEnvelope);

        return { success: true };
      }),
  }),

  // ============================================
  // AI Router
  // ============================================
  ai: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: "ja",
          prompt: "親が子どもに宛てた手紙の録音",
        });

        // Check if it's an error
        if ('error' in result) {
          console.error("[Transcribe] Error:", result);
          throw new Error(result.error);
        }

        return {
          text: result.text,
        };
      }),

    generateDraft: protectedProcedure
      .input(z.object({
        transcription: z.string(),
        templateName: z.string(),
        recipientName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const template = await getTemplateByName(input.templateName);
        if (!template) {
          throw new Error("Template not found");
        }

        // Replace placeholder in prompt
        let prompt = template.prompt.replace("{{transcription}}", input.transcription);
        if (input.recipientName) {
          prompt = prompt.replace("子ども", input.recipientName);
        }

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "あなたは親が子どもに宛てた手紙を書くアシスタントです。温かく、愛情のこもった手紙を作成してください。" },
              { role: "user", content: prompt },
            ],
          });

          const content = response.choices[0]?.message?.content;
          // contentが文字列の場合はそのまま、配列の場合はtextを抽出
          let draft = "";
          if (typeof content === "string") {
            draft = content;
          } else if (Array.isArray(content)) {
            draft = content
              .filter((c): c is { type: "text"; text: string } => c.type === "text")
              .map((c) => c.text)
              .join("");
          }
          return { draft };
        } catch (error) {
          console.error("[GenerateDraft] Error:", error);
          throw new Error("下書きの生成に失敗しました");
        }
      }),
  }),

  // ============================================
  // Draft Router
  // ============================================
  draft: router({
    create: protectedProcedure
      .input(z.object({
        templateName: z.string().optional(),
        recipientName: z.string().optional(),
        recipientRelation: z.string().optional(),
        currentStep: z.string().default("template"),
      }))
      .mutation(async ({ ctx, input }) => {
        const draftId = await createDraft({
          userId: ctx.user.id,
          templateName: input.templateName,
          recipientName: input.recipientName,
          recipientRelation: input.recipientRelation,
          currentStep: input.currentStep,
        });
        return { id: draftId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        templateName: z.string().optional(),
        recipientName: z.string().optional(),
        recipientRelation: z.string().optional(),
        audioUrl: z.string().optional(),
        audioBase64: z.string().optional(),
        transcription: z.string().optional(),
        aiDraft: z.string().optional(),
        finalContent: z.string().optional(),
        unlockAt: z.string().optional(),
        currentStep: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // ユーザーの下書きか確認
        const draft = await getDraftByUserAndId(ctx.user.id, input.id);
        if (!draft) {
          throw new Error("下書きが見つかりません");
        }

        const updates: Record<string, unknown> = {};
        if (input.templateName !== undefined) updates.templateName = input.templateName;
        if (input.recipientName !== undefined) updates.recipientName = input.recipientName;
        if (input.recipientRelation !== undefined) updates.recipientRelation = input.recipientRelation;
        if (input.audioUrl !== undefined) updates.audioUrl = input.audioUrl;
        if (input.audioBase64 !== undefined) updates.audioBase64 = input.audioBase64;
        if (input.transcription !== undefined) updates.transcription = input.transcription;
        if (input.aiDraft !== undefined) updates.aiDraft = input.aiDraft;
        if (input.finalContent !== undefined) updates.finalContent = input.finalContent;
        if (input.unlockAt !== undefined) updates.unlockAt = new Date(input.unlockAt);
        if (input.currentStep !== undefined) updates.currentStep = input.currentStep;

        await updateDraft(input.id, updates);
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getDraftsByUser(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const draft = await getDraftByUserAndId(ctx.user.id, input.id);
        if (!draft) {
          throw new Error("下書きが見つかりません");
        }
        return draft;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const draft = await getDraftByUserAndId(ctx.user.id, input.id);
        if (!draft) {
          throw new Error("下書きが見つかりません");
        }
        await deleteDraft(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // Storage Router
  // ============================================
  // Reminder Router
  // ============================================
  reminder: router({
    /**
     * 手紙のリマインダー設定を取得
     */
    getByLetterId: protectedProcedure
      .input(z.object({ letterId: z.number() }))
      .query(async ({ ctx, input }) => {
        // 所有者確認
        const letter = await getLetterById(input.letterId);
        if (!letter || letter.authorId !== ctx.user.id) {
          return { reminders: [], daysBeforeList: [] };
        }

        const reminders = await getRemindersByLetterId(input.letterId);
        const daysBeforeList = reminders.map(r => r.daysBefore);
        return { reminders, daysBeforeList };
      }),

    /**
     * 手紙のリマインダー設定を更新
     */
    update: protectedProcedure
      .input(z.object({
        letterId: z.number(),
        daysBeforeList: z.array(z.number()).default([]), // [90, 30, 7, 1]
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // 所有者確認
        const letter = await getLetterById(input.letterId);
        if (!letter || letter.authorId !== ctx.user.id) {
          throw new Error("手紙が見つかりません");
        }

        if (!letter.unlockAt) {
          throw new Error("開封日時が設定されていません");
        }

        if (!input.enabled || input.daysBeforeList.length === 0) {
          // リマインダーを削除
          await deleteRemindersByLetterId(input.letterId);
          return { success: true, reminders: [] };
        }

        // リマインダーを更新
        await updateLetterReminders(
          input.letterId,
          ctx.user.id,
          letter.unlockAt,
          input.daysBeforeList
        );

        const reminders = await getRemindersByLetterId(input.letterId);
        return { success: true, reminders };
      }),

    /**
     * 手紙のリマインダーを削除
     */
    delete: protectedProcedure
      .input(z.object({ letterId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // 所有者確認
        const letter = await getLetterById(input.letterId);
        if (!letter || letter.authorId !== ctx.user.id) {
          throw new Error("手紙が見つかりません");
        }

        await deleteRemindersByLetterId(input.letterId);
        return { success: true };
      }),
  }),

  // ============================================
  // Storage Router
  // ============================================
  storage: router({
    uploadAudio: protectedProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.audioBase64, "base64");
        const fileKey = `audio / ${ctx.user.id}/${nanoid()}.webm`;

        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url, key: fileKey };
      }),

    uploadCiphertext: protectedProcedure
      .input(z.object({
        ciphertextBase64: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.ciphertextBase64, "base64");
        const fileKey = `ciphertext/${ctx.user.id}/${nanoid()}.enc`;

        const { url } = await storagePut(fileKey, buffer, "application/octet-stream");
        return { url, key: fileKey };
      }),

    /**
     * 暗号化済み音声アップロード（ゼロ知識設計）
     * 
     * - クライアント側で暗号化された音声をアップロード
     * - サーバーは暗号文のみを保存（平文にアクセス不可）
     */
    uploadEncryptedAudio: protectedProcedure
      .input(z.object({
        encryptedAudioBase64: z.string(), // 暗号化済み音声のBase64
        mimeType: z.string(),             // 元の音声のMIMEタイプ
        byteSize: z.number(),             // 暗号文サイズ
      }))
      .mutation(async ({ ctx, input }) => {
        // サイズ制限チェック（10MB）
        const MAX_SIZE = 10 * 1024 * 1024;
        if (input.byteSize > MAX_SIZE) {
          throw new Error(`音声ファイルが大きすぎます（上限: ${MAX_SIZE / 1024 / 1024}MB）`);
        }

        const buffer = Buffer.from(input.encryptedAudioBase64, "base64");
        // 拡張子はMIMEタイプから推測
        const ext = input.mimeType.includes("webm") ? "webm" :
          input.mimeType.includes("mp4") ? "m4a" : "enc";
        const fileKey = `encrypted-audio/${ctx.user.id}/${nanoid()}.${ext}.enc`;

        const { url } = await storagePut(fileKey, buffer, "application/octet-stream");
        return { url, key: fileKey };
      }),
  }),

  // ============================================
  // AI Interview Router（自分史インタビュー）
  // ============================================
  interview: router({
    /**
     * セッション開始（または既存のactiveなセッションを返す）
     */
    create: protectedProcedure
      .input(z.object({
        recipientName: z.string().optional(),
        topic: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 既存の進行中セッションがあればそれを返す
        const activeSession = await getActiveInterviewSession(ctx.user.id);
        if (activeSession) {
          return { sessionId: activeSession.id, isNew: false };
        }

        // 新規作成
        const sessionId = await createInterviewSession(
          ctx.user.id,
          input.recipientName,
          input.topic
        );

        // AIからの最初の挨拶を生成（LLM呼び出し）
        const systemPrompt = `
あなたは「未来便」というサービスのAIインタビュアーです。
ユーザーは「自分史手紙」や「大切な人への手紙」を書こうとしていますが、何を書けばいいか悩んでいます。
あなたの役割は、ユーザーに優しく質問を投げかけ、心の中にある想いやエピソードを引き出すことです。

ルール:
- 相手は友達感覚で話せるように、少し砕けた丁寧語（です・ます調だが堅苦しくない）で話してください。
- 最初の挨拶として、ユーザーがリラックスできるように声をかけ、誰にどんな手紙を書きたいか確認してください。
- 質問は一度に1つだけにしてください。
- 相手の話を否定せず、共感してください。
        `;

        const messages = [{ role: "system" as Role, content: systemPrompt }];
        let aiResponse = "";

        try {
          const result = await invokeLLM({ messages });
          const content = result.choices[0]?.message?.content;
          aiResponse = typeof content === "string" ? content : "こんにちは。";
        } catch (e) {
          aiResponse = "こんにちは。今日はどのような手紙を書きたいですか？一緒にお話ししながら見つけていきましょう。";
        }

        // AIメッセージ保存
        await addInterviewMessage(sessionId, "ai", aiResponse);

        return { sessionId, isNew: true, message: aiResponse };
      }),

    /**
     * 履歴取得
     */
    getHistory: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return await getInterviewHistory(input.sessionId);
      }),

    /**
     * メッセージ送信
     */
    sendMessage: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        if (session.status === "completed") {
          throw new Error("このセッションは終了しています");
        }

        // ユーザーメッセージ保存
        await addInterviewMessage(input.sessionId, "user", input.message);

        // 履歴取得
        const history = await getInterviewHistory(input.sessionId);

        // LLMコンテキスト構築
        const systemPrompt = `
あなたは「未来便」というサービスのAIインタビュアーです。
ユーザーのエピソードを引き出し、最終的に感動的な手紙が書けるように導いてください。

現在の状況:
- 宛先: ${session.recipientName || "未定"}
- トピック: ${session.topic || "自分史"}

ルール:
- 短く簡潔に返答してください（長文は避ける）。
- ユーザーの回答に対して「それは素敵ですね」「大変でしたね」など共感・リアクションを入れてから、次の質問をしてください。
- 質問は「具体的に」「その時どう感じたか」など深掘りするものが良いです。
- 一度に複数の質問をせず、1つずつ聞いてください。
- 5〜10往復程度会話が進んだら、「そろそろ手紙の下書きを書いてみましょうか？」と提案しても良いです。
        `;

        const messages = [
          { role: "system" as Role, content: systemPrompt },
          ...history.map(msg => ({
            role: (msg.sender === "ai" ? "assistant" : "user") as Role,
            content: msg.content
          }))
        ];

        let aiResponse = "";
        try {
          const result = await invokeLLM({ messages });
          const content = result.choices[0]?.message?.content;
          aiResponse = typeof content === "string" ? content : "";
        } catch (e) {
          console.error("LLM Error:", e);
          aiResponse = "すみません、少し考え事をしています。もう一度教えていただけますか？";
        }

        // AIメッセージ保存
        await addInterviewMessage(input.sessionId, "ai", aiResponse);

        return { message: aiResponse };
      }),

    /**
     * ドラフト生成
     */
    generateDraft: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        // 履歴取得
        const history = await getInterviewHistory(input.sessionId);

        // LLMで手紙生成
        const prompt = `
以下の会話ログを元に、${session.recipientName || "大切な人"}へ送る手紙の下書きを作成してください。

[会話ログ]
${history.map(m => `${m.sender}: ${m.content}`).join("\n")}

作成ルール:
- 感動的で温かいトーンにしてください。
- 会話の中で出てきた具体的なエピソードを盛り込んでください。
- 構成は「件名」と「本文」に分けて出力してください。JSON形式で返してください。
例: {"title": "件名...", "body": "本文..."}
JSON以外の余計な文字は含めないでください。
        `;

        const messages = [{ role: "user" as Role, content: prompt }];
        let draftTitle = "AI対話からの下書き";
        let draftBody = "";

        try {
          const result = await invokeLLM({ messages });
          const content = result.choices[0]?.message?.content;
          const resultText = typeof content === "string" ? content : "";

          // JSONパース（簡易的なクリーニング付き）
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const json = JSON.parse(jsonMatch[0]);
            draftTitle = json.title || draftTitle;
            draftBody = json.body || resultText;
          } else {
            draftBody = resultText;
          }
        } catch (e) {
          console.error("Draft Generation Error:", e);
          draftBody = "下書きの生成に失敗しました。会話履歴から自分で書いてみましょう！";
        }

        // セッション完了
        await completeInterviewSession(input.sessionId);

        // 下書き（Draft）として保存
        const draftId = await createDraft({
          userId: ctx.user.id,
          recipientName: session.recipientName,
          aiDraft: draftBody,
        });

        // 下書きはタイトルを持たないので、bodyに件名を含めるかどうかの判断が必要だが、
        // 今回はDraftテーブルの仕様に合わせてbodyに統合するか、Draftの仕様を確認。
        // ※ Draftテーブル定義を見ると title カラムはないため、content に含める。

        return { draftId, content: draftBody, title: draftTitle };
      }),
  }),
  family: router({
    /**
     * 自分が所属する家族グループを取得
     */
    getMyFamily: protectedProcedure.query(async ({ ctx }) => {
      return await getFamilyMemberships(ctx.user.id);
    }),

    /**
     * 家族グループを作成（まだ持っていない場合）
     */
    create: protectedProcedure
      .input(z.object({ name: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        // 既にオーナーとして持っているかチェック
        const existing = await getFamilyByOwner(ctx.user.id);
        if (existing) {
          return { id: existing.id, alreadyExists: true };
        }
        const familyId = await createFamily(ctx.user.id, input.name);
        return { id: familyId, alreadyExists: false };
      }),

    /**
     * 招待を作成（メールアドレス指定）
     * ※ メール送信は次フェーズ。まずはtoken表示で対応
     */
    inviteByEmail: protectedProcedure
      .input(z.object({
        familyId: z.number(),
        email: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        // オーナーのみ招待可能
        const family = await getFamilyByOwner(ctx.user.id);
        if (!family || family.id !== input.familyId) {
          throw new Error("権限がありません");
        }

        const token = nanoid(21);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後
        await createFamilyInvite(input.familyId, input.email, token, expiresAt);

        // 招待URL（フロントエンドで /family/invite/{token} を用意する想定）
        return {
          token,
          inviteUrl: `/family/invite/${token}`,
          expiresAt: expiresAt.toISOString(),
        };
      }),

    /**
     * 招待を受諾
     */
    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await acceptFamilyInvite(input.token, ctx.user.id);
      }),

    /**
     * 家族メンバー一覧を取得
     */
    listMembers: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
        // メンバーのみ閲覧可能
        const isMember = await isUserFamilyMember(ctx.user.id, input.familyId);
        if (!isMember) {
          return { members: [], error: "権限がありません" };
        }
        const members = await getFamilyMembers(input.familyId);
        return { members };
      }),

    /**
     * 招待一覧を取得（オーナーのみ）
     */
    listInvites: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const family = await getFamilyByOwner(ctx.user.id);
        if (!family || family.id !== input.familyId) {
          return { invites: [], error: "権限がありません" };
        }
        const invites = await getFamilyInvites(input.familyId);
        return { invites };
      }),
  }),

  // ============================================
  // Notification Router (In-App Inbox)
  // ============================================
  notification: router({
    /**
     * Get user's notifications (newest first)
     */
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { notifications: [] };
        const items = await getNotifications(db, ctx.user.id, input.limit, input.offset);
        return { notifications: items };
      }),

    /**
     * Get unread notification count (for badge)
     */
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { count: 0 };
      const count = await getUnreadCount(db, ctx.user.id);
      return { count };
    }),

    /**
     * Mark notification(s) as read
     */
    markRead: protectedProcedure
      .input(z.object({
        notificationId: z.number().optional(), // If omitted, mark all as read
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await markNotificationAsRead(db, ctx.user.id, input.notificationId);
        return { success: true };
      }),
  }),

  // ============================================
  // Admin Router (Owner-only operations)
  // ============================================
  admin: router({
    /**
     * Manual cleanup of old read notifications
     * Only accessible by app owner (OWNER_OPEN_ID)
     */
    cleanupNotifications: protectedProcedure
      .input(z.object({
        days: z.number().min(1).max(365).default(90),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is the owner
        if (ctx.user.openId !== ENV.ownerOpenId) {
          return { success: false, error: "unauthorized", deleted: 0 };
        }

        try {
          const { cleanupNotifications } = await import("./_core/jobs/cleanupNotifications");
          const result = await cleanupNotifications(input.days);
          return { success: true, ...result };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error("[Admin] Cleanup failed:", errorMsg);
          return { success: false, error: errorMsg, deleted: 0 };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
