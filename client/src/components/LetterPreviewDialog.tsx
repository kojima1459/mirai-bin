import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Eye, Calendar, Lock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface LetterPreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    letter: {
        recipientName?: string | null;
        unlockAt?: Date | string | null;
        createdAt?: Date | string | null;
        status?: string;
    };
    content: string;
}

export function LetterPreviewDialog({
    isOpen,
    onClose,
    letter,
    content
}: LetterPreviewDialogProps) {
    const unlockDate = letter.unlockAt ? new Date(letter.unlockAt) : null;
    const createdDate = letter.createdAt ? new Date(letter.createdAt) : new Date();
    const now = new Date();
    const isLocked = unlockDate && now < unlockDate;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-b from-amber-50 to-orange-50 border-orange-200 p-0">
                <DialogTitle className="sr-only">受取人視点プレビュー</DialogTitle>
                <DialogDescription className="sr-only">手紙の受取人が見る画面のプレビュー</DialogDescription>

                {/* Header */}
                <div className="p-6 pb-4 border-b border-orange-200/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-800">
                            <Eye className="w-5 h-5" />
                            <span className="font-semibold text-sm">受取人視点のプレビュー</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-orange-100 rounded-full transition-colors text-orange-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Letter Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLocked ? (
                        // Locked state preview
                        <div className="text-center py-12 space-y-6">
                            <div className="w-20 h-20 rounded-full bg-orange-100 mx-auto flex items-center justify-center">
                                <Lock className="w-10 h-10 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-orange-900 mb-2">
                                    {letter.recipientName || "未来のあなた"}へ
                                </h2>
                                <p className="text-orange-700/70 text-sm">
                                    この手紙はまだ開封できません
                                </p>
                            </div>
                            <div className="bg-white/60 rounded-xl p-4 border border-orange-200/50 max-w-xs mx-auto">
                                <div className="flex items-center justify-center gap-2 text-orange-800">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        開封可能日: {format(unlockDate, "yyyy年M月d日 HH:mm", { locale: ja })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Unlocked state preview
                        <div className="space-y-6">
                            <div className="text-center border-b border-orange-200/50 pb-4">
                                <p className="text-xs text-orange-600/60 mb-2">
                                    {format(createdDate, "yyyy年M月d日", { locale: ja })} に書かれた手紙
                                </p>
                                <h2 className="text-2xl font-bold text-orange-900 font-serif">
                                    {letter.recipientName || "大切なあなた"}へ
                                </h2>
                            </div>

                            <div
                                className="prose prose-orange max-w-none text-orange-900/90 leading-relaxed font-serif text-base whitespace-pre-wrap"
                            >
                                {content || "(本文がありません)"}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-orange-200/50 bg-white/30">
                    <p className="text-xs text-center text-orange-600/60">
                        ※ これは受取人が見る画面のプレビューです
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
