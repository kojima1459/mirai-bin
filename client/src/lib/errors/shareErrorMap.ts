/**
 * ShareLetter Error Classification Map
 *
 * Centralized error definitions for the ShareLetter flow.
 * This file consolidates all error states into a single source of truth.
 *
 * Usage:
 * - ShareStateView uses this for display
 * - Tests can verify correct error state mapping
 * - Debug logging can reference error codes
 */

export type ShareErrorCode =
    | "TOKEN_NOT_FOUND"
    | "TOKEN_CANCELED"
    | "TOKEN_REVOKED"
    | "TOKEN_ROTATED"
    | "NOT_YET_OPENABLE"
    | "ALREADY_OPENED"
    | "CODE_INVALID"
    | "NETWORK_OR_UNKNOWN";

export interface ShareErrorConfig {
    /** Display title shown to user */
    title: string;
    /** Explanation message */
    description: string;
    /** Primary action button text */
    primaryAction: string;
    /** Action type hint */
    actionType: "contact_sender" | "retry" | "copy_url" | "re_input";
    /** Severity for logging/analytics */
    severity: "info" | "warning" | "error";
    /** Server error value that triggers this state (if applicable) */
    serverErrorValue?: "not_found" | "canceled" | "revoked" | "rotated";
}

/**
 * Error configuration map - Single Source of Truth
 *
 * Note: This is intentionally separate from UI rendering logic.
 * ShareStateView.tsx consumes this data but handles its own rendering.
 */
export const SHARE_ERROR_MAP: Record<ShareErrorCode, ShareErrorConfig> = {
    TOKEN_NOT_FOUND: {
        title: "リンクが見つかりません",
        description: "URLが間違っているか、既に無効になっています。",
        primaryAction: "送信者に確認する",
        actionType: "contact_sender",
        severity: "warning",
        serverErrorValue: "not_found",
    },
    TOKEN_CANCELED: {
        title: "この手紙は取り消されました",
        description: "送信者が送信を取り消しています。",
        primaryAction: "送信者に確認する",
        actionType: "contact_sender",
        severity: "info",
        serverErrorValue: "canceled",
    },
    TOKEN_REVOKED: {
        title: "このリンクは無効になっています",
        description: "安全のため、このリンクは無効化されました。",
        primaryAction: "送信者に確認する",
        actionType: "contact_sender",
        severity: "warning",
        serverErrorValue: "revoked",
    },
    TOKEN_ROTATED: {
        title: "リンクが更新されています",
        description: "新しいリンクが発行されている可能性があります。",
        primaryAction: "送信者に確認する",
        actionType: "contact_sender",
        severity: "info",
        serverErrorValue: "rotated",
    },
    NOT_YET_OPENABLE: {
        title: "まだ開封できません",
        description: "開封できる日になったら、ここから開けられます。",
        primaryAction: "URLをコピーして保存",
        actionType: "copy_url",
        severity: "info",
    },
    ALREADY_OPENED: {
        title: "この手紙は既に開封されています",
        description: "同じリンクからはもう一度開けない仕様です。",
        primaryAction: "送信者に確認する",
        actionType: "contact_sender",
        severity: "info",
    },
    CODE_INVALID: {
        title: "解錠コードが違うようです",
        description: "もう一度、12文字のコードを確認して入力してください。",
        primaryAction: "再入力",
        actionType: "re_input",
        severity: "warning",
    },
    NETWORK_OR_UNKNOWN: {
        title: "読み込みに失敗しました",
        description: "通信状況を確認して、もう一度お試しください。",
        primaryAction: "再読み込み",
        actionType: "retry",
        severity: "error",
    },
};

/**
 * Maps server's data.error string to ShareErrorCode
 */
export function mapServerErrorToCode(serverError: string | undefined): ShareErrorCode | null {
    if (!serverError) return null;
    switch (serverError) {
        case "not_found":
            return "TOKEN_NOT_FOUND";
        case "canceled":
            return "TOKEN_CANCELED";
        case "revoked":
            return "TOKEN_REVOKED";
        case "rotated":
            return "TOKEN_ROTATED";
        default:
            return null;
    }
}

/**
 * Debug helper: log state transition with context (DEV only)
 */
export function debugLogStateTransition(
    component: string,
    prevState: ShareErrorCode | null,
    newState: ShareErrorCode,
    context: Record<string, unknown>
): void {
    if (import.meta.env.DEV) {
        console.debug(
            `[${component}] State: ${prevState ?? "initial"} → ${newState}`,
            {
                ...context,
                config: SHARE_ERROR_MAP[newState],
            }
        );
    }
}
