import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Bell, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [notificationEmail, setNotificationEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 設定を取得
  const { data: settings, isLoading: settingsLoading } = trpc.user.getSettings.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 通知先メール更新
  const updateMutation = trpc.user.updateNotificationEmail.useMutation({
    onSuccess: () => {
      toast.success("通知先メールを更新しました");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error("更新に失敗しました", { description: error.message });
    },
  });

  // 初期値を設定
  useEffect(() => {
    if (settings) {
      setNotificationEmail(settings.notificationEmail || "");
    }
  }, [settings]);

  // 変更検知
  useEffect(() => {
    if (settings) {
      const original = settings.notificationEmail || "";
      setHasChanges(notificationEmail !== original);
    }
  }, [notificationEmail, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 空文字の場合はnullを送信（アカウントメールを使用）
      const emailToSave = notificationEmail.trim() || null;
      await updateMutation.mutateAsync({ notificationEmail: emailToSave });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || settingsLoading) {
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
            <CardDescription>設定を変更するにはログインしてください。</CardDescription>
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
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">設定</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8 max-w-2xl">
        <div className="space-y-6">
          {/* アカウント情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                アカウント情報
              </CardTitle>
              <CardDescription>
                ログインに使用しているアカウントの情報です。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">名前</Label>
                <p className="font-medium">{user.name || "未設定"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">アカウントメール</Label>
                <p className="font-medium">{settings?.accountEmail || "未設定"}</p>
              </div>
            </CardContent>
          </Card>

          {/* 通知設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知設定
              </CardTitle>
              <CardDescription>
                手紙が開封されたときなどの通知を受け取るメールアドレスを設定できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notificationEmail">通知先メールアドレス</Label>
                <Input
                  id="notificationEmail"
                  type="email"
                  placeholder={settings?.accountEmail || "example@email.com"}
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  空欄の場合、アカウントメール（{settings?.accountEmail || "未設定"}）に通知が届きます。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : hasChanges ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      変更を保存
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      保存済み
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 通知の種類 */}
          <Card>
            <CardHeader>
              <CardTitle>通知される内容</CardTitle>
              <CardDescription>
                以下のイベントが発生したときに通知が届きます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  手紙が初めて開封されたとき
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                ※ 通知には宛先と開封日時のみが含まれます。本文はゼロ知識設計のため、運営者も読めません。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
