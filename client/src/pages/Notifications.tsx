import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
    ArrowLeft,
    Bell,
    Mail,
    CheckCheck,
    ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function Notifications() {
    const { loading: authLoading, isAuthenticated, user } = useAuth();
    const [, navigate] = useLocation();

    const { data, isLoading, refetch } = trpc.notification.list.useQuery(
        { limit: 50, offset: 0 },
        { enabled: !!user }
    );

    const markReadMutation = trpc.notification.markRead.useMutation({
        onSuccess: () => refetch(),
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate("/login");
        }
    }, [authLoading, isAuthenticated, navigate]);

    const handleMarkAllRead = () => {
        markReadMutation.mutate({});
    };

    const handleMarkRead = (id: number) => {
        markReadMutation.mutate({ notificationId: id });
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] text-white">
                <header className="fixed top-0 w-full z-50 px-6 py-5 flex justify-between items-center border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
                    <Skeleton className="h-8 w-32 bg-white/5" />
                </header>
                <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto">
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    const notifications = data?.notifications ?? [];
    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full z-50 px-6 py-5 flex justify-between items-center border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/")}
                        className="rounded-full text-white/70 hover:text-white hover:bg-white/5"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold tracking-tight">通知</span>
                    {unreadCount > 0 && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                            {unreadCount}件未読
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        className="text-white/50 hover:text-white hover:bg-white/5 rounded-full"
                    >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        すべて既読
                    </Button>
                )}
            </header>

            <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {notifications.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Bell className="h-8 w-8 text-white/30" />
                            </div>
                            <h2 className="text-xl font-bold mb-3 text-white">
                                通知はまだありません
                            </h2>
                            <p className="text-white/40 max-w-sm mx-auto">
                                開封日が近づくとお知らせが届きます
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => {
                                const meta = notification.meta
                                    ? JSON.parse(notification.meta)
                                    : {};
                                const isUnread = !notification.readAt;

                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => {
                                            if (isUnread) handleMarkRead(notification.id);
                                            if (meta.letterId) navigate(`/letter/${meta.letterId}`);
                                        }}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${isUnread
                                                ? "bg-white/5 border-white/20 hover:bg-white/10"
                                                : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={`p-2 rounded-lg ${isUnread ? "bg-white/10" : "bg-white/5"
                                                    }`}
                                            >
                                                <Mail
                                                    className={`h-5 w-5 ${isUnread ? "text-white" : "text-white/40"
                                                        }`}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3
                                                        className={`font-medium truncate ${isUnread ? "text-white" : "text-white/70"
                                                            }`}
                                                    >
                                                        {notification.title}
                                                    </h3>
                                                    {isUnread && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-white/50 line-clamp-2">
                                                    {notification.body}
                                                </p>
                                                <p className="text-xs text-white/30 mt-2">
                                                    {format(
                                                        new Date(notification.createdAt),
                                                        "yyyy/MM/dd HH:mm",
                                                        { locale: ja }
                                                    )}
                                                </p>
                                            </div>
                                            {meta.letterId && (
                                                <ExternalLink className="h-4 w-4 text-white/20 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
