/**
 * オフライン下書き保存ユーティリティ
 * IndexedDBを使用してオフライン時でも下書きを保存可能にする
 */

import { get, set, del, keys, createStore } from "idb-keyval";

// カスタムストアを作成（未来便専用）
const miraiBinStore = createStore("mirai-bin-db", "drafts");

export interface OfflineDraft {
  id: string;
  templateId: string | null;
  recipientName: string;
  recipientRelation: string;
  transcription: string;
  aiDraft: string;
  finalContent: string;
  audioBlob?: Blob;
  unlockDate: string;
  unlockTime: string;
  step: string;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null; // サーバーと同期した日時（nullは未同期）
  serverId: number | null; // サーバー側のID（nullはローカルのみ）
}

/**
 * オフライン下書きを保存
 */
export async function saveOfflineDraft(draft: OfflineDraft): Promise<void> {
  await set(draft.id, draft, miraiBinStore);
}

/**
 * オフライン下書きを取得
 */
export async function getOfflineDraft(id: string): Promise<OfflineDraft | undefined> {
  return await get(id, miraiBinStore);
}

/**
 * オフライン下書きを削除
 */
export async function deleteOfflineDraft(id: string): Promise<void> {
  await del(id, miraiBinStore);
}

/**
 * 全てのオフライン下書きのIDを取得
 */
export async function getAllOfflineDraftIds(): Promise<string[]> {
  const allKeys = await keys(miraiBinStore);
  return allKeys.filter((key): key is string => typeof key === "string");
}

/**
 * 全てのオフライン下書きを取得
 */
export async function getAllOfflineDrafts(): Promise<OfflineDraft[]> {
  const ids = await getAllOfflineDraftIds();
  const drafts: OfflineDraft[] = [];
  
  for (const id of ids) {
    const draft = await getOfflineDraft(id);
    if (draft) {
      drafts.push(draft);
    }
  }
  
  // 更新日時の降順でソート
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 未同期の下書きを取得
 */
export async function getUnsyncedDrafts(): Promise<OfflineDraft[]> {
  const drafts = await getAllOfflineDrafts();
  return drafts.filter((draft) => draft.syncedAt === null);
}

/**
 * 下書きを同期済みとしてマーク
 */
export async function markDraftAsSynced(
  id: string,
  serverId: number
): Promise<void> {
  const draft = await getOfflineDraft(id);
  if (draft) {
    draft.syncedAt = Date.now();
    draft.serverId = serverId;
    await saveOfflineDraft(draft);
  }
}

/**
 * 新しい下書きIDを生成
 */
export function generateDraftId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * オンライン状態を監視するフック用のユーティリティ
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * オンライン状態変化のリスナーを追加
 */
export function addOnlineListener(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
