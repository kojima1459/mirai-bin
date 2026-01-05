import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DraftData {
  templateName?: string;
  recipientName?: string;
  recipientRelation?: string;
  audioUrl?: string;
  audioBase64?: string;
  transcription?: string;
  aiDraft?: string;
  finalContent?: string;
  unlockAt?: string;
  currentStep?: string;
}

interface UseDraftAutoSaveOptions {
  debounceMs?: number;
  onSaved?: () => void;
  onError?: (error: Error) => void;
}

export function useDraftAutoSave(options: UseDraftAutoSaveOptions = {}) {
  const { debounceMs = 2000, onSaved, onError } = options;
  
  const [draftId, setDraftId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const pendingDataRef = useRef<DraftData | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createDraftMutation = trpc.draft.create.useMutation();
  const updateDraftMutation = trpc.draft.update.useMutation();

  // 実際の保存処理
  const performSave = useCallback(async (data: DraftData, id: number | null) => {
    setIsSaving(true);
    try {
      if (id === null) {
        // 新規作成
        const result = await createDraftMutation.mutateAsync({
          templateName: data.templateName,
          recipientName: data.recipientName,
          recipientRelation: data.recipientRelation,
          currentStep: data.currentStep || "template",
        });
        setDraftId(result.id);
        
        // 作成後に追加データがあれば更新
        if (data.audioUrl || data.transcription || data.aiDraft || data.finalContent) {
          await updateDraftMutation.mutateAsync({
            id: result.id,
            ...data,
          });
        }
      } else {
        // 更新
        await updateDraftMutation.mutateAsync({
          id,
          ...data,
        });
      }
      
      setLastSaved(new Date());
      onSaved?.();
    } catch (error) {
      console.error("[Draft] Save failed:", error);
      onError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [createDraftMutation, updateDraftMutation, onSaved, onError]);

  // debounce付きの保存
  const save = useCallback((data: DraftData) => {
    pendingDataRef.current = data;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        performSave(pendingDataRef.current, draftId);
        pendingDataRef.current = null;
      }
    }, debounceMs);
  }, [draftId, debounceMs, performSave]);

  // 即時保存（ページ離脱時など）
  const saveImmediately = useCallback(async (data: DraftData) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await performSave(data, draftId);
  }, [draftId, performSave]);

  // 下書きを読み込む
  const loadDraft = useCallback((id: number) => {
    setDraftId(id);
  }, []);

  // 下書きをリセット
  const resetDraft = useCallback(() => {
    setDraftId(null);
    setLastSaved(null);
    pendingDataRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    draftId,
    isSaving,
    lastSaved,
    save,
    saveImmediately,
    loadDraft,
    resetDraft,
    setDraftId,
  };
}
