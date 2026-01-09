import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    Check,
    FileText,
    Share2,
    Copy,
    MessageCircle,
    Mail,
    AlertTriangle,
    Loader2,
    Sparkles,
    ArrowRight,
    Home,
    PenTool
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";
import { ShareChecklistGate, REQUIRED_CHECKLIST_ITEMS } from "@/components/share/ShareChecklistGate";

interface LetterCompletionViewProps {
    recipientName?: string;
    templateName?: string;
    unlockDate?: Date;
    unlockTime?: string;
    unlockCode: string;
    backupShare: string;
    shareUrl: string | null;
    onGenerateShareLink: () => Promise<void>;
    isGeneratingShareLink: boolean;
    onExportPDF: () => void;
    onReset: () => void;
}

export function LetterCompletionView({
    recipientName,
    templateName,
    unlockDate,
    unlockTime,
    unlockCode,
    backupShare,
    shareUrl,
    onGenerateShareLink,
    isGeneratingShareLink,
    onExportPDF,
    onReset,
}: LetterCompletionViewProps) {
    const [, navigate] = useLocation();
    const [activeStep, setActiveStep] = useState<string>("step-1");
    // Share safety checklist state
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const isGatePassed = REQUIRED_CHECKLIST_ITEMS.every((id) => checkedItems.has(id));
    // 1-time unlock code reveal state
    const [codeRevealed, setCodeRevealed] = useState(false);
    const [maskedCode, setMaskedCode] = useState("••••••••••••");

    const handleCheckItem = (item: string, checked: boolean) => {
        setCheckedItems((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(item);
            } else {
                next.delete(item);
            }
            return next;
        });
    };

    const handleCopyUnlockCode = async () => {
        await navigator.clipboard.writeText(unlockCode);
        toast.success("解錠コードをコピーしました");
        setTimeout(() => navigator.clipboard.writeText("").catch(() => { }), 30000);
    };

    const handleCopyShareUrl = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("リンクをコピーしました");
    };

    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Hero Header */}
            <div className="text-center py-8 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5">
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-75 duration-500">
                    <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">封緘完了</h2>
                <p className="text-white/50 mt-2 text-sm">
                    手紙は安全に暗号化されました
                </p>
            </div>

            <div className="p-4 md:p-6 space-y-8">
                {/* Summary */}
                <div className="flex flex-wrap gap-2 justify-center text-sm">
                    {recipientName && (
                        <span className="bg-white/10 text-white/90 border border-white/10 px-3 py-1 rounded-full">{recipientName}さんへ</span>
                    )}
                    {templateName && (
                        <span className="bg-white/10 text-white/90 border border-white/10 px-3 py-1 rounded-full">{templateName}</span>
                    )}
                    {unlockDate && (
                        <span className="bg-amber-500/20 text-amber-200 border border-amber-500/20 px-3 py-1 rounded-full font-mono">
                            {format(unlockDate, "yyyy/MM/dd", { locale: ja })} {unlockTime} 開封
                        </span>
                    )}
                </div>

                {/* Share Safety Checklist Gate */}
                <ShareChecklistGate
                    checkedItems={checkedItems}
                    onCheckItem={handleCheckItem}
                />

                {/* Main CTA: PDF Export - GATED */}
                <div className={`border rounded-xl p-6 text-center space-y-4 transition-all ${isGatePassed ? "bg-indigo-500/10 border-indigo-500/20" : "bg-white/5 border-white/10 opacity-60"}`}>
                    <div className={`flex items-center justify-center gap-2 font-semibold ${isGatePassed ? "text-indigo-300" : "text-white/50"}`}>
                        <FileText className="h-5 w-5" />
                        {isGatePassed ? "まずはPDFを保存" : "↑ 上の確認を完了してください"}
                    </div>
                    <p className="text-sm text-white/40">
                        リンク・コード・バックアップを3ページに分けて出力します
                    </p>
                    <Button
                        size="lg"
                        className="w-full bg-indigo-500 hover:bg-indigo-400 text-white border-0 font-bold shadow-lg shadow-indigo-500/20 disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none"
                        onClick={onExportPDF}
                        disabled={!shareUrl || !isGatePassed}
                    >
                        <FileText className="mr-2 h-5 w-5" />
                        PDFを印刷/保存
                    </Button>
                    {!shareUrl && isGatePassed && (
                        <p className="text-xs text-white/30">
                            共有リンクを生成してからPDFを出力できます
                        </p>
                    )}
                </div>

                {/* Accordion Steps */}
                <Accordion
                    type="single"
                    collapsible
                    value={activeStep}
                    onValueChange={setActiveStep}
                    className="space-y-4"
                >
                    {/* Step 1: Generate Share Link */}
                    <AccordionItem value="step-1" className="bg-white/5 border border-white/5 rounded-xl overflow-hidden px-0">
                        <AccordionTrigger className="px-4 py-4 hover:no-underline text-white hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border ${shareUrl ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white/70 border-white/10"}`}>
                                    {shareUrl ? <Check className="h-4 w-4" /> : "1"}
                                </div>
                                <span className="font-medium">共有リンクを生成</span>
                                {shareUrl && <span className="text-xs text-green-400 ml-2">✓ 完了</span>}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 space-y-4 border-t border-white/5">
                            {!shareUrl ? (
                                <Button
                                    onClick={onGenerateShareLink}
                                    disabled={isGeneratingShareLink}
                                    className="w-full bg-white text-black hover:bg-white/90"
                                >
                                    {isGeneratingShareLink ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Share2 className="mr-2 h-4 w-4" />
                                    )}
                                    リンクを生成する
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={shareUrl}
                                            readOnly
                                            className="text-sm bg-black/40 border-white/10 text-white/90 focus-visible:ring-indigo-500 h-11"
                                        />
                                        <Button size="icon" variant="outline" onClick={handleCopyShareUrl} className="shrink-0 bg-transparent border-white/10 text-white hover:bg-white/10 h-11 w-11">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1 bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] border-[#06C755]/30 h-10"
                                            onClick={() => {
                                                const text = `大切なあなたへの手紙が届いています。${unlockDate ? `\n開封予定: ${format(unlockDate, "yyyy/MM/dd")} ${unlockTime}` : ""}\n\n※解錠コードは別途お伝えします`;
                                                window.open(`https://line.me/R/share?text=${encodeURIComponent(text + "\n" + shareUrl)}`, "_blank");
                                            }}
                                        >
                                            <MessageCircle className="mr-2 h-4 w-4" />
                                            LINE
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 bg-transparent hover:bg-white/5 text-white border-white/10 h-10"
                                            onClick={() => {
                                                const subject = `大切なあなたへの手紙`;
                                                const body = `大切なあなたへの手紙が届いています。\n\n${unlockDate ? `開封予定: ${format(unlockDate, "yyyy/MM/dd")} ${unlockTime}\n\n` : ""}以下のリンクからご覧ください。\n${shareUrl}\n\n※解錠コードは別途お伝えします`;
                                                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                            }}
                                        >
                                            <Mail className="mr-2 h-4 w-4" />
                                            メール
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-white/40 hover:text-white"
                                        onClick={() => setActiveStep("step-2")}
                                    >
                                        次へ <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 2: Send Unlock Code - 1-TIME REVEAL */}
                    <AccordionItem value="step-2" className="bg-white/5 border border-white/5 rounded-xl overflow-hidden px-0">
                        <AccordionTrigger className="px-4 py-4 hover:no-underline text-white hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-white/10 text-white/70 flex items-center justify-center text-sm font-bold border border-white/10">
                                    2
                                </div>
                                <span className="font-medium">解錠コードを別経路で送る</span>
                                {codeRevealed && <span className="text-xs text-amber-400 ml-2">✓ 表示済み</span>}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 space-y-4 border-t border-white/5">
                            {!codeRevealed ? (
                                <div className="space-y-4">
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
                                        <p className="text-sm text-amber-200 font-semibold flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            1回限りの表示
                                        </p>
                                        <p className="text-xs text-amber-200/70">
                                            セキュリティのため、解錠コードはこの端末で1回のみ表示できます。<br />
                                            表示したらすぐにコピー/共有してください。
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setCodeRevealed(true)}
                                        className="w-full bg-white text-black hover:bg-white/90 h-12"
                                    >
                                        解錠コードを表示する（1回限り）
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={unlockCode}
                                            readOnly
                                            className="font-mono text-center text-lg tracking-widest bg-black/40 border-white/10 text-indigo-300 h-14"
                                        />
                                        <Button size="icon" variant="outline" onClick={handleCopyUnlockCode} className="bg-transparent border-white/10 text-white hover:bg-white/10 h-14 w-14 shrink-0">
                                            <Copy className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-white/50 text-center">
                                        リンクとは<strong>別のメッセージ</strong>で送ってください
                                    </p>
                                    <p className="text-xs text-amber-400/70 text-center">
                                        ※ このコードは画面を閉じると再表示できません。PDFにも記載されています。
                                    </p>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 3: Save Backup */}
                    <AccordionItem value="step-3" className="bg-white/5 border border-white/5 rounded-xl overflow-hidden px-0">
                        <AccordionTrigger className="px-4 py-4 hover:no-underline text-white hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-white/5 text-white/50 flex items-center justify-center text-sm font-bold border border-white/5">
                                    3
                                </div>
                                <span className="font-medium">バックアップを保管（送信者用）</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 space-y-3 border-t border-white/5">
                            <div className="p-3 bg-black/40 border border-white/5 rounded-lg">
                                <code className="text-xs break-all text-white/70">{backupShare}</code>
                            </div>
                            <p className="text-xs text-white/40">
                                解錠コードを紛失した場合の緊急復旧用。<br />
                                <strong>受取人には渡さず</strong>、安全な場所に保管してください。
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Bottom Actions */}
                <div className="flex gap-4 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate("/")}
                        className="flex-1 h-12 bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20"
                    >
                        <Home className="mr-2 h-4 w-4" />
                        ホームへ
                    </Button>
                    <Button
                        onClick={onReset}
                        className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-semibold"
                    >
                        <PenTool className="mr-2 h-4 w-4" />
                        もう1通書く
                    </Button>
                </div>
            </div>
        </div>
    );
}
