import { Button } from "@/components/ui/button";
import { ShareLetterState, formatUnlockDateJST, getRelativeTimeJST } from "@/lib/shareLetterState";
import { AlertCircle, Ban, Clock, FileWarning, RefreshCw, Lock, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { motion } from "framer-motion";

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
            icon: <HelpCircle className="h-6 w-6" />,
            title: "リンクが見つかりません",
            body: "URLが間違っているか、既に無効になっています。",
            action: (
                <div className="flex flex-col gap-3 w-full">
                    <Button variant="outline" onClick={handleContactSender} className="border-white/10 text-white hover:bg-white/5 rounded-full">送信者に確認する</Button>
                    <Button variant="ghost" onClick={onRetry} className="text-white/50 hover:text-white hover:bg-white/5 rounded-full">再読み込み</Button>
                </div>
            )
        },
        TOKEN_CANCELED: {
            icon: <Ban className="h-6 w-6" />,
            title: "取り消されました",
            body: "この手紙の送信は取り消されています。",
            action: <Button variant="outline" onClick={handleContactSender} className="border-white/10 text-white hover:bg-white/5 rounded-full w-full">送信者に確認する</Button>
        },
        TOKEN_REVOKED: {
            icon: <FileWarning className="h-6 w-6" />,
            title: "リンク無効",
            body: "安全のため、このリンクは無効化されました。",
            action: <Button variant="outline" onClick={handleContactSender} className="border-white/10 text-white hover:bg-white/5 rounded-full w-full">送信者に確認する</Button>
        },
        TOKEN_ROTATED: {
            icon: <RefreshCw className="h-6 w-6" />,
            title: "リンク更新済み",
            body: "新しいリンクが発行されている可能性があります。",
            action: <Button variant="outline" onClick={handleContactSender} className="border-white/10 text-white hover:bg-white/5 rounded-full w-full">送信者に確認する</Button>
        },
        NOT_YET_OPENABLE: {
            icon: <Lock className="h-6 w-6 text-white/70" />,
            title: "まだ開封できません",
            body: (
                <div className="space-y-8">
                    <p className="text-sm text-white/50">
                        タイムカプセルは封印されています。<br />
                        その時が来るまで、大切にお待ちください。
                    </p>
                    {unlockAt && (
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/30">
                                Unlock Date
                            </span>
                            <div className="text-3xl font-bold tracking-tight font-mono text-white/90">{formatUnlockDateJST(unlockAt)}</div>
                            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                <span className="text-xs text-white/50 font-medium">開封まで {getRelativeTimeJST(unlockAt)}</span>
                            </div>
                        </div>
                    )}
                </div>
            ),
            action: (
                <div className="flex flex-col gap-3 w-full">
                    <Button onClick={handleCopyUrl} className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold h-12">URLを保存しておく</Button>
                    <Button variant="ghost" onClick={onRetry} className="text-white/50 hover:text-white hover:bg-white/5 rounded-full">再読み込み</Button>
                </div>
            )
        },
        ALREADY_OPENED: {
            icon: <Lock className="h-6 w-6 text-white/70" />,
            title: "開封済みです",
            body: (
                <div className="space-y-4">
                    <p className="text-sm text-white/50">
                        手紙は一度しか開くことができません。<br />
                        別の端末で既に開かれた可能性があります。
                    </p>
                </div>
            ),
            action: (
                <div className="flex flex-col gap-3 w-full">
                    <Button variant="outline" onClick={handleContactSender} className="border-white/10 text-white hover:bg-white/5 rounded-full w-full">
                        送信者に確認する
                    </Button>
                </div>
            )
        },
        CODE_INVALID: {
            icon: <AlertCircle className="h-6 w-6 text-white/70" />,
            title: "コードが違います",
            body: (
                <div className="space-y-4">
                    <p className="text-sm text-white/50">
                        入力されたコードが正しくありません。<br />
                        大文字・小文字を確認してください。
                    </p>
                </div>
            ),
            action: (
                <div className="flex flex-col gap-3 w-full">
                    <Button onClick={onRetry} className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold h-12">コードを再入力</Button>
                    <Button variant="ghost" onClick={handleContactSender} className="text-white/50 hover:text-white hover:bg-white/5 rounded-full">
                        送信者に連絡する
                    </Button>
                </div>
            )
        },
        NETWORK_OR_UNKNOWN: {
            icon: <AlertCircle className="h-6 w-6" />,
            title: "読み込みエラー",
            body: "通信状況を確認して、もう一度お試しください。",
            action: <Button onClick={onRetry} className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold">再読み込み</Button>
        },
        READY_TO_UNLOCK: { icon: null, title: "", body: null, action: null }
    }[state];

    if (!config || state === "READY_TO_UNLOCK") return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505] text-white">
            {/* Background Grain Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <motion.div
                key={state}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm mx-auto text-center space-y-8 relative z-10"
            >
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 text-white/70 flex items-center justify-center backdrop-blur-sm">
                        {config.icon}
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
                    <div className="text-white/50 leading-relaxed text-sm">
                        {config.body}
                    </div>
                </div>

                <div className="pt-6 space-y-4">
                    {config.action}

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="pt-8"
                    >
                        <Link href="/">
                            <span className="text-xs text-white/30 hover:text-white cursor-pointer transition-colors border-b border-transparent hover:border-white/20 pb-0.5">
                                mirai-bin Top
                            </span>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
