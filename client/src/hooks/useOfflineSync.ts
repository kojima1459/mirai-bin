/**
 * オフライン同期用カスタムフック
 * オンライン復帰時に自動的に下書きを同期する
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  OfflineDraft,
  getUnsyncedDrafts,
  markDraftAsSynced,
  deleteOfflineDraft,
  isOnline,
  addOnlineListener,
} from "@/lib/offlineStorage";

export function useOfflineSync() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // 下書き作成/更新のmutation
  const createDraftMutation = trpc.draft.create.useMutation();
  const updateDraftMutation = trpc.draft.update.useMutation();

  // 未同期の下書き数を更新
  const updatePendingCount = useCallback(async () => {
    const unsynced = await getUnsyncedDrafts();
    setPendingCount(unsynced.length);
  }, []);

  // 同期処理
  const syncDrafts = useCallback(async () => {
    if (!isOnline() || syncing) return;

    const unsynced = await getUnsyncedDrafts();
    if (unsynced.length === 0) return;

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const draft of unsynced) {
      try {
        if (draft.serverId) {
          // 既存の下書きを更新
          await updateDraftMutation.mutateAsync({
            id: draft.serverId,
            templateName: draft.templateId || undefined,
            recipientName: draft.recipientName || undefined,
            recipientRelation: draft.recipientRelation || undefined,
            transcription: draft.transcription || undefined,
            aiDraft: draft.aiDraft || undefined,
            finalContent: draft.finalContent || undefined,
            currentStep: draft.step || undefined,
          });
          await markDraftAsSynced(draft.id, draft.serverId);
        } else {
          // 新規下書きを作成
          const result = await createDraftMutation.mutateAsync({
            templateName: draft.templateId || undefined,
            recipientName: draft.recipientName || undefined,
            recipientRelation: draft.recipientRelation || undefined,
            currentStep: draft.step || undefined,
          });
          await markDraftAsSynced(draft.id, result.id);
        }
        successCount++;
      } catch (error) {
        console.error("Failed to sync draft:", draft.id, error);
        errorCount++;
      }
    }

    setSyncing(false);
    await updatePendingCount();

    if (successCount > 0) {
      toast.success(`${successCount}件の下書きを同期しました`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount}件の下書きの同期に失敗しました`);
    }
  }, [syncing, createDraftMutation, updateDraftMutation, updatePendingCount]);

  // オンライン状態の監視
  useEffect(() => {
    const cleanup = addOnlineListener((isOnline) => {
      setOnline(isOnline);
      if (isOnline) {
        // オンライン復帰時に自動同期
        syncDrafts();
      }
    });

    // 初期状態の更新
    updatePendingCount();

    return cleanup;
  }, [syncDrafts, updatePendingCount]);

  // 手動同期
  const manualSync = useCallback(async () => {
    if (!online) {
      toast.error("オフラインのため同期できません");
      return;
    }
    await syncDrafts();
  }, [online, syncDrafts]);

  return {
    online,
    syncing,
    pendingCount,
    syncDrafts: manualSync,
    updatePendingCount,
  };
}
