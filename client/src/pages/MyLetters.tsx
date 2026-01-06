import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  Cake, 
  GraduationCap, 
  Heart, 
  Loader2, 
  Mail, 
  PenLine,
  Lock,
  Clock,
  Trash2,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
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

const iconMap: Record<string, React.ReactNode> = {
  "10years": <Cake className="h-5 w-5" />,
  graduation: <GraduationCap className="h-5 w-5" />,
  "first-love": <Heart className="h-5 w-5" />,
};

const templateNameMap: Record<string, string> = {
  "10years": "10歳へ",
  graduation: "進学の朝に",
  "first-love": "最初に恋をした日へ",
};

export default function MyLetters() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: letters, isLoading: lettersLoading } = trpc.letter.list.useQuery();
  const deleteMutation = trpc.letter.delete.useMutation({
    onSuccess: () => {
      toast.success("手紙を削除しました");
      utils.letter.list.invalidate();
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || lettersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-semibold">マイレター</span>
            </div>
          </div>
          <Button onClick={() => navigate("/create")}>
            <PenLine className="mr-2 h-4 w-4" />
            新しい手紙
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-3xl">
        {letters && letters.length > 0 ? (
          <div className="space-y-4">
            {letters.map((letter) => (
              <Card 
                key={letter.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/letter/${letter.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        {letter.templateUsed ? (
                          iconMap[letter.templateUsed] || <Mail className="h-5 w-5" />
                        ) : (
                          <Mail className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {letter.recipientName ? `${letter.recipientName}へ` : "手紙"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {letter.templateUsed && templateNameMap[letter.templateUsed]}
                        </CardDescription>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>手紙を削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            この操作は取り消せません。暗号化されたデータも完全に削除されます。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: letter.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(letter.createdAt), "yyyy年M月d日 HH:mm", { locale: ja })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">暗号化済み</span>
                    </div>
                  </div>
                  {/* ゼロ知識設計: サーバーに本文を保存しないため、プレビューは表示しない */}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      暗号化された手紙（運営者も読めません）
                    </p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">まだ手紙がありません</h2>
                  <p className="text-muted-foreground">
                    大切な人への想いを、未来に届けましょう
                  </p>
                </div>
                <Button onClick={() => navigate("/create")}>
                  <PenLine className="mr-2 h-4 w-4" />
                  最初の手紙を書く
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
