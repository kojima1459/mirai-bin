import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { User, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState, useRef } from "react";

interface DecryptedLetterViewProps {
    content: string;
    audioUrl?: string;
    recipientName?: string;
    templateUsed?: string;
    createdAt?: string;
}

/**
 * Display view for successfully decrypted letter content
 * LP-matched dark aesthetic
 */
export function DecryptedLetterView({
    content,
    audioUrl,
    recipientName,
    templateUsed,
    createdAt,
}: DecryptedLetterViewProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white py-16 px-6">
            {/* Background Grain Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-2xl mx-auto space-y-12 relative z-10"
            >
                {/* Header */}
                <div className="text-center space-y-6">
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
                </div>

                {/* Audio Player */}
                {audioUrl && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleAudio}
                                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                            </button>
                            <div className="flex-1">
                                <p className="font-semibold text-white mb-1">声のメッセージ</p>
                                <p className="text-xs text-white/40">タップして再生</p>
                            </div>
                        </div>
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            onEnded={() => setIsPlaying(false)}
                            className="hidden"
                        />
                    </motion.div>
                )}

                {/* Letter Content */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="bg-white/5 border border-white/5 rounded-2xl p-8 md:p-12"
                >
                    <div className="text-white/80 whitespace-pre-wrap leading-[2] text-base md:text-lg font-serif tracking-wide">
                        {content}
                    </div>
                </motion.div>

                {/* Template Badge */}
                {templateUsed && (
                    <div className="text-center">
                        <span className="text-xs text-white/30 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                            テーマ: {templateUsed}
                        </span>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pt-8">
                    <Link href="/">
                        <span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors border-b border-transparent hover:border-white/20 pb-0.5">
                            mirai-bin Top
                        </span>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
