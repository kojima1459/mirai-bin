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

    // 宛先表示ロジック
    const getRecipientLabel = () => {
        switch (scope) {
            case "private":
                return (
                    <div className="flex items-center gap-2 font-semibold text-white">
                        <User className="h-4 w-4 text-white/50" />
                        <span>自分宛</span>
                    </div>
                );
            case "family":
                return (
                    <div className="flex items-center gap-2 font-semibold text-white">
                        <Users className="h-4 w-4 text-white/50" />
                        <span>{letter.recipientName || "家族メンバー"}</span>
                    </div>
                );
            case "link":
                return (
                    <div className="flex items-center gap-2 font-semibold text-white">
                        <Link2 className="h-4 w-4 text-white/50" />
                        <span>{letter.recipientName || "リンク共有"}</span>
                    </div>
                );
            default:
                return <span className="font-semibold text-white">{letter.recipientName}</span>;
        }
    };

    // 日付フォーマット: yyyy/MM/dd(ddd) HH:mm
    const formattedUnlockDate = unlockDate
        ? format(unlockDate, "yyyy/MM/dd(EEE) HH:mm", { locale: ja })
        : "";

    const timeUntil = getTimeUntilUnlock(letter.unlockAt);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
            onClick={() => navigate(`/letter/${letter.id}`)}
        >
            {/* Row 1: Recipient + Status Badge */}
            <div className="flex items-center justify-between mb-3">
                {getRecipientLabel()}
                <LetterStatusBadge letter={letter} showTooltip={false} />
            </div>

            {/* Row 2: Date + Relative Time */}
            <div className="flex items-center text-sm gap-3">
                {unlockDate ? (
                    <div className="flex items-center gap-2 text-white/50">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="tabular-nums tracking-tight font-medium font-mono">
                            {formattedUnlockDate}
                        </span>
                        {!isUnlocked && timeUntil && (
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60 ml-1">
                                あと{timeUntil}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-white/40 flex items-center gap-2">
                        <Ghost className="h-3.5 w-3.5" />
                        <span>日付指定なし</span>
                    </div>
                )}
            </div>

            {/* Row 3: Template/Meta (Optional) */}
            {letter.templateUsed && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5">
                    <span className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        {letter.templateUsed}
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
            )}
        </motion.div>
    );
}
