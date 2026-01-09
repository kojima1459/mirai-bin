import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
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

    const myFamily = memberships?.[0];

    const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } =
        trpc.family.listMembers.useQuery(
            { familyId: myFamily?.familyId ?? 0 },
            { enabled: !!myFamily?.familyId }
        );

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
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <Loader2 className="h-8 w-8 animate-spin text-white/20" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-6">
                <div className="text-center space-y-6">
                    <h1 className="text-2xl font-bold tracking-tighter">ログインが必要です</h1>
                    <p className="text-white/50">家族グループを管理するにはログインしてください。</p>
                    <Link href="/">
                        <Button className="bg-white text-black hover:bg-white/90 rounded-full">ホームに戻る</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
            {/* Background Grain Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full z-50 px-6 py-5 flex items-center gap-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
                <Link href="/my-letters">
                    <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/5">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-white/60" />
                    <span className="font-semibold tracking-tight">家族グループ</span>
                </div>
            </header>

            <main className="pt-28 pb-16 px-6 max-w-2xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8"
                >
                    {/* No Family Yet - Create */}
                    {!myFamily && (
                        <div className="py-16 text-center space-y-8">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Users className="h-8 w-8 text-white/50" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tighter mb-3">家族グループを作成</h2>
                                <p className="text-white/50 max-w-sm mx-auto leading-relaxed">
                                    家族グループを作成すると、メンバー間で手紙を共有できます。
                                    招待した家族だけが「家族」タブの手紙を読めます。
                                </p>
                            </div>
                            <div className="max-w-xs mx-auto space-y-4">
                                <Input
                                    placeholder="グループ名（例: 田中家）"
                                    value={familyName}
                                    onChange={(e) => setFamilyName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
                                    className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl text-center"
                                />
                                <Button
                                    onClick={handleCreateFamily}
                                    disabled={isCreating}
                                    className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold h-14"
                                >
                                    {isCreating ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />作成中...</>
                                    ) : (
                                        <><Users className="mr-2 h-4 w-4" />グループを作成</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Has Family */}
                    {myFamily && (
                        <>
                            {/* Family Info */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-white/60" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold tracking-tight">{myFamily.familyName || "家族グループ"}</h2>
                                        {myFamily.role === "owner" && (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full uppercase tracking-wider mt-1">
                                                <Crown className="h-3 w-3" />
                                                オーナー
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Members */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">Members</span>
                                </div>
                                {membersLoading ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
                                    </div>
                                ) : membersData?.members && membersData.members.length > 0 ? (
                                    <ul className="space-y-3">
                                        {membersData.members.map((member: any) => (
                                            <li key={member.userId} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                    <Users className="h-4 w-4 text-white/50" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-white">{member.userName || "メンバー"}</div>
                                                    <div className="text-xs text-white/40">
                                                        {member.role === "owner" ? "オーナー" : "メンバー"}
                                                    </div>
                                                </div>
                                                {member.role === "owner" && (
                                                    <Crown className="h-4 w-4 text-white/40" />
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-white/40 text-center py-4">まだメンバーがいません</p>
                                )}
                            </div>

                            {/* Invite (Owner Only) */}
                            {myFamily.role === "owner" && (
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserPlus className="h-4 w-4 text-white/40" />
                                        <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">Invite</span>
                                    </div>
                                    <p className="text-sm text-white/50">メールアドレスを入力して招待を送信します。</p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            placeholder="example@email.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl"
                                        />
                                        <Button onClick={handleInvite} disabled={isInviting} className="bg-white text-black hover:bg-white/90 rounded-xl h-12 px-6">
                                            {isInviting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Mail className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    {lastInviteUrl && (
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-green-400">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="text-sm font-medium">招待リンクを作成しました</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <code className="text-xs bg-white/5 p-3 rounded-lg flex-1 break-all text-white/60 font-mono">
                                                    {lastInviteUrl}
                                                </code>
                                                <Button variant="outline" size="sm" onClick={handleCopyInviteUrl} className="border-white/10 text-white hover:bg-white/5 rounded-lg">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pending Invites (Owner Only) */}
                            {myFamily.role === "owner" && (
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-white/40" />
                                        <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">Pending</span>
                                    </div>
                                    {invitesLoading ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="h-6 w-6 animate-spin text-white/20" />
                                        </div>
                                    ) : invitesData?.invites && invitesData.invites.length > 0 ? (
                                        <ul className="space-y-3">
                                            {invitesData.invites.map((invite: any) => (
                                                <li key={invite.id} className="flex items-center gap-3 text-sm p-3 rounded-xl bg-white/5">
                                                    <Mail className="h-4 w-4 text-white/40" />
                                                    <span className="flex-1 text-white/70">{invite.invitedEmail}</span>
                                                    <span className="text-xs text-white/30 font-mono">
                                                        期限: {format(new Date(invite.expiresAt), "yyyy/M/d", { locale: ja })}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-white/40 text-center py-4">保留中の招待はありません</p>
                                    )}
                                </div>
                            )}

                            {/* Info */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 text-sm text-white/40 leading-relaxed">
                                💡 家族グループのメンバーは、「家族」スコープで作成された手紙を共有できます。
                                手紙作成時に「家族」スコープを選択してください。
                            </div>
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
