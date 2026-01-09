import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    Check,
    FileText,
    Share2,
    Lock,
    Copy,
    MessageCircle,
    Mail,
    ExternalLink,
    AlertTriangle,
    Loader2,
    Sparkles,
    ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";

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

    const handleCopyUnlockCode = async () => {
        await navigator.clipboard.writeText(unlockCode);
        toast.success("解錠コードをコピーしました");
        // 30秒後にクリップボードをクリア
        setTimeout(() => navigator.clipboard.writeText("").catch(() => { }), 30000);
    };

    const handleCopyShareUrl = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("リンクをコピーしました");
    };

    return (
        <Card className="border-0 md:border shadow-none md:shadow-sm overflow-hidden">
            {/* Hero Header */}
            <CardHeader className="text-center py-8 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-75 duration-500">
                    <Sparkles className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold">封緘完了</CardTitle>
                <p className="text-muted-foreground mt-2">
                    手紙は安全に暗号化されました
                </p>
            </CardHeader>

            <CardContent className="px-4 md:px-6 pb-6 space-y-6">
                {/* Summary */}
                <div className="flex flex-wrap gap-2 justify-center text-sm">
                    {recipientName && (
                        <span className="bg-muted px-3 py-1 rounded-full">{recipientName}さんへ</span>
                    )}
                    {templateName && (
                        <span className="bg-muted px-3 py-1 rounded-full">{templateName}</span>
                    )}
                    {unlockDate && (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                            {format(unlockDate, "yyyy/M/d", { locale: ja })} {unlockTime} 開封
                        </span>
                    )}
                </div>

                {/* Main CTA: PDF Export */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                        <FileText className="h-5 w-5" />
                        まずはPDFを保存
                    </div>
                    <p className="text-sm text-muted-foreground">
                        リンク・コード・バックアップを3ページに分けて出力します
                    </p>
                    <Button size="lg" className="w-full" onClick={onExportPDF} disabled={!shareUrl}>
                        <FileText className="mr-2 h-5 w-5" />
                        PDFを印刷/保存
                    </Button>
                    {!shareUrl && (
                        <p className="text-xs text-muted-foreground">
                            共有リンクを生成してからPDFを出力できます
                        </p>
                    )}
                </div>

                {/* Warning - Short & Visual */}
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span><strong>リンクとコードを同じスクショに入れない</strong></span>
                </div>

                {/* Accordion Steps */}
                <Accordion
                    type="single"
                    collapsible
                    value={activeStep}
                    onValueChange={setActiveStep}
                    className="space-y-2"
                >
                    {/* Step 1: Generate Share Link */}
                    <AccordionItem value="step-1" className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${shareUrl ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"}`}>
                                    {shareUrl ? <Check className="h-4 w-4" /> : "1"}
                                </div>
                                <span className="font-medium">共有リンクを生成</span>
                                {shareUrl && <span className="text-xs text-green-600 ml-2">✓ 完了</span>}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 space-y-3">
                            {!shareUrl ? (
                                <Button onClick={onGenerateShareLink} disabled={isGeneratingShareLink} className="w-full">
                                    {isGeneratingShareLink ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Share2 className="mr-2 h-4 w-4" />
                                    )}
                                    リンクを生成する
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Input value={shareUrl} readOnly className="text-sm bg-background" />
                                        <Button size="icon" variant="outline" onClick={handleCopyShareUrl}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 bg-[#06C755] hover:bg-[#05b34d] text-white border-0"
                                            onClick={() => {
                                                const text = `大切なあなたへの手紙が届いています。${unlockDate ? `\n開封可能日: ${format(unlockDate, "yyyy年M月d日", { locale: ja })}` : ""}\n\n※解錠コードは別途お伝えします`;
                                                window.open(`https://line.me/R/share?text=${encodeURIComponent(text + "\n" + shareUrl)}`, "_blank");
                                            }}
                                        >
                                            <MessageCircle className="mr-2 h-4 w-4" />
                                            LINE
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                const subject = `大切なあなたへの手紙`;
                                                const body = `大切なあなたへの手紙が届いています。\n\n${unlockDate ? `開封可能日: ${format(unlockDate, "yyyy年M月d日", { locale: ja })}\n\n` : ""}以下のリンクからご覧ください。\n${shareUrl}\n\n※解錠コードは別途お伝えします`;
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
                                        className="w-full text-muted-foreground"
                                        onClick={() => setActiveStep("step-2")}
                                    >
                                        次へ <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 2: Send Unlock Code */}
                    <AccordionItem value="step-2" className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                    2
                                </div>
                                <span className="font-medium">解錠コードを別経路で送る</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 space-y-3">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={unlockCode}
                                    readOnly
                                    className="font-mono text-center text-lg tracking-widest bg-background"
                                />
                                <Button size="icon" variant="outline" onClick={handleCopyUnlockCode}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                リンクとは<strong>別のメッセージ</strong>で送ってください
                            </p>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 3: Save Backup */}
                    <AccordionItem value="step-3" className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                                    3
                                </div>
                                <span className="font-medium">バックアップを保管（送信者用）</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 space-y-3">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <code className="text-xs break-all">{backupShare}</code>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                解錠コードを紛失した場合の緊急復旧用。<br />
                                <strong>受取人には渡さず</strong>、安全な場所に保管してください。
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Bottom Actions */}
                <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                        ホームへ
                    </Button>
                    <Button onClick={onReset} className="flex-1">
                        もう1通書く
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
