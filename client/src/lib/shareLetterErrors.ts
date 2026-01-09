// Error categorization for ShareLetter.tsx
// Provides user-friendly error types and classification logic

export enum ShareLetterErrorType {
    NOT_YET_OPENABLE = 'NOT_YET_OPENABLE',
    CODE_INVALID = 'CODE_INVALID',
    ALREADY_OPENED = 'ALREADY_OPENED',
    TOKEN_INVALID_OR_EXPIRED = 'TOKEN_INVALID_OR_EXPIRED',
    NETWORK_OR_SERVER = 'NETWORK_OR_SERVER',
    UNKNOWN = 'UNKNOWN'
}

export interface ShareLetterError {
    type: ShareLetterErrorType;
    unlockDate?: Date; // For NOT_YET_OPENABLE
    detail?: string; // For debugging/logging
}

/**
 * Classifies errors from ShareLetter flow into user-friendly categories
 * @param error - The caught error object
 * @param data - API response data (if available)
 * @returns Categorized error with metadata
 */
export function classifyShareLetterError(
    error: unknown,
    data?: any
): ShareLetterError {
    // Network/timeout errors
    if (error instanceof Error) {
        if (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('timeout')
        ) {
            return {
                type: ShareLetterErrorType.NETWORK_OR_SERVER,
                detail: error.message
            };
        }

        // Decryption failures (wrong code)
        if (
            error.message.includes('decrypt') ||
            error.message.includes('Malformed') ||
            error.message.includes('invalid')
        ) {
            return {
                type: ShareLetterErrorType.CODE_INVALID,
                detail: error.message
            };
        }
    }

    // API response errors
    if (data && 'error' in data) {
        const errorType = data.error;

        if (errorType === 'not_found' || errorType === 'canceled') {
            return {
                type: ShareLetterErrorType.TOKEN_INVALID_OR_EXPIRED,
                detail: errorType
            };
        }

        if (errorType === 'already_opened') {
            return {
                type: ShareLetterErrorType.ALREADY_OPENED,
                detail: errorType
            };
        }
    }

    // Not yet openable (handled separately in component, but included for completeness)
    if (data && 'canUnlock' in data && !data.canUnlock && data.unlockAt) {
        return {
            type: ShareLetterErrorType.NOT_YET_OPENABLE,
            unlockDate: new Date(data.unlockAt),
            detail: 'unlock date not reached'
        };
    }

    // Unknown error
    return {
        type: ShareLetterErrorType.UNKNOWN,
        detail: error instanceof Error ? error.message : String(error)
    };
}

/**
 * Classifies decryption errors specifically (for unlock code input)
 * @param error - The caught error during decryption
 * @returns Categorized error
 */
export function classifyDecryptionError(error: unknown): ShareLetterError {
    if (error instanceof Error) {
        // Wrong unlock code
        if (
            error.message.includes('decrypt') ||
            error.message.includes('Malformed') ||
            error.message.includes('invalid')
        ) {
            return {
                type: ShareLetterErrorType.CODE_INVALID,
                detail: error.message
            };
        }

        // Network issues during ciphertext fetch
        if (error.message.includes('fetch') || error.message.includes('暗号文の取得')) {
            return {
                type: ShareLetterErrorType.NETWORK_OR_SERVER,
                detail: error.message
            };
        }
    }

    return {
        type: ShareLetterErrorType.UNKNOWN,
        detail: error instanceof Error ? error.message : String(error)
    };
}
