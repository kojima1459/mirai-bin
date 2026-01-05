import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getLoginUrl } from "@/const";
import { ArrowLeft, FileEdit, Loader2, Mail, Trash2 } from "lucide-react";
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
    window.location.href = getLoginUrl();
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">未来便</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/my-letters">
              <Button variant="ghost">マイレター</Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {user?.name || "ゲスト"}
            </span>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">下書き一覧</h1>
            <p className="text-muted-foreground">作成途中の手紙を続きから編集できます</p>
          </div>
        </div>

        {drafts && drafts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileEdit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">下書きはありません</p>
              <Link href="/create">
                <Button>新しい手紙を書く</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {drafts?.map((draft) => (
              <Card key={draft.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {draft.recipientName ? `${draft.recipientName}への手紙` : "宛先未設定の手紙"}
                      </CardTitle>
                      <CardDescription>
                        {draft.templateName || "テンプレート未選択"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                        {stepLabels[draft.currentStep] || draft.currentStep}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      最終更新: {format(new Date(draft.updatedAt), "yyyy年M月d日 HH:mm", { locale: ja })}
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>下書きを削除しますか？</AlertDialogTitle>
                            <AlertDialogDescription>
                              この操作は取り消せません。下書きの内容は完全に削除されます。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(draft.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              削除する
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button onClick={() => handleContinue(draft.id)}>
                        続きを書く
                      </Button>
                    </div>
                  </div>
                  
                  {/* プレビュー */}
                  {draft.finalContent && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {draft.finalContent}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
