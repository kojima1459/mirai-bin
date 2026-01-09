
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Send, Loader2, Sparkles, User, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
    id?: number;
    sender: "ai" | "user";
    content: string;
};

export default function Interview() {
    const { user } = useAuth();
    const [, navigate] = useLocation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Mutations
    const createSessionMutation = trpc.interview.create.useMutation();
    const sendMessageMutation = trpc.interview.sendMessage.useMutation();
    const generateDraftMutation = trpc.interview.generateDraft.useMutation();
    const historyQuery = trpc.interview.getHistory.useQuery(
        { sessionId: sessionId! },
        { enabled: !!sessionId, refetchOnWindowFocus: false }
    );

    // 初期化（セッション開始・復元）
    useEffect(() => {
        const initSession = async () => {
            try {
                const result = await createSessionMutation.mutateAsync({});
                setSessionId(result.sessionId);

                if (result.isNew && result.message) {
                    setMessages([{ sender: "ai", content: result.message }]);
                }
            } catch (e) {
                toast.error("セッションの開始に失敗しました");
                navigate("/create");
            }
        };
        initSession();
    }, []);

    // 履歴読み込み
    useEffect(() => {
        if (historyQuery.data) {
            setMessages(historyQuery.data.map(m => ({
                id: m.id,
                sender: m.sender as "ai" | "user", // DBのenum型と合わせる
                content: m.content
            })));
        }
    }, [historyQuery.data]);

    // 自動スクロール
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing]);

    // メッセージ送信
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputMessage.trim() || !sessionId || isProcessing) return;

        const currentMsg = inputMessage;
        setInputMessage("");
        setIsProcessing(true);

        // 楽観的UI更新
        setMessages(prev => [...prev, { sender: "user", content: currentMsg }]);

        try {
            const result = await sendMessageMutation.mutateAsync({
                sessionId,
                message: currentMsg,
            });

            setMessages(prev => [...prev, { sender: "ai", content: result.message }]);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "送信に失敗しました");
        } finally {
            setIsProcessing(false);
        }
    };

    // ドラフト生成
    const handleGenerateDraft = async () => {
        if (!sessionId || isProcessing) return;

        // 確認ダイアログ的な挙動が必要だが、今回はトーストで通知して実行
        toast.info("手紙の下書きを生成しています...");
        setIsProcessing(true);

        try {
            const result = await generateDraftMutation.mutateAsync({ sessionId });
            toast.success("下書きが完成しました！");
            navigate(`/create?draft=${result.draftId}`);
        } catch (err) {
            console.error(err);
            toast.error("下書き生成に失敗しました");
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans antialiased relative">
            {/* Background Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* ヘッダー */}
            <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-md px-4 py-3 sticky top-0 z-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/create")}
                        className="text-white/70 hover:text-white hover:bg-white/5 rounded-full"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <span className="font-bold text-white tracking-tight">AIインタビュアー</span>
                        <span className="text-xs text-white/50">あなたの想いを引き出します</span>
                    </div>
                </div>

                {messages.length > 3 && (
                    <Button
                        onClick={handleGenerateDraft}
                        disabled={isProcessing}
                        size="sm"
                        className="bg-white text-black hover:bg-white/90 gap-2 transition-all font-semibold rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    >
                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        手紙にする
                    </Button>
                )}
            </header>

            {/* チャットエリア */}
            <div className="flex-1 overflow-hidden relative z-10">
                <div
                    ref={scrollRef}
                    className="h-full overflow-y-auto p-4 space-y-6 pb-20 scroll-smooth"
                >
                    {messages.length === 0 && !isProcessing && (
                        <div className="flex flex-col justify-center items-center h-full text-white/30 space-y-4">
                            <Bot className="h-12 w-12 opacity-50" />
                            <p className="text-sm">AIがあなたの手紙作成をお手伝いします</p>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`flex items-end gap-3 max-w-[85%] md:max-w-[70%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    {/* アバター */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.sender === "user"
                                        ? "bg-white/10 text-white border-white/20"
                                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                        }`}>
                                        {msg.sender === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                    </div>

                                    {/* 吹き出し */}
                                    <div className={`px-5 py-3 rounded-2xl text-sm md:text-base leading-relaxed whitespace-pre-wrap shadow-sm ${msg.sender === "user"
                                        ? "bg-white text-black rounded-tr-sm"
                                        : "bg-[#1a1a1a] text-white border border-white/10 rounded-tl-sm"
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isProcessing && messages[messages.length - 1]?.sender === "user" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="flex items-end gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="bg-[#1a1a1a] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* 入力エリア */}
            <div className="border-t border-white/5 bg-[#050505] p-4 pb-safe sticky bottom-0 z-20 w-full">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center gap-2">
                    <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="想いを入力..."
                        disabled={isProcessing}
                        autoFocus
                        className="flex-1 h-12 rounded-full bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:ring-white/20 focus:border-white/20 pl-6 pr-12 transition-all"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputMessage.trim() || isProcessing}
                        className={`absolute right-1.5 h-9 w-9 rounded-full transition-all ${inputMessage.trim()
                            ? "bg-white text-black hover:bg-white/90"
                            : "bg-white/10 text-white/30"
                            }`}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
