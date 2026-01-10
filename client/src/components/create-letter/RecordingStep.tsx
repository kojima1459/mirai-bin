
import { Mic, Square, RotateCcw, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/AudioWaveform";
import { RecordingTimer } from "@/components/RecordingTimer";

interface RecordingStepProps {
    isRecording: boolean;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onResetRecording: () => void;
    base64: string | null;
    audioUrl?: string;
    elapsed: number;
    remaining: number;
    maxDuration: number;
    recordingError: string | null;
    selectedTemplatePrompt?: string;
    onProceed: () => void;
    onBack: () => void;
}

export function RecordingStep({
    isRecording,
    onStartRecording,
    onStopRecording,
    onResetRecording,
    base64,
    audioUrl,
    elapsed,
    remaining,
    maxDuration,
    recordingError,
    selectedTemplatePrompt,
    onProceed,
    onBack,
}: RecordingStepProps) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 md:p-8 space-y-8 animate-in fade-in">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-white">あなたの声を残す</h2>
                <p className="text-white/50 text-sm">
                    {selectedTemplatePrompt || "リラックスして、普段通りの言葉で。"}
                </p>
            </div>

            <div className="flex flex-col items-center gap-8 py-4">
                {isRecording ? (
                    <>
                        <div className="w-full max-w-xs">
                            <AudioWaveform isRecording={isRecording} />
                        </div>
                        <RecordingTimer elapsed={elapsed} remaining={remaining} maxDuration={maxDuration} />
                        <Button
                            size="lg"
                            variant="destructive"
                            onClick={onStopRecording}
                            className="w-32 h-32 rounded-full shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-pulse"
                        >
                            <Square className="h-10 w-10 fill-current" />
                        </Button>
                        <p className="text-sm text-white/40">タップして録音を停止</p>
                    </>
                ) : base64 ? (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-6 w-full"
                    >
                        <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center justify-center">
                            <Check className="h-10 w-10" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-white mb-1">録音完了！</p>
                            <p className="text-sm text-white/40">{elapsed}秒の音声を録音しました</p>
                        </div>

                        {/* Audio Preview Player */}
                        {audioUrl && (
                            <div className="w-full bg-black/20 rounded-xl p-4 border border-white/5">
                                <p className="text-xs text-white/40 mb-2 text-center">録音をプレビュー</p>
                                <audio
                                    controls
                                    src={audioUrl}
                                    className="w-full h-10 opacity-80 hover:opacity-100 transition-opacity"
                                    style={{ filter: "invert(1)" }}
                                />
                            </div>
                        )}

                        <div className="flex w-full gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={onResetRecording}
                                className="flex-1 h-12 bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                撮り直す
                            </Button>
                            <Button
                                onClick={onProceed}
                                className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-semibold"
                            >
                                次へ進む
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-4 text-center"
                    >
                        <Button
                            onClick={onStartRecording}
                            className="w-32 h-32 rounded-full bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 active:scale-95"
                        >
                            <Mic className="h-10 w-10" />
                        </Button>
                        <p className="text-sm text-white/40">
                            タップして録音を開始（最大{maxDuration}秒）
                        </p>
                    </motion.div>
                )}
            </div>

            {recordingError && (
                <p className="text-sm text-red-400 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                    {recordingError}
                </p>
            )}

            {!base64 && !isRecording && (
                <div className="pt-4 border-t border-white/5">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="w-full text-white/40 hover:text-white hover:bg-white/5"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        テンプレート選択に戻る
                    </Button>
                </div>
            )}
        </div>
    );
}
