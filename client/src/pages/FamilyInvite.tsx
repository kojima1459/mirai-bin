import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    LogIn
} from "lucide-react";
import { toast } from "sonner";

export default function FamilyInvite() {
    const params = useParams<{ token: string }>();
    const [, navigate] = useLocation();
    const { user, loading: authLoading } = useAuth();
    const token = params.token || "";

    const [isAccepting, setIsAccepting] = useState(false);
    const [acceptResult, setAcceptResult] = useState<{ success: boolean; error?: string } | null>(null);

    // Mutation
    const acceptInviteMutation = trpc.family.acceptInvite.useMutation({
        onSuccess: (data) => {
            setAcceptResult(data);
            if (data.success) {
                toast.success("家族グループに参加しました！");
            }
        },
        onError: (error) => {
            setAcceptResult({ success: false, error: error.message });
        },
    });

    const handleAccept = async () => {
        if (!token) {
            toast.error("無効な招待リンクです");
            return;
        }
        setIsAccepting(true);
        try {
            await acceptInviteMutation.mutateAsync({ token });
        } finally {
            setIsAccepting(false);
        }
    };

    // Auto-navigate to family page after success
    useEffect(() => {
        if (acceptResult?.success) {
            const timer = setTimeout(() => {
                navigate("/family");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [acceptResult?.success, navigate]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8" />
                        </div>
                        <CardTitle>家族グループへの招待</CardTitle>
                        <CardDescription>
                            招待を受け入れるにはログインが必要です
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            ログイン後、この招待リンクをもう一度開いてください。
                        </p>
                        <Link href="/login">
                            <Button className="w-full">
                                <LogIn className="mr-2 h-4 w-4" />
                                ログイン
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost" className="w-full">
                                ホームへ
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state
    if (acceptResult?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="py-12">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold">参加しました！</h2>
                            <p className="text-muted-foreground">
                                家族グループへの参加が完了しました。
                                「家族」タブで共有された手紙を確認できます。
                            </p>
                            <div className="pt-4">
                                <Link href="/family">
                                    <Button>
                                        <Users className="mr-2 h-4 w-4" />
                                        家族グループを見る
                                    </Button>
                                </Link>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                まもなく自動的に移動します...
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (acceptResult && !acceptResult.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="py-12">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                                <XCircle className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold">参加できませんでした</h2>
                            <p className="text-muted-foreground">
                                {acceptResult.error === "Invite expired"
                                    ? "招待の有効期限が切れています。オーナーに再度招待を依頼してください。"
                                    : acceptResult.error === "Invite not found"
                                        ? "招待が見つかりません。リンクが正しいか確認してください。"
                                        : acceptResult.error || "不明なエラーが発生しました。"}
                            </p>
                            <div className="pt-4 flex flex-col gap-2">
                                <Link href="/">
                                    <Button variant="outline" className="w-full">
                                        ホームへ
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Initial state - show invite
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8" />
                    </div>
                    <CardTitle>家族グループへの招待</CardTitle>
                    <CardDescription>
                        あなたは家族グループに招待されています
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-muted rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                            参加すると、グループメンバーと手紙を共有できるようになります。
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full"
                        >
                            {isAccepting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    参加中...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    参加する
                                </>
                            )}
                        </Button>
                        <Link href="/">
                            <Button variant="ghost" className="w-full">
                                辞退する
                            </Button>
                        </Link>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        ログイン中: {user.email || user.name || "ユーザー"}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
