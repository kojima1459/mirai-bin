import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";

import { ArrowLeft, FileEdit, Loader2, PenLine, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

const stepLabels: Record<string, string> = {
  template: "テンプレート選択",
  recording: "録音中",
  transcribing: "文字起こし中",
  generating: "AI生成中",
  editing: "編集中",
  encrypting: "暗号化中",
};

export default function Drafts() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: drafts, isLoading, refetch } = trpc.draft.list.useQuery();
  const deleteDraftMutation = trpc.draft.delete.useMutation();

  // 認証チェック
  if (!authLoading && !isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDraftMutation.mutateAsync({ id });
      toast.success("下書きを削除しました");
      refetch();
    } catch (error) {
      toast.error("削除に失敗しました");
    }
  };

  const handleContinue = (id: number) => {
    navigate(`/create?draft=${id}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
      {/* Background Grain Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Header - LP style */}
      <header className="fixed top-0 w-full z-50 px-6 py-5 flex justify-between items-center border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/">
            <div className="text-xl font-bold tracking-tighter cursor-pointer">mirai-bin</div>
          </Link>
        </div>
        <nav className="flex gap-6 items-center text-sm font-medium">
          <Link href="/my-letters">
            <span className="cursor-pointer hover:opacity-70 transition-opacity">マイレター</span>
          </Link>
          <span className="text-white/40">{user?.name || "ゲスト"}</span>
        </nav>
      </header>

      <main className="pt-28 pb-16 px-6 max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Page Header */}
          <div className="flex items-center gap-6 mb-16">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/5">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block mb-2">Drafts</span>
              <h1 className="text-3xl font-bold tracking-tighter">下書き一覧</h1>
              <p className="text-white/50 mt-2">作成途中の手紙を続きから編集できます</p>
            </div>
          </div>

          {drafts && drafts.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
                <FileEdit className="h-8 w-8 text-white/40" />
              </div>
              <p className="text-white/40 mb-8 text-lg">下書きはありません</p>
              <Link href="/create">
                <Button className="bg-white text-black hover:bg-white/90 rounded-full font-semibold px-8 py-6 text-base">
                  <PenLine className="mr-2 h-4 w-4" />
                  新しい手紙を書く
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts?.map((draft, index) => (
                <motion.div
                  key={draft.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-white mb-1">
                        {draft.recipientName ? `${draft.recipientName}への手紙` : "宛先未設定の手紙"}
                      </h3>
                      <p className="text-sm text-white/40">
                        {draft.templateName || "テンプレート未選択"}
                      </p>
                    </div>
                    <span className="text-[10px] px-3 py-1 bg-white/10 text-white/60 rounded-full uppercase tracking-wider font-medium">
                      {stepLabels[draft.currentStep] || draft.currentStep}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="text-xs text-white/30 font-mono">
                      最終更新: {format(new Date(draft.updatedAt), "yyyy/MM/dd HH:mm", { locale: ja })}
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-white/30 hover:text-red-400 hover:bg-white/5 rounded-full">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>下書きを削除しますか？</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/50">
                              この操作は取り消せません。下書きの内容は完全に削除されます。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5 rounded-full">キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(draft.id)}
                              className="bg-red-500 text-white hover:bg-red-600 rounded-full"
                            >
                              削除する
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        onClick={() => handleContinue(draft.id)}
                        className="bg-white text-black hover:bg-white/90 rounded-full font-semibold"
                      >
                        続きを書く
                      </Button>
                    </div>
                  </div>

                  {/* プレビュー */}
                  {draft.finalContent && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">
                        {draft.finalContent}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
