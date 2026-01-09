import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    ArrowLeft,
    Users,
    UserPlus,
    Mail,
    Loader2,
    Crown,
    Clock,
    CheckCircle2,
    Copy,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function Family() {
    const { user, loading: authLoading } = useAuth();
    const [familyName, setFamilyName] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

    // Queries
    const { data: memberships, isLoading: membershipsLoading, refetch: refetchMemberships } =
        trpc.family.getMyFamily.useQuery(undefined, { enabled: !!user });

    // Get the first family (users can only have one family currently)
    const myFamily = memberships?.[0];

    // Get members if we have a family
    const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } =
        trpc.family.listMembers.useQuery(
            { familyId: myFamily?.familyId ?? 0 },
            { enabled: !!myFamily?.familyId }
        );

    // Get pending invites (owner only)
    const { data: invitesData, isLoading: invitesLoading, refetch: refetchInvites } =
        trpc.family.listInvites.useQuery(
            { familyId: myFamily?.familyId ?? 0 },
            { enabled: !!myFamily?.familyId && myFamily?.role === "owner" }
        );

    // Mutations
    const createFamilyMutation = trpc.family.create.useMutation({
        onSuccess: () => {
            toast.success("家族グループを作成しました");
            setFamilyName("");
            refetchMemberships();
        },
        onError: (error) => {
            toast.error("作成に失敗しました", { description: error.message });
        },
    });

    const inviteMutation = trpc.family.inviteByEmail.useMutation({
        onSuccess: (data) => {
            toast.success("招待を送信しました");
            setInviteEmail("");
            const fullUrl = `${window.location.origin}${data.inviteUrl}`;
            setLastInviteUrl(fullUrl);
            refetchInvites();
        },
        onError: (error) => {
            toast.error("招待の送信に失敗しました", { description: error.message });
        },
    });

    const handleCreateFamily = async () => {
        if (!familyName.trim()) {
            toast.error("グループ名を入力してください");
            return;
        }
        setIsCreating(true);
        try {
            await createFamilyMutation.mutateAsync({ name: familyName.trim() });
        } finally {
            setIsCreating(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            toast.error("メールアドレスを入力してください");
            return;
        }
        if (!myFamily?.familyId) {
            toast.error("家族グループが見つかりません");
            return;
        }
        setIsInviting(true);
        try {
            await inviteMutation.mutateAsync({
                familyId: myFamily.familyId,
                email: inviteEmail.trim()
            });
        } finally {
            setIsInviting(false);
        }
    };

    const handleCopyInviteUrl = async () => {
        if (!lastInviteUrl) return;
        try {
            await navigator.clipboard.writeText(lastInviteUrl);
            toast.success("招待URLをコピーしました");
        } catch {
            toast.error("コピーに失敗しました");
        }
    };

    if (authLoading || membershipsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>ログインが必要です</CardTitle>
                        <CardDescription>家族グループを管理するにはログインしてください。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/">
                            <Button>ホームに戻る</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/my-letters">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            <h1 className="text-xl font-semibold">家族グループ</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container py-8 max-w-2xl">
                <div className="space-y-6">
                    {/* No Family Yet - Create */}
                    {!myFamily && (
                        <Card>
                            <CardHeader className="text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                                    <Users className="h-8 w-8" />
                                </div>
                                <CardTitle>家族グループを作成</CardTitle>
                                <CardDescription>
                                    家族グループを作成すると、メンバー間で手紙を共有できます。
                                    招待した家族だけが「家族」タブの手紙を読めます。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="familyName">グループ名</Label>
                                    <Input
                                        id="familyName"
                                        placeholder="例: 田中家"
                                        value={familyName}
                                        onChange={(e) => setFamilyName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
                                    />
                                </div>
                                <Button
                                    onClick={handleCreateFamily}
                                    disabled={isCreating}
                                    className="w-full"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            作成中...
                                        </>
                                    ) : (
                                        <>
                                            <Users className="mr-2 h-4 w-4" />
                                            グループを作成
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Has Family - Show Details */}
                    {myFamily && (
                        <>
                            {/* Family Info */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        <CardTitle>{myFamily.familyName || "家族グループ"}</CardTitle>
                                        {myFamily.role === "owner" && (
                                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                <Crown className="h-3 w-3" />
                                                オーナー
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                            </Card>

                            {/* Members */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        メンバー
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {membersLoading ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        </div>
                                    ) : membersData?.members && membersData.members.length > 0 ? (
                                        <ul className="space-y-3">
                                            {membersData.members.map((member: any) => (
                                                <li key={member.userId} className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                        <Users className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium">{member.userName || "メンバー"}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {member.role === "owner" ? "オーナー" : "メンバー"}
                                                        </div>
                                                    </div>
                                                    {member.role === "owner" && (
                                                        <Crown className="h-4 w-4 text-amber-500" />
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-4">
                                            まだメンバーがいません
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Invite (Owner Only) */}
                            {myFamily.role === "owner" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <UserPlus className="h-4 w-4" />
                                            メンバーを招待
                                        </CardTitle>
                                        <CardDescription>
                                            メールアドレスを入力して招待を送信します。
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex gap-2">
                                            <Input
                                                type="email"
                                                placeholder="example@email.com"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                            />
                                            <Button onClick={handleInvite} disabled={isInviting}>
                                                {isInviting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Mail className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        {/* Last Invite URL */}
                                        {lastInviteUrl && (
                                            <Alert>
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                <AlertDescription className="space-y-2">
                                                    <p>招待リンクを作成しました。相手に共有してください：</p>
                                                    <div className="flex gap-2">
                                                        <code className="text-xs bg-muted p-2 rounded flex-1 break-all">
                                                            {lastInviteUrl}
                                                        </code>
                                                        <Button variant="outline" size="sm" onClick={handleCopyInviteUrl}>
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Pending Invites (Owner Only) */}
                            {myFamily.role === "owner" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            保留中の招待
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {invitesLoading ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            </div>
                                        ) : invitesData?.invites && invitesData.invites.length > 0 ? (
                                            <ul className="space-y-3">
                                                {invitesData.invites.map((invite: any) => (
                                                    <li key={invite.id} className="flex items-center gap-3 text-sm">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        <span className="flex-1">{invite.invitedEmail}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            期限: {format(new Date(invite.expiresAt), "yyyy/M/d", { locale: ja })}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-muted-foreground text-center py-4">
                                                保留中の招待はありません
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Info Card */}
                            <Card className="bg-muted/50">
                                <CardContent className="py-4">
                                    <p className="text-sm text-muted-foreground">
                                        💡 家族グループのメンバーは、「家族」スコープで作成された手紙を共有できます。
                                        手紙作成時に「家族」スコープを選択してください。
                                    </p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
