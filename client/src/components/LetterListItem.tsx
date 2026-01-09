import { useLocation } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { LetterStatusBadge } from "@/components/LetterStatusBadge";
import { getTimeUntilUnlock } from "@/lib/letterStatus";
import { Calendar, Clock, ChevronRight, User, Users, Link2, Ghost } from "lucide-react";
import { Letter } from "@shared/schema"; // Assuming schema availability or define interface

interface LetterListItemProps {
    letter: any; // Using any for flexibility if full type isn't readily available, but preferably strict
    scope: "private" | "family" | "link";
    onDelete?: (id: number) => void; // Optional delete handler if we move delete logic here or keep it in parent
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
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>自分宛</span>
                    </div>
                );
            case "family":
                return (
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{letter.recipientName || "家族メンバー"}</span>
                    </div>
                );
            case "link":
                return (
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span>{letter.recipientName || "リンク共有"}</span>
                    </div>
                );
            default:
                return <span className="font-bold">{letter.recipientName}</span>;
        }
    };

    // 日付フォーマット: yyyy/MM/dd(ddd) HH:mm
    const formattedUnlockDate = unlockDate
        ? format(unlockDate, "yyyy/MM/dd(EEE) HH:mm", { locale: ja })
        : "";

    const timeUntil = getTimeUntilUnlock(letter.unlockAt);

    return (
        <Card
            className="hover:shadow-md transition-shadow cursor-pointer group active:scale-[0.99] transition-transform duration-100"
            onClick={() => navigate(`/letter/${letter.id}`)}
        >
            <CardContent className="p-4 space-y-2">
                {/* Row 1: Recipient + Status Badge */}
                <div className="flex items-center justify-between">
                    {getRecipientLabel()}
                    <LetterStatusBadge letter={letter} showTooltip={false} />
                </div>

                {/* Row 2: Date + Relative Time */}
                <div className="flex items-center text-sm gap-3">
                    {unlockDate ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="tabular-nums tracking-tight font-medium">
                                {formattedUnlockDate}
                            </span>
                            {!isUnlocked && timeUntil && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-1">
                                    あと{timeUntil}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Ghost className="h-3.5 w-3.5" />
                            <span>日付指定なし</span>
                        </div>
                    )}
                </div>

                {/* Row 3: Template/Meta (Optional) */}
                {letter.templateUsed && (
                    <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                            {letter.templateUsed}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
