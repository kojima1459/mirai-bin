import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, AlertCircle, Loader2 } from "lucide-react";
import { PlaybackWaveform } from "@/components/PlaybackWaveform";

export type AudioError = "DECODE_FAILED" | "UNSUPPORTED_MIME" | null;

interface AudioHeroPlayerProps {
    /** 復号済み音声BlobURL */
    audioUrl?: string;
    /** 復号済み音声Blob（波形生成用） */
    audioBlob?: Blob;
    /** ローディング中 */
    isLoading?: boolean;
    /** エラー状態 */
    error?: AudioError;
}

/**
 * 音声優先表示用の大きな再生プレーヤー
 * 
 * - 大きな再生ボタンを中央に配置
 * - 波形表示（PlaybackWaveform使用）
 * - Safari互換性警告
 */
export function AudioHeroPlayer({
    audioUrl,
    audioBlob,
    isLoading = false,
    error = null,
}: AudioHeroPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // 再生/一時停止トグル
    const togglePlay = async () => {
        if (!audioRef.current) return;

        try {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                await audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        } catch (err) {
            console.error("再生エラー:", err);
        }
    };

    // 時間更新
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [audioUrl]);

    // ローディング状態
    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center"
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-white/60 animate-spin" />
                    </div>
                    <p className="text-white/60 text-sm">音声を読み込み中...</p>
                </div>
            </motion.div>
        );
    }

    // エラー状態
    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center"
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="h-10 w-10 text-red-400" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-white/80 font-medium">
                            {error === "UNSUPPORTED_MIME"
                                ? "この端末では音声を再生できない可能性があります"
                                : "音声の読み込みに失敗しました"}
                        </p>
                        <p className="text-white/40 text-sm">
                            {error === "UNSUPPORTED_MIME"
                                ? "別のブラウザでお試しください"
                                : "時間を置いて再度お試しください"}
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    // 音声がない場合は非表示
    if (!audioUrl) {
        return null;
    }

    // 進行割合
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // 時間フォーマット
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm"
        >
            <div className="flex flex-col items-center gap-6">
                {/* 再生ボタン */}
                <motion.button
                    onClick={togglePlay}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-shadow"
                >
                    {isPlaying ? (
                        <Pause className="h-10 w-10" />
                    ) : (
                        <Play className="h-10 w-10 ml-1" />
                    )}
                </motion.button>

                {/* 説明テキスト */}
                <div className="text-center space-y-1">
                    <p className="text-white font-semibold text-lg">声のメッセージ</p>
                    <p className="text-white/50 text-sm">
                        {isPlaying ? "再生中..." : "タップして再生"}
                    </p>
                </div>

                {/* 波形表示 */}
                {audioBlob && (
                    <div className="w-full max-w-md">
                        <PlaybackWaveform
                            audioBlob={audioBlob}
                            audioBlobUrl={audioUrl}
                            currentTime={currentTime}
                            duration={duration}
                        />
                    </div>
                )}

                {/* プログレスバー（波形がない場合のフォールバック） */}
                {!audioBlob && (
                    <div className="w-full max-w-md">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* 時間表示 */}
                <div className="flex items-center gap-2 text-white/40 text-sm">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* 非表示のaudio要素 */}
            <audio ref={audioRef} src={audioUrl} className="hidden" />
        </motion.div>
    );
}
