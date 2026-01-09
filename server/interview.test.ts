
import { describe, it, expect, vi, beforeEach } from "vitest";

// LLMのモック
vi.mock("./_core/llm", () => ({
    invokeLLM: vi.fn().mockImplementation(async (params: any) => {
        const messages = params.messages || params;
        const lastMsg = messages[messages.length - 1];

        if (lastMsg.role === "system") {
            return { choices: [{ message: { content: "こんにちは。誰に手紙を書きますか？" } }] };
        }
        if (lastMsg.content.includes("手紙の下書きを作成してください")) {
            return {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            title: "親愛なる母へ",
                            body: "いつもありがとう。元気でいてね。"
                        })
                    }
                }]
            };
        }
        return { choices: [{ message: { content: "なるほど、それは素敵ですね。他には？" } }] };
    }),
}));

describe("Interview Router", () => {
    let appRouter: any;
    let ctx: any;
    let userId = 100;
    let mockDb: any;

    beforeEach(async () => {
        vi.resetModules();

        mockDb = {
            createInterviewSession: vi.fn().mockResolvedValue(1),
            addInterviewMessage: vi.fn().mockResolvedValue(true),
            getInterviewSession: vi.fn().mockResolvedValue({ id: 1, userId, recipientName: "母", topic: "感謝", status: "active", createdAt: new Date() }),
            getActiveInterviewSession: vi.fn().mockResolvedValue(undefined),
            getInterviewHistory: vi.fn().mockResolvedValue([]),
            completeInterviewSession: vi.fn().mockResolvedValue(true),
            createDraft: vi.fn().mockResolvedValue(10),

            // Other generic mocks
            createLetter: vi.fn(),
            getLetterById: vi.fn(),
            getLettersByAuthor: vi.fn(),
            updateLetter: vi.fn(),
            deleteLetter: vi.fn(),
            getAllTemplates: vi.fn(),
            getTemplateByName: vi.fn(),
            seedTemplates: vi.fn(),
            getLetterByShareToken: vi.fn(),
            updateLetterShareToken: vi.fn(),
            incrementViewCount: vi.fn(),
            unlockLetter: vi.fn(),
            getDraftById: vi.fn(),
            getDraftsByUser: vi.fn(),
            updateDraft: vi.fn(),
            deleteDraft: vi.fn(),
            getDraftByUserAndId: vi.fn(),
            updateUserNotificationEmail: vi.fn(),
            updateUserEmail: vi.fn(),
            createRemindersForLetter: vi.fn(),
            getRemindersByLetterId: vi.fn(),
            updateLetterReminders: vi.fn(),
            deleteRemindersByLetterId: vi.fn(),
            getShareTokenRecord: vi.fn(),
            getActiveShareToken: vi.fn(),
            createShareToken: vi.fn(),
            revokeShareToken: vi.fn(),
            rotateShareToken: vi.fn(),
            incrementShareTokenViewCount: vi.fn(),
            migrateShareTokenIfNeeded: vi.fn(),
            regenerateUnlockCode: vi.fn(),
            getLettersByScope: vi.fn(),
            canAccessLetter: vi.fn(),
            createFamily: vi.fn(),
            getFamilyByOwner: vi.fn(),
            getFamilyMemberships: vi.fn(),
            getFamilyMembers: vi.fn(),
            createFamilyInvite: vi.fn(),
            acceptFamilyInvite: vi.fn(),
            getFamilyInvites: vi.fn(),
            isUserFamilyMember: vi.fn(),
        };

        vi.doMock("./db", () => mockDb);

        const routerModule = await import("./routers");
        appRouter = routerModule.appRouter;

        ctx = {
            user: {
                id: userId,
                email: "test@example.com",
            },
        };
    });

    it("create: 新しいインタビューセッションを開始できる", async () => {
        const caller = appRouter.createCaller(ctx);
        const result = await caller.interview.create({});

        expect(result.sessionId).toBe(1);
        expect(result.isNew).toBe(true);
        expect(mockDb.createInterviewSession).toHaveBeenCalled();
        expect(mockDb.addInterviewMessage).toHaveBeenCalled();
    });

    it("sendMessage: メッセージを送信してAIの応答を取得できる", async () => {
        // getHistory がユーザーメッセージを含むようにモックを調整
        mockDb.getInterviewHistory.mockResolvedValue([
            { id: 1, sessionId: 1, sender: "ai", content: "こんにちは", createdAt: new Date() },
            { id: 2, sessionId: 1, sender: "user", content: "母に感謝の手紙を書きたいです", createdAt: new Date() }
        ]);

        const caller = appRouter.createCaller(ctx);
        const result = await caller.interview.sendMessage({
            sessionId: 1,
            message: "母に感謝の手紙を書きたいです",
        });

        expect(result.message).toBe("なるほど、それは素敵ですね。他には？");
        expect(mockDb.addInterviewMessage).toHaveBeenCalledTimes(2);
    });

    it("getHistory: 会話履歴を取得できる", async () => {
        mockDb.getInterviewHistory.mockResolvedValue([
            { id: 1, sessionId: 1, sender: "ai", content: "こんにちは", createdAt: new Date() }
        ]);

        const caller = appRouter.createCaller(ctx);
        const history = await caller.interview.getHistory({ sessionId: 1 });

        expect(history).toHaveLength(1);
        expect(history[0].content).toBe("こんにちは");
        expect(mockDb.getInterviewHistory).toHaveBeenCalledWith(1);
    });

    it("generateDraft: ドラフトを生成して保存できる", async () => {
        const caller = appRouter.createCaller(ctx);
        const result = await caller.interview.generateDraft({ sessionId: 1 });

        expect(result.draftId).toBe(10);
        expect(result.title).toBe("親愛なる母へ");

        expect(mockDb.completeInterviewSession).toHaveBeenCalledWith(1);
        expect(mockDb.createDraft).toHaveBeenCalled();
    });
});
