import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
    Users,
    Loader2,
    CheckCircle2,
    XCircle,
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
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <Loader2 className="h-8 w-8 animate-spin text-white/20" />
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-6">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-sm text-center space-y-8 relative z-10"
                >
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Users className="h-8 w-8 text-white/60" />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-2xl font-bold tracking-tighter">家族グループへの招待</h1>
                        <p className="text-white/50">招待を受け入れるにはログインが必要です</p>
                    </div>
                    <div className="space-y-3">
                        <Link href="/login">
                            <Button className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold h-14">
                                <LogIn className="mr-2 h-4 w-4" />
                                ログイン
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/5 rounded-full">
                                ホームへ
                            </Button>
                        </Link>
                    </div>
                    <p className="text-xs text-white/30">
                        ログイン後、この招待リンクをもう一度開いてください。
                    </p>
                </motion.div>
            </div>
        );
    }

    // Success state
    if (acceptResult?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-6">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-sm text-center space-y-8 relative z-10"
                >
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-green-400" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold tracking-tighter">参加しました！</h2>
                        <p className="text-white/50">
                            家族グループへの参加が完了しました。<br />
                            「家族」タブで共有された手紙を確認できます。
                        </p>
                    </div>
                    <Link href="/family">
                        <Button className="bg-white text-black hover:bg-white/90 rounded-full font-semibold h-14">
                            <Users className="mr-2 h-4 w-4" />
                            家族グループを見る
                        </Button>
                    </Link>
                    <p className="text-xs text-white/30">まもなく自動的に移動します...</p>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (acceptResult && !acceptResult.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-6">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-sm text-center space-y-8 relative z-10"
                >
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold tracking-tighter">参加できませんでした</h2>
                        <p className="text-white/50">
                            {acceptResult.error === "Invite expired"
                                ? "招待の有効期限が切れています。オーナーに再度招待を依頼してください。"
                                : acceptResult.error === "Invite not found"
                                    ? "招待が見つかりません。リンクが正しいか確認してください。"
                                    : acceptResult.error || "不明なエラーが発生しました。"}
                        </p>
                    </div>
                    <Link href="/">
                        <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-full">
                            ホームへ
                        </Button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    // Initial state - show invite
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-6">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm text-center space-y-8 relative z-10"
            >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-white/60" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-2xl font-bold tracking-tighter">家族グループへの招待</h1>
                    <p className="text-white/50">あなたは家族グループに招待されています</p>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <p className="text-sm text-white/50 leading-relaxed">
                        参加すると、グループメンバーと手紙を共有できるようになります。
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={handleAccept}
                        disabled={isAccepting}
                        className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold h-14"
                    >
                        {isAccepting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />参加中...</>
                        ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4" />参加する</>
                        )}
                    </Button>
                    <Link href="/">
                        <Button variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/5 rounded-full">
                            辞退する
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-white/30">
                    ログイン中: {user.email || user.name || "ユーザー"}
                </p>
            </motion.div>
        </div>
    );
}
