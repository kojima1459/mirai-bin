import { getTimeUntilUnlock } from "@/lib/letterStatus";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useState } from "react";

interface LetterUnlockDateProps {
    unlockAt?: string | null;
    size?: 'sm' | 'md' | 'lg';
    showCountdown?: boolean;
}

export function LetterUnlockDate({
    unlockAt,
    size = 'md',
    showCountdown = true
}: LetterUnlockDateProps) {
    const [countdown, setCountdown] = useState<string | null>(null);

    useEffect(() => {
        if (!unlockAt || !showCountdown) return;

        const updateCountdown = () => {
            setCountdown(getTimeUntilUnlock(unlockAt));
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [unlockAt, showCountdown]);

    if (!unlockAt) return null;

    const unlockDate = new Date(unlockAt);
    const isInFuture = unlockDate > new Date();

    const sizeClasses = {
        sm: { date: 'text-sm', countdown: 'text-xs' },
        md: { date: 'text-base', countdown: 'text-sm' },
        lg: { date: 'text-lg font-semibold', countdown: 'text-base' }
    };

    return (
        <div className="space-y-1">
            <div className={`flex items-center gap-2 ${sizeClasses[size].date}`}>
                <Calendar className={`h-4 w-4 ${isInFuture ? 'text-amber-600' : 'text-muted-foreground'}`} />
                <span className={isInFuture ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {format(unlockDate, "yyyy年M月d日 HH:mm", { locale: ja })}
                </span>
            </div>

            {showCountdown && countdown && (
                <div className={`flex items-center gap-2 ${sizeClasses[size].countdown} text-muted-foreground ml-6`}>
                    <Clock className="h-3 w-3" />
                    <span>あと {countdown}</span>
                </div>
            )}
        </div>
    );
}
