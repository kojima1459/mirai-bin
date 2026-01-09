import { differenceInDays, differenceInHours, differenceInMinutes, format } from "date-fns";
import { ja } from "date-fns/locale";

export type ShareLetterState =
    | "TOKEN_NOT_FOUND"
    | "TOKEN_CANCELED"
    | "TOKEN_REVOKED"
    | "TOKEN_ROTATED"
    | "NOT_YET_OPENABLE"
    | "ALREADY_OPENED"
    | "READY_TO_UNLOCK"
    | "CODE_INVALID"
    | "NETWORK_OR_UNKNOWN";

export interface ShareLetterData {
    error?: "not_found" | "canceled" | "revoked" | "rotated";
    message?: string;
    canUnlock?: boolean;
    letter?: {
        unlockedAt?: string;
        unlockAt?: string;
    };
}

export function deriveShareLetterState(
    data: ShareLetterData | undefined | null,
    fetchError: unknown,
    decryptionError?: boolean // If passed, overrides to simple invalid code or unknown based on context, but mainly handled in component state
): ShareLetterState {
    if (fetchError) {
        return "NETWORK_OR_UNKNOWN";
    }

    if (!data) {
        // If loading, usually handled by separate loading state used before calling this, 
        // but if data is null after loading:
        return "NETWORK_OR_UNKNOWN";
    }

    // A) Explicit server errors (200 OK with error field)
    if (data.error === "not_found") return "TOKEN_NOT_FOUND";
    if (data.error === "canceled") return "TOKEN_CANCELED";
    if (data.error === "revoked") return "TOKEN_REVOKED";
    if (data.error === "rotated") return "TOKEN_ROTATED";

    // B) Already unlocked
    if (data.letter?.unlockedAt) {
        return "ALREADY_OPENED";
    }

    // C) Not yet openable
    if (data.canUnlock === false) {
        return "NOT_YET_OPENABLE";
    }

    // D) Ready
    if (data.canUnlock === true) {
        return "READY_TO_UNLOCK";
    }

    return "NETWORK_OR_UNKNOWN";
}

/**
 * Validates JST date formatting
 */
export function formatUnlockDateJST(isoString: string): string {
    return format(new Date(isoString), "yyyy/MM/dd(EEE) HH:mm", { locale: ja });
}

export function getRelativeTimeJST(isoString: string): string {
    const target = new Date(isoString);
    const now = new Date();

    // Simple diff logic similar to existing MyLetters
    // Note: server time should ideally be used if strictness is required, but client time is used elsewhere too
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "";

    const days = differenceInDays(target, now);
    if (days > 0) return `あと ${days}日`;

    const hours = differenceInHours(target, now);
    if (hours > 0) return `あと ${hours}時間`;

    const minutes = differenceInMinutes(target, now);
    return `あと ${minutes}分`;
}
