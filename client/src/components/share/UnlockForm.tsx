import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UnlockFormProps {
    recipientName?: string;
    templateUsed?: string;
    unlockCode: string;
    isDecrypting: boolean;
    decryptionError?: boolean;
    onUnlockCodeChange: (code: string) => void;
    onSubmit: () => void;
}

/**
 * Unlock form for entering the 12-digit unlock code
 * Displayed when state is READY_TO_UNLOCK
 * LP-matched dark aesthetic
 */
export function UnlockForm({
    recipientName,
    templateUsed,
    unlockCode,
    isDecrypting,
    decryptionError,
    onUnlockCodeChange,
    onSubmit,
}: UnlockFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen flex items-center justify-center p-6 bg-[#050505] text-white"
        >
            {/* Background Grain Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="w-full max-w-sm mx-auto text-center space-y-8 relative z-10">
                {/* Icon */}
                <div className="flex justify-center">
                    <motion.div
                        animate={{
                            scale: isDecrypting ? [1, 1.1, 1] : 1,
                            borderColor: decryptionError ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.1)",
                        }}
                        transition={{ duration: isDecrypting ? 1.5 : 0.3, repeat: isDecrypting ? Infinity : 0 }}
                        className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-colors duration-300"
                    >
                        <Lock className={`h-8 w-8 ${decryptionError ? "text-red-400" : "text-white/80"}`} />
                    </motion.div>
                </div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3"
                >
                    <h1 className="text-3xl font-bold tracking-tighter">手紙が届いています</h1>
                    <p className="text-white/50 leading-relaxed text-sm">
                        {recipientName ? `${recipientName}さんへの手紙` : "あなたへの手紙"}を開封できます。<br />
                        共有された12桁の解錠コードを入力してください。
                    </p>
                </motion.div>

                {/* Input */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        x: decryptionError ? [-10, 10, -10, 10, 0] : 0
                    }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                    className="space-y-4"
                >
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="12桁の解錠コード"
                            className={`text-center text-xl tracking-[0.3em] uppercase h-14 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl font-mono transition-all duration-300 ${decryptionError ? "border-red-500/50 bg-red-500/5 focus:border-red-500" : "border-white/10"
                                }`}
                            maxLength={12}
                            value={unlockCode}
                            onChange={(e) => onUnlockCodeChange(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                            autoFocus
                        />
                    </div>

                    <div className={`text-xs transition-colors duration-300 ${decryptionError ? "text-red-400" : "text-white/30"}`}>
                        {decryptionError ? "コードが正しくありません" : `${unlockCode.length}/12文字`}
                    </div>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Button
                        className="w-full h-14 text-base rounded-full bg-white text-black hover:bg-white/90 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 transition-all active:scale-[0.98]"
                        onClick={onSubmit}
                        disabled={isDecrypting || unlockCode.length < 5}
                    >
                        {isDecrypting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                復号中...
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                開封する
                            </>
                        )}
                    </Button>
                </motion.div>

                {/* Template Badge */}
                {templateUsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="pt-4"
                    >
                        <span className="text-xs text-white/30 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                            テーマ: {templateUsed}
                        </span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
