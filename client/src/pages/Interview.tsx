
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Send, Loader2, Sparkles, User, Bot, FileText } from "lucide-react";
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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* ヘッダー */}
            <header className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/create")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800">AIインタビュアー</span>
                        <span className="text-xs text-slate-500">あなたの想いを引き出します</span>
                    </div>
                </div>

                {messages.length > 3 && (
                    <Button
                        onClick={handleGenerateDraft}
                        disabled={isProcessing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        手紙にする
                    </Button>
                )}
            </header>

            {/* チャットエリア */}
            <div className="flex-1 overflow-hidden relative">
                <div
                    ref={scrollRef}
                    className="h-full overflow-y-auto p-4 space-y-4 pb-20 scroll-smooth"
                >
                    {messages.length === 0 && !isProcessing && (
                        <div className="flex justify-center items-center h-full text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin" />
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
                                <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    {/* アバター */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === "user" ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                        }`}>
                                        {msg.sender === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                    </div>

                                    {/* 吹き出し */}
                                    <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap ${msg.sender === "user"
                                            ? "bg-indigo-600 text-white rounded-tr-none"
                                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
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
                            <div className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* 入力エリア */}
            <div className="bg-white border-t p-4 pb-safe sticky bottom-0 z-10 w-full">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center gap-2">
                    <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="メッセージを入力..."
                        disabled={isProcessing}
                        autoFocus
                        className="flex-1 h-12 rounded-full border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 pl-4 pr-12 shadow-sm"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputMessage.trim() || isProcessing}
                        className={`absolute right-1.5 h-9 w-9 rounded-full transition-all ${inputMessage.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-200"
                            }`}
                    >
                        <Send className="h-4 w-4 text-white" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
