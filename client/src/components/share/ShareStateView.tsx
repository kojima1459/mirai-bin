import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShareLetterState, formatUnlockDateJST, getRelativeTimeJST } from "@/lib/shareLetterState";
import { AlertCircle, Ban, Clock, FileWarning, RefreshCw, Lock, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

interface ShareStateViewProps {
    state: ShareLetterState;
    unlockAt?: string;
    onRetry?: () => void;
}

export function ShareStateView({ state, unlockAt, onRetry }: ShareStateViewProps) {
    const handleContactSender = () => {
        const message = `未来便のリンクが開けません（エラー: ${state}）。新しいリンクを送ってください。`;
        navigator.clipboard.writeText(message).then(() => {
            toast.success("メッセージをコピーしました", { description: "送信者に連絡する際にお使いください" });
        }).catch(() => {
            toast.error("コピーできませんでした");
        });
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            toast.success("URLをコピーしました");
        }).catch(() => {
            toast.error("コピーできませんでした");
        });
    };

    const config = {
        TOKEN_NOT_FOUND: {
            icon: <HelpCircle className="h-10 w-10" />,
            title: "リンクが見つかりません",
            body: "URLが間違っているか、既に無効になっています。",
            action: (
                <div className="flex flex-col gap-3 w-full">
                    <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
                    <Button variant="ghost" onClick={onRetry}>もう一度読み込む</Button>
                </div>
            )
        },
        TOKEN_CANCELED: {
            icon: <Ban className="h-10 w-10" />, // Removed text-destructive for monochrome look
            title: "取り消されました",
            body: "この手紙の送信は取り消されています。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        TOKEN_REVOKED: {
            icon: <FileWarning className="h-10 w-10" />,
            title: "リンク無効",
            body: "安全のため、このリンクは無効化されました。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        TOKEN_ROTATED: {
            icon: <RefreshCw className="h-10 w-10" />,
            title: "リンク更新済み",
            body: "新しいリンクが発行されている可能性があります。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        NOT_YET_OPENABLE: {
            icon: <Clock className="h-10 w-10" />,
            title: "まだ開封できません",
            body: (
                <div className="space-y-6">
                    <p className="text-sm">その瞬間が来るまで、<br />大切にお預かりしています。</p>
                    {unlockAt && (
                        <div className="bg-secondary/30 py-6 px-4 rounded-xl text-center border border-border/50">
                            <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground block mb-2">Unlock Date</span>
                            <div className="text-2xl font-bold tracking-tight font-mono">{formatUnlockDateJST(unlockAt)}</div>
                            <div className="text-sm text-foreground/60 mt-2 font-medium">{getRelativeTimeJST(unlockAt)}</div>
                        </div>
                    )}
                </div>
            ),
            action: (
                <div className="flex flex-col gap-3 w-full">
                    <Button onClick={handleCopyUrl} className="w-full">URLを保存する</Button>
                    <Button variant="ghost" onClick={onRetry}>再読み込み</Button>
                </div>
            )
        },
        ALREADY_OPENED: {
            icon: <Lock className="h-10 w-10" />,
            title: "開封済みです",
            body: "セキュリティ保護のため、同じURLからは一度しかアクセスできません。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        CODE_INVALID: {
            icon: <AlertCircle className="h-10 w-10" />,
            title: "認証失敗",
            body: "解錠コードが正しくありません。<br/>12文字のコードをご確認ください。",
            action: <Button onClick={onRetry} className="w-full">再入力する</Button>
        },
        NETWORK_OR_UNKNOWN: {
            icon: <AlertCircle className="h-10 w-10" />,
            title: "読み込みエラー",
            body: "通信状況を確認して、もう一度お試しください。",
            action: <Button onClick={onRetry}>再読み込み</Button>
        },
        READY_TO_UNLOCK: { icon: null, title: "", body: null, action: null }
    }[state];

    if (!config || state === "READY_TO_UNLOCK") return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="w-full max-w-sm mx-auto text-center space-y-8">
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-secondary text-foreground flex items-center justify-center">
                        {config.icon}
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
                    <div className="text-muted-foreground leading-relaxed text-sm">
                        {config.body}
                    </div>
                </div>

                <div className="pt-4 space-y-4">
                    {config.action}

                    <div className="pt-8">
                        <Link href="/">
                            <span className="text-xs text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors border-b border-transparent hover:border-foreground/20 pb-0.5">
                                mirai-bin Top
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
