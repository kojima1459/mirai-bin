import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, AlertCircle, Loader2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmergencyUnlockDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUnlock: (backupShare: string) => void;
    isDecrypting: boolean;
    error: "INVALID_FORMAT" | "DECRYPT_FAILED" | null;
}

/**
 * 緊急復号ダイアログ
 * 解錠コードを紛失した場合に backupShare で復号
 */
export function EmergencyUnlockDialog({
    isOpen,
    onClose,
    onUnlock,
    isDecrypting,
    error,
}: EmergencyUnlockDialogProps) {
    const [backupShare, setBackupShare] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (backupShare.trim().length < 10) return;
        onUnlock(backupShare.trim());
    };

    const isValidFormat = backupShare.trim().length >= 10;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                    <KeyRound className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">緊急復号</h2>
                                    <p className="text-xs text-white/40">バックアップシェアで復号</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mb-6">
                            <div className="flex gap-3">
                                <ShieldCheck className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm text-white/80">
                                        PDFの2ページ目に記載されている<strong className="text-amber-300">バックアップシェア</strong>を入力してください。
                                    </p>
                                    <p className="text-xs text-white/40">
                                        この情報はサーバーに送信されません。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="backupShare" className="text-sm text-white/60">
                                    バックアップシェア
                                </Label>
                                <Input
                                    id="backupShare"
                                    type="password"
                                    placeholder="PDFに記載されたコードを入力..."
                                    value={backupShare}
                                    onChange={(e) => setBackupShare(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-500/50 rounded-xl h-12 font-mono"
                                    autoComplete="off"
                                    disabled={isDecrypting}
                                />
                                {backupShare.length > 0 && !isValidFormat && (
                                    <p className="text-xs text-red-400">形式が正しくありません</p>
                                )}
                            </div>

                            {/* Error Display */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                                >
                                    <div className="flex gap-3">
                                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm text-red-300 font-medium">
                                                {error === "INVALID_FORMAT"
                                                    ? "形式が正しくありません"
                                                    : "復号に失敗しました"}
                                            </p>
                                            <p className="text-xs text-red-400/80 mt-1">
                                                {error === "INVALID_FORMAT"
                                                    ? "PDFに記載されたバックアップシェアを正確に入力してください。"
                                                    : "バックアップシェアが正しいか確認してください。"}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={!isValidFormat || isDecrypting}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-full h-12"
                            >
                                {isDecrypting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        復号中...
                                    </>
                                ) : (
                                    "復号する"
                                )}
                            </Button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
