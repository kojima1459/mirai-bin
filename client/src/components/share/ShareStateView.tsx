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
            icon: <HelpCircle className="h-12 w-12 text-muted-foreground" />,
            title: "リンクが見つかりません",
            body: "URLが間違っているか、既に無効になっています。",
            action: (
                <div className="flex flex-col gap-2 w-full">
                    <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
                    <Button variant="ghost" onClick={onRetry}>もう一度読み込む</Button>
                </div>
            )
        },
        TOKEN_CANCELED: {
            icon: <Ban className="h-12 w-12 text-destructive" />,
            title: "この手紙は取り消されました",
            body: "送信者が送信を取り消しています。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        TOKEN_REVOKED: {
            icon: <FileWarning className="h-12 w-12 text-amber-500" />,
            title: "このリンクは無効になっています",
            body: "安全のため、このリンクは無効化されました。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        TOKEN_ROTATED: {
            icon: <RefreshCw className="h-12 w-12 text-blue-500" />,
            title: "リンクが更新されています",
            body: "新しいリンクが発行されている可能性があります。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        NOT_YET_OPENABLE: {
            icon: <Clock className="h-12 w-12 text-primary" />,
            title: "まだ開封できません",
            body: (
                <div className="space-y-4">
                    <p>開封できる日になったら、ここから開けられます。</p>
                    {unlockAt && (
                        <div className="bg-muted p-4 rounded-lg text-center">
                            <div className="text-xl font-bold">{formatUnlockDateJST(unlockAt)}</div>
                            <div className="text-sm text-muted-foreground mt-1">{getRelativeTimeJST(unlockAt)}</div>
                        </div>
                    )}
                </div>
            ),
            action: (
                <div className="flex flex-col gap-2 w-full">
                    <Button onClick={handleCopyUrl}>URLをコピーして保存</Button>
                    <Button variant="ghost" onClick={onRetry}>再読み込み</Button>
                </div>
            )
        },
        ALREADY_OPENED: {
            icon: <Lock className="h-12 w-12 text-green-600" />,
            title: "この手紙は既に開封されています",
            body: "同じリンクからはもう一度開けない仕様です。",
            action: <Button variant="outline" onClick={handleContactSender}>送信者に確認する</Button>
        },
        CODE_INVALID: {
            icon: <AlertCircle className="h-12 w-12 text-destructive" />,
            title: "解錠コードが違うようです",
            body: "もう一度、12文字のコードを確認して入力してください。",
            action: <Button variant="outline" onClick={onRetry}>再入力</Button>
        },
        NETWORK_OR_UNKNOWN: {
            icon: <AlertCircle className="h-12 w-12 text-destructive" />,
            title: "読み込みに失敗しました",
            body: "通信状況を確認して、もう一度お試しください。",
            action: <Button onClick={onRetry}>再読み込み</Button>
        },
        READY_TO_UNLOCK: { icon: null, title: "", body: null, action: null } // Handled separately
    }[state];

    // Fallback if config is missing (Ready to unlock normally doesn't use this view)
    if (!config || state === "READY_TO_UNLOCK") return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full text-center">
                <CardHeader className="flex flex-col items-center gap-4 pb-2">
                    <div className="bg-muted/30 p-4 rounded-full">
                        {config.icon}
                    </div>
                    <CardTitle className="text-xl">{config.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-muted-foreground">
                        {config.body}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                    {config.action}
                    <div className="pt-4">
                        <Link href="/">
                            <Button variant="link" size="sm" className="text-muted-foreground">
                                Homeへ戻る
                            </Button>
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
