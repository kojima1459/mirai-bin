import { useLocation } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { LetterStatusBadge } from "@/components/LetterStatusBadge";
import { getTimeUntilUnlock } from "@/lib/letterStatus";
import { Calendar, ChevronRight, User, Users, Link2, Ghost } from "lucide-react";
import { motion } from "framer-motion";

interface LetterListItemProps {
    letter: any;
    scope: "private" | "family" | "link";
    onDelete?: (id: number) => void;
}

export function LetterListItem({ letter, scope }: LetterListItemProps) {
    const [, navigate] = useLocation();
    const unlockDate = letter.unlockAt ? new Date(letter.unlockAt) : null;
    const isUnlocked = !!letter.unlockedAt;

    // 宛先アイコン
    const getRecipientIcon = () => {
        switch (scope) {
            case "private": return <User className="h-4 w-4 text-white/70" />;
            case "family": return <Users className="h-4 w-4 text-white/70" />;
            case "link": return <Link2 className="h-4 w-4 text-white/70" />;
            default: return <User className="h-4 w-4 text-white/70" />;
        }
    };

    // 日付フォーマット: yyyy/MM/dd HH:mm
    const formattedUnlockDate = unlockDate
        ? format(unlockDate, "yyyy/MM/dd HH:mm", { locale: ja })
        : "";

    const timeUntil = getTimeUntilUnlock(letter.unlockAt);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group px-5 py-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.08] transition-all cursor-pointer"
            onClick={() => navigate(`/letter/${letter.id}`)}
        >
            {/* Top Row: Recipient & Status */}
            <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    {getRecipientIcon()}
                    <span className="font-semibold text-white tracking-tight">
                        {letter.recipientName || "自分宛"}
                    </span>
                </div>
                <LetterStatusBadge letter={letter} showTooltip={false} />
            </div>

            {/* Middle Row: Date & Countdown */}
            <div className="flex items-center gap-3 mb-1.5">
                {unlockDate ? (
                    <div className="flex items-center gap-2">
                        <span className={`tabular-nums text-sm tracking-tight font-mono ${isUnlocked ? 'text-white/40' : 'text-white/70'}`}>
                            {formattedUnlockDate}
                        </span>
                        {!isUnlocked && timeUntil && (
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">
                                {timeUntil}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-white/40 flex items-center gap-2">
                        <span>日付指定なし</span>
                    </div>
                )}
            </div>

            {/* Bottom Row: Meta (Template) - subtle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {letter.templateUsed && (
                        <span className="text-xs text-white/30 truncate max-w-[200px]">
                            {letter.templateUsed === "__free__" ? "自由記述" :
                                letter.templateUsed === "__raw__" ? "音声記録" :
                                    letter.templateUsed === "__interview__" ? "インタビュー" : letter.templateUsed}
                        </span>
                    )}
                </div>
                <ChevronRight className="h-4 w-4 text-white/10 group-hover:text-white/30 transition-colors" />
            </div>
        </motion.div>
    );
}
