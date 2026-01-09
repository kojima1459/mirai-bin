import { Link } from "wouter";
import { User } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";
import { AudioHeroPlayer, type AudioError } from "./AudioHeroPlayer";

interface DecryptedLetterViewProps {
    content: string;
    audioUrl?: string;
    audioBlob?: Blob;
    audioError?: AudioError;
    isAudioLoading?: boolean;
    recipientName?: string;
    templateUsed?: string;
    createdAt?: string;
}

/**
 * Display view for successfully decrypted letter content
 * Audio-first design: 音声がある場合は大きな再生ボタンを最優先表示
 */
export function DecryptedLetterView({
    content,
    audioUrl,
    audioBlob,
    audioError,
    isAudioLoading = false,
    recipientName,
    templateUsed,
    createdAt,
}: DecryptedLetterViewProps) {
    // 音声があるかどうか（エラーの場合も表示）
    const hasAudio = !!audioUrl || !!audioError || isAudioLoading;

    return (
        <div className="min-h-screen bg-[#050505] text-white py-16 px-6">
            {/* Background Grain Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="max-w-2xl mx-auto space-y-12 relative z-10"
            >
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-center space-y-6"
                >
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <User className="h-7 w-7 text-white/80" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">
                            {recipientName ? `${recipientName}へ` : "あなたへ"}
                        </h1>
                        {createdAt && (
                            <p className="text-sm text-white/40">
                                {format(new Date(createdAt), "yyyy年M月d日", { locale: ja })}に作成
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Audio Hero Player - 音声がある場合は優先表示 */}
                {hasAudio && (
                    <AudioHeroPlayer
                        audioUrl={audioUrl}
                        audioBlob={audioBlob}
                        isLoading={isAudioLoading}
                        error={audioError}
                    />
                )}

                {/* Letter Content */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: hasAudio ? 0.6 : 0.4, duration: 0.8 }}
                    className="bg-white/5 border border-white/5 rounded-2xl p-8 md:p-12 shadow-2xl backdrop-blur-sm"
                >
                    <div className="text-white/90 whitespace-pre-wrap leading-[2] text-base md:text-lg font-serif tracking-wide">
                        {content}
                    </div>
                </motion.div>

                {/* Template Badge */}
                {templateUsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-center"
                    >
                        <span className="text-xs text-white/30 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                            テーマ: {templateUsed}
                        </span>
                    </motion.div>
                )}

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-center pt-8"
                >
                    <Link href="/">
                        <span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors border-b border-transparent hover:border-white/20 pb-0.5">
                            mirai-bin Top
                        </span>
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
