import { ShareLetterError, ShareLetterErrorType } from "@/lib/shareLetterErrors";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Clock,
    KeyRound,
    AlertCircle,
    MailOpen,
    Link2Off,
    WifiOff,
    Home,
    RefreshCw,
    MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface ShareLetterErrorDisplayProps {
    error: ShareLetterError;
    onRetry?: () => void;
    onNavigateHome?: () => void;
    countdown?: string; // For NOT_YET_OPENABLE
}

export function ShareLetterErrorDisplay({
    error,
    onRetry,
    onNavigateHome,
    countdown
}: ShareLetterErrorDisplayProps) {
    // NOT_YET_OPENABLE
    if (error.type === ShareLetterErrorType.NOT_YET_OPENABLE && error.unlockDate) {
        return (
            <Card className="max-w-md w-full">
                <CardContent className="py-12">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                            <Clock className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold">まだ開封できません</h2>
                        <div className="bg-muted rounded-lg p-6 space-y-4">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm">開封可能日時</span>
                            </div>
                            <div className="text-lg font-medium">
                                {format(error.unlockDate, "yyyy年M月d日 HH:mm", { locale: ja })}
                            </div>
                            {countdown && (
                                <div className="text-3xl font-bold text-primary">
                                    {countdown}
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">
                                あなたへの想いが届くまで、もう少しお待ちください
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // CODE_INVALID
    if (error.type === ShareLetterErrorType.CODE_INVALID) {
        return (
            <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-4">
                    <div>
                        <p className="font-semibold mb-1">解錠コードが正しくありません</p>
                        <p className="text-sm">入力したコードを確認してください。ハイフンは不要です。</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={onRetry} className="w-full">
                            <KeyRound className="mr-2 h-4 w-4" />
                            もう一度入力する
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            コードが分からない場合は、送信者に確認してください
                        </p>
                    </div>
                </AlertDescription>
            </Alert>
        );
    }

    // ALREADY_OPENED
    if (error.type === ShareLetterErrorType.ALREADY_OPENED) {
        return (
            <Card className="max-w-md w-full">
                <CardContent className="py-12">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                            <MailOpen className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold">この手紙は開封済みです</h2>
                        <p className="text-muted-foreground">
                            セキュリティのため、再度開封することはできません。
                        </p>
                        <div className="pt-4">
                            <Button variant="outline" onClick={onNavigateHome}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                送信者に再共有を依頼
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            手紙の内容を再度確認したい場合は、送信者に連絡してください
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // TOKEN_INVALID_OR_EXPIRED
    if (error.type === ShareLetterErrorType.TOKEN_INVALID_OR_EXPIRED) {
        return (
            <Card className="max-w-md w-full">
                <CardContent className="py-12">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <Link2Off className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-bold">リンクが無効です</h2>
                        <p className="text-muted-foreground">
                            手紙が削除されたか、リンクが間違っている可能性があります。
                        </p>
                        <div className="flex flex-col gap-2 pt-4">
                            <Button variant="outline" onClick={onNavigateHome}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                送信者に確認する
                            </Button>
                            <Button variant="ghost" onClick={onNavigateHome}>
                                <Home className="mr-2 h-4 w-4" />
                                ホームへ
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // NETWORK_OR_SERVER
    if (error.type === ShareLetterErrorType.NETWORK_OR_SERVER) {
        return (
            <Card className="max-w-md w-full">
                <CardContent className="py-12">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                            <WifiOff className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold">接続に失敗しました</h2>
                        <p className="text-muted-foreground">
                            ネットワークが不安定か、サーバーが混雑している可能性があります。
                        </p>
                        <div className="flex flex-col gap-2 pt-4">
                            <Button onClick={onRetry}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                再試行
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                問題が続く場合は、しばらく待ってから試してください
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // UNKNOWN (fallback)
    return (
        <Card className="max-w-md w-full">
            <CardContent className="py-12">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                        <AlertCircle className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold">エラーが発生しました</h2>
                    <p className="text-muted-foreground">
                        予期しないエラーが発生しました。しばらく経ってからもう一度お試しください。
                    </p>
                    {error.detail && (
                        <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                            {error.detail}
                        </p>
                    )}
                    <div className="flex flex-col gap-2 pt-4">
                        <Button variant="outline" onClick={onRetry}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            再試行
                        </Button>
                        <Button variant="ghost" onClick={onNavigateHome}>
                            <Home className="mr-2 h-4 w-4" />
                            ホームへ
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
