import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

interface TranscriptEditStepProps {
    transcript: string;
    onTranscriptChange: (transcript: string) => void;
    onProceed: () => void;
    onBack: () => void;
    onRegenerate?: () => void;
    isRegenerating?: boolean;
}

export function TranscriptEditStep({
    transcript,
    onTranscriptChange,
    onProceed,
    onBack,
    onRegenerate,
    isRegenerating = false,
}: TranscriptEditStepProps) {
    const [localTranscript, setLocalTranscript] = useState(transcript);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setLocalTranscript(transcript);
    }, [transcript]);

    const handleChange = (value: string) => {
        setLocalTranscript(value);
        setIsDirty(value !== transcript);
    };

    const handleSave = () => {
        onTranscriptChange(localTranscript);
        setIsDirty(false);
    };

    const handleProceed = () => {
        // Auto-save if dirty before proceeding
        if (isDirty) {
            onTranscriptChange(localTranscript);
        }
        onProceed();
    };

    const charCount = localTranscript.length;
    const estimatedMinutes = Math.ceil(charCount / 400); // ~400 chars/min reading

    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                    文字起こしを確認・編集
                </h2>
                <p className="text-white/50 text-sm">
                    AIが聞き取った内容を確認してください。誤りがあれば修正できます。
                </p>
            </div>

            {/* Warning hint */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                        <strong>固有名詞に注意：</strong>人名・地名・専門用語などはAIが聞き間違えやすいです。
                        必要に応じて修正してください。
                    </span>
                </p>
            </div>

            {/* Transcript textarea */}
            <div className="space-y-2">
                <Textarea
                    value={localTranscript}
                    onChange={(e) => handleChange(e.target.value)}
                    className="min-h-[200px] bg-black/40 border-white/10 text-white placeholder:text-white/30 resize-y"
                    placeholder="文字起こし結果がここに表示されます..."
                />
                <div className="flex justify-between text-xs text-white/40">
                    <span>{charCount.toLocaleString()} 文字</span>
                    <span>読み上げ約 {estimatedMinutes} 分</span>
                </div>
            </div>

            {/* Dirty indicator */}
            {isDirty && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
                >
                    <p className="text-sm text-blue-200">
                        変更があります
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSave}
                        className="bg-transparent border-blue-500/30 text-blue-200 hover:bg-blue-500/10"
                    >
                        変更を保存
                    </Button>
                </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
                <Button
                    variant="outline"
                    onClick={onBack}
                    className="flex-1 h-12 bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    録音し直す
                </Button>

                {onRegenerate && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (isDirty) {
                                onTranscriptChange(localTranscript);
                            }
                            onRegenerate();
                        }}
                        disabled={isRegenerating}
                        className="h-12 bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                    >
                        {isRegenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                )}

                <Button
                    onClick={handleProceed}
                    className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-semibold"
                >
                    手紙を生成
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            <p className="text-xs text-white/30 text-center">
                ※ この文字起こしをもとにAIが手紙を生成します
            </p>
        </div>
    );
}
