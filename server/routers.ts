import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createLetter, getLetterById, getLettersByAuthor, updateLetter, deleteLetter, getAllTemplates, getTemplateByName, seedTemplates, getLetterByShareToken, updateLetterShareToken, incrementViewCount, unlockLetter, createDraft, getDraftById, getDraftsByUser, updateDraft, deleteDraft, getDraftByUserAndId, updateUserNotificationEmail, updateUserEmail, createRemindersForLetter, getRemindersByLetterId, updateLetterReminders, deleteRemindersByLetterId, getShareTokenRecord, getActiveShareToken, createShareToken, revokeShareToken, rotateShareToken, incrementShareTokenViewCount, migrateShareTokenIfNeeded } from "./db";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { stampHash, generateProofInfo } from "./opentimestamps";
import { canProvideServerShare } from "./shamir";

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
     */
    updateNotificationEmail: protectedProcedure
      .input(z.object({
        notificationEmail: z.string().email().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserNotificationEmail(ctx.user.id, input.notificationEmail);
        return { success: true };
      }),

    /**
     * 現在の設定を取得
     */
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        return {
          notificationEmail: ctx.user.notificationEmail || null,
          accountEmail: ctx.user.email || null,
        };
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
        // 証跡
        proofHash: z.string(),
        // タイムロック
        unlockAt: z.date().optional(),
        unlockPolicy: z.string().optional(),
        // Shamir（クライアント分割済み）
        useShamir: z.boolean().default(true),
        serverShare: z.string(), // クライアントで分割済みのserverShare
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
          proofHash: input.proofHash,
          unlockAt: input.unlockAt,
          unlockPolicy: input.unlockPolicy || "datetime",
          status: "sealed",
          proofCreatedAt: new Date(),
          // Shamirシェア（serverShareのみ保存）
          serverShare: input.serverShare,
          useShamir: input.useShamir,
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
            console.warn(`[OTS] Failed to stamp letter ${letterId}:`, result.error);
          }
        }).catch((error) => {
          console.error(`[OTS] Error stamping letter ${letterId}:`, error);
        });

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

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getLettersByAuthor(ctx.user.id);
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
          try {
            const { notifyOwner } = await import("./_core/notification");
            const unlockTimeStr = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            await notifyOwner({
              title: `未来便: 手紙が開封されました`,
              content: `あなたの手紙が開封されました。\n\n宛先: ${letter.recipientName || "未設定"}\n開封日時: ${unlockTimeStr}\n\n※ 本文はゼロ知識設計のため、運営者も読めません。`,
            });
          } catch (err) {
            // 通知失敗はログのみ（開封処理は成功させる）
            console.warn("[markOpened] Failed to notify owner:", err);
          }
        }
        
        return { 
          success: true, 
          isFirstOpen,
        };
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
        const fileKey = `audio/${ctx.user.id}/${nanoid()}.webm`;
        
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
  }),
});

export type AppRouter = typeof appRouter;
