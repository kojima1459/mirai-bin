// Letter status classification for MyLetters.tsx
// Determines the current state of a letter for badge/UI display

export type LetterStatus =
    | 'draft'
    | 'sealed_not_shared'
    | 'awaiting_unlock'
    | 'ready_to_unlock'
    | 'unlocked';

export interface LetterStatusInfo {
    status: LetterStatus;
    badge: {
        text: string;
        variant: 'outline' | 'default' | 'secondary' | 'destructive';
        className: string;
    };
    description: string;
    urgency: 'low' | 'medium' | 'high'; // For visual priority
}

interface LetterData {
    status: string;
    shareToken?: string | null;
    unlockAt?: string | null;
    unlockedAt?: string | null;
}

/**
 * Determines the status and UI properties for a letter
 */
export function getLetterStatus(letter: LetterData): LetterStatusInfo {
    const now = new Date();
    const unlockDate = letter.unlockAt ? new Date(letter.unlockAt) : null;
    const unlockedDate = letter.unlockedAt ? new Date(letter.unlockedAt) : null;

    // 1. Unlocked (opened)
    if (unlockedDate) {
        return {
            status: 'unlocked',
            badge: {
                text: '開封済み',
                variant: 'default',
                className: 'bg-green-100 text-green-700 border-green-200'
            },
            description: '既に開封されています',
            urgency: 'low'
        };
    }

    // 2. Draft
    if (letter.status === 'draft') {
        return {
            status: 'draft',
            badge: {
                text: '下書き',
                variant: 'outline',
                className: 'text-muted-foreground border-muted'
            },
            description: '編集中',
            urgency: 'low'
        };
    }

    // 3. Sealed but not shared
    if (letter.status === 'sealed' && !letter.shareToken) {
        return {
            status: 'sealed_not_shared',
            badge: {
                text: '封緘済み',
                variant: 'default',
                className: 'bg-blue-100 text-blue-700 border-blue-200'
            },
            description: '共有待ち',
            urgency: 'medium'
        };
    }

    // 4. Ready to unlock (date passed, but not opened yet)
    if (letter.status === 'sealed' && letter.shareToken && unlockDate && unlockDate <= now) {
        return {
            status: 'ready_to_unlock',
            badge: {
                text: '開封可能',
                variant: 'default',
                className: 'bg-green-50 text-green-700 border-green-300 animate-pulse'
            },
            description: '今すぐ開封できます',
            urgency: 'high'
        };
    }

    // 5. Awaiting unlock (shared, but date in future)
    if (letter.status === 'sealed' && letter.shareToken && unlockDate && unlockDate > now) {
        return {
            status: 'awaiting_unlock',
            badge: {
                text: '開封待ち',
                variant: 'default',
                className: 'bg-amber-100 text-amber-700 border-amber-200'
            },
            description: '開封日まで待機中',
            urgency: 'low'
        };
    }

    // Fallback: sealed but shared (no unlock date)
    return {
        status: 'sealed_not_shared',
        badge: {
            text: '封緘済み',
            variant: 'default',
            className: 'bg-blue-100 text-blue-700 border-blue-200'
        },
        description: '共有済み',
        urgency: 'low'
    };
}

/**
 * Calculates time remaining until unlock date
 * Returns null if date is in the past or doesn't exist
 */
export function getTimeUntilUnlock(unlockAt?: string | null): string | null {
    if (!unlockAt) return null;

    const now = new Date();
    const unlockDate = new Date(unlockAt);
    const diff = unlockDate.getTime() - now.getTime();

    if (diff <= 0) return null;

    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) % 365;
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (years > 0) {
        return `${years}年 ${days}日`;
    } else if (days > 0) {
        return `${days}日 ${hours}時間`;
    } else if (hours > 0) {
        return `${hours}時間 ${minutes}分`;
    } else {
        return `${minutes}分`;
    }
}
