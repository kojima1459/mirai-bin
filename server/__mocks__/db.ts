
import { vi } from "vitest";

// Interview related mocks
export const createInterviewSession = vi.fn();
export const addInterviewMessage = vi.fn();
export const getInterviewSession = vi.fn();
export const getActiveInterviewSession = vi.fn();
export const getInterviewHistory = vi.fn();
export const completeInterviewSession = vi.fn();
export const createDraft = vi.fn();

// Other DB functions used in routers.ts (mocked as no-op)
export const createLetter = vi.fn();
export const getLetterById = vi.fn();
export const getLettersByAuthor = vi.fn();
export const updateLetter = vi.fn();
export const deleteLetter = vi.fn();
export const getAllTemplates = vi.fn();
export const getTemplateByName = vi.fn();
export const seedTemplates = vi.fn();
export const getLetterByShareToken = vi.fn();
export const updateLetterShareToken = vi.fn();
export const incrementViewCount = vi.fn();
export const unlockLetter = vi.fn();
export const getDraftById = vi.fn();
export const getDraftsByUser = vi.fn();
export const updateDraft = vi.fn();
export const deleteDraft = vi.fn();
export const getDraftByUserAndId = vi.fn();
export const updateUserNotificationEmail = vi.fn();
export const updateUserEmail = vi.fn();
export const createRemindersForLetter = vi.fn();
export const getRemindersByLetterId = vi.fn();
export const updateLetterReminders = vi.fn();
export const deleteRemindersByLetterId = vi.fn();
export const getShareTokenRecord = vi.fn();
export const getActiveShareToken = vi.fn();
export const createShareToken = vi.fn();
export const revokeShareToken = vi.fn();
export const rotateShareToken = vi.fn();
export const incrementShareTokenViewCount = vi.fn();
export const migrateShareTokenIfNeeded = vi.fn();
export const regenerateUnlockCode = vi.fn();
export const getLettersByScope = vi.fn();
export const canAccessLetter = vi.fn();
export const createFamily = vi.fn();
export const getFamilyByOwner = vi.fn();
export const getFamilyMemberships = vi.fn();
export const getFamilyMembers = vi.fn();
export const createFamilyInvite = vi.fn();
export const acceptFamilyInvite = vi.fn();
export const getFamilyInvites = vi.fn();
export const isUserFamilyMember = vi.fn();
export const getDb = vi.fn();
