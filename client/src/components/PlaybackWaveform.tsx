import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { generateWaveformPeaksWithCache } from "@/lib/waveform";

interface PlaybackWaveformProps {
    /** 音声Blob（nullの場合は非表示） */
    audioBlob: Blob | null;
    /** Blob URL（キャッシュキーとして使用） */
    audioBlobUrl?: string;
    /** 音声のローディング中かどうか */
    isLoading?: boolean;
    /** 現在の再生位置（秒） - 将来のハイライト機能用 */
    currentTime?: number;
    /** 総再生時間（秒） - 将来のハイライト機能用 */
    duration?: number;
    /** カスタムクラス名 */
    className?: string;
}

/** 波形のバー数 */
const NUM_BARS = 200;
/** 波形の高さ（ピクセル） */
const WAVEFORM_HEIGHT = 48;
/** バーの幅（ピクセル） */
const BAR_WIDTH = 2;
/** バーの間隔（ピクセル） */
const BAR_GAP = 1;

/**
 * 再生用波形表示コンポーネント
 * 
 * 音声Blobからピークを生成し、Canvasで波形を描画する。
 * ローディング中はスケルトン表示、失敗時はフォールバック表示。
 * 波形表示が失敗しても音声再生には影響しない（非破壊的）。
 */
export function PlaybackWaveform({
    audioBlob,
    audioBlobUrl,
    isLoading = false,
    className = "",
}: PlaybackWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [peaks, setPeaks] = useState<number[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ピーク生成
    useEffect(() => {
        if (!audioBlob || isLoading) {
            setPeaks(null);
            setError(null);
            return;
        }

        const generatePeaks = async () => {
            setIsGenerating(true);
            setError(null);

            try {
                // キャッシュキーはBlobURLがあれば使用、なければランダム
                const cacheKey = audioBlobUrl || crypto.randomUUID();
                const generatedPeaks = await generateWaveformPeaksWithCache(
                    audioBlob,
                    cacheKey,
                    NUM_BARS
                );
                setPeaks(generatedPeaks);
            } catch (err) {
                console.warn("波形生成に失敗しました:", err);
                setError("波形を生成できませんでした");
            } finally {
                setIsGenerating(false);
            }
        };

        // requestIdleCallback があれば少し遅延させて生成
        if ("requestIdleCallback" in window) {
            const id = window.requestIdleCallback(() => generatePeaks(), { timeout: 1000 });
            return () => window.cancelIdleCallback(id);
        } else {
            generatePeaks();
        }
    }, [audioBlob, audioBlobUrl, isLoading]);

    // Canvas描画
    const drawWaveform = useCallback((canvas: HTMLCanvasElement, peaksData: number[]) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = WAVEFORM_HEIGHT;

        // Canvas解像度を設定（Retina対応）
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // クリア
        ctx.clearRect(0, 0, width, height);

        // バーを描画
        const totalBarWidth = BAR_WIDTH + BAR_GAP;
        const numBars = Math.min(peaksData.length, Math.floor(width / totalBarWidth));
        const startX = (width - numBars * totalBarWidth) / 2;

        // グラデーション作成
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "#f59e0b"); // amber-500
        gradient.addColorStop(1, "#fb923c"); // orange-400

        ctx.fillStyle = gradient;

        for (let i = 0; i < numBars; i++) {
            const peak = peaksData[i] || 0;
            const barHeight = Math.max(2, peak * (height - 4)); // 最低2pxの高さ
            const x = startX + i * totalBarWidth;
            const y = (height - barHeight) / 2;

            // 角丸バーを描画
            ctx.beginPath();
            ctx.roundRect(x, y, BAR_WIDTH, barHeight, 1);
            ctx.fill();
        }
    }, []);

    // peaks変更時に再描画
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !peaks) return;

        drawWaveform(canvas, peaks);

        // リサイズ対応
        const resizeObserver = new ResizeObserver(() => {
            drawWaveform(canvas, peaks);
        });
        resizeObserver.observe(canvas);

        return () => resizeObserver.disconnect();
    }, [peaks, drawWaveform]);

    // 非表示条件
    if (!audioBlob && !isLoading) {
        return null;
    }

    // スケルトン表示（ローディング中または生成中）
    if (isLoading || isGenerating) {
        return (
            <div className={`w-full ${className}`} style={{ height: WAVEFORM_HEIGHT }}>
                <div className="flex items-center justify-center gap-[3px] h-full">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1.5 bg-muted-foreground/20 rounded-full"
                            initial={{ height: "20%" }}
                            animate={{ height: ["20%", "60%", "20%"] }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.05,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // エラー時のフォールバック（波形なしでも再生可能）
    if (error) {
        return (
            <div
                className={`w-full flex items-center justify-center text-xs text-muted-foreground ${className}`}
                style={{ height: WAVEFORM_HEIGHT }}
            >
                <div className="flex items-center gap-1 opacity-50">
                    <span>〜</span>
                    <span>波形を表示できません</span>
                    <span>〜</span>
                </div>
            </div>
        );
    }

    // 波形描画
    return (
        <motion.div
            className={`w-full ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: WAVEFORM_HEIGHT }}
            />
        </motion.div>
    );
}
