import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Bell, Save, Loader2, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [notificationEmail, setNotificationEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasEmailChanges, setHasEmailChanges] = useState(false);

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

  // アカウントメール更新
  const updateEmailMutation = trpc.user.updateEmail.useMutation({
    onSuccess: () => {
      toast.success("アカウントメールを更新しました");
      setHasEmailChanges(false);
      window.location.reload();
    },
    onError: (error) => {
      toast.error("更新に失敗しました", { description: error.message });
    },
  });

  // 初期値を設定
  useEffect(() => {
    if (settings) {
      setNotificationEmail(settings.notificationEmail || "");
      setAccountEmail(settings.accountEmail || "");
    }
  }, [settings]);

  // 変更検知
  useEffect(() => {
    if (settings) {
      const original = settings.notificationEmail || "";
      setHasChanges(notificationEmail !== original);

      const originalEmail = settings.accountEmail || "";
      setHasEmailChanges(accountEmail !== originalEmail && accountEmail.trim() !== "");
    }
  }, [notificationEmail, accountEmail, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const emailToSave = notificationEmail.trim() || null;
      await updateMutation.mutateAsync({ notificationEmail: emailToSave });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!accountEmail.trim()) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    setIsSaving(true);
    try {
      await updateEmailMutation.mutateAsync({ newEmail: accountEmail.trim() });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || settingsLoading) {
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
          <h1 className="text-2xl font-bold">ログインが必要です</h1>
          <p className="text-white/50">設定を変更するにはログインしてください。</p>
          <Link href="/">
            <Button className="bg-white text-black hover:bg-white/90 rounded-full">ホームに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Background Grain Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-6 py-5 flex items-center gap-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/5">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">設定</h1>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* アカウント情報 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold">アカウント情報</h2>
                <p className="text-xs text-white/40">ログインに使用しているアカウントの情報です。</p>
              </div>
            </div>

            <div>
              <Label className="text-white/40 text-sm">名前</Label>
              <p className="font-medium text-white mt-1">{user.name || "未設定"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountEmail" className="text-sm">アカウントメール</Label>
              <Input
                id="accountEmail"
                type="email"
                placeholder="example@email.com"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl h-12"
              />
              <p className="text-xs text-white/30">
                ログインに使用するメールアドレスです。変更後は新しいメールでログインしてください。
              </p>
            </div>

            <Button
              onClick={handleUpdateEmail}
              disabled={isSaving || !hasEmailChanges}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 rounded-full"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />更新中...</>
              ) : hasEmailChanges ? (
                <><Save className="mr-2 h-4 w-4" />メールを変更</>
              ) : (
                <><Check className="mr-2 h-4 w-4" />保存済み</>
              )}
            </Button>
          </div>

          {/* 通知設定 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold">通知設定</h2>
                <p className="text-xs text-white/40">手紙が開封されたときなどの通知を受け取るメールアドレス</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notificationEmail" className="text-sm">通知先メールアドレス</Label>
              <Input
                id="notificationEmail"
                type="email"
                placeholder={settings?.accountEmail || "example@email.com"}
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl h-12"
              />
              <p className="text-xs text-white/30">
                空欄の場合、アカウントメール（{settings?.accountEmail || "未設定"}）に通知が届きます。
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-white text-black hover:bg-white/90 rounded-full"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</>
              ) : hasChanges ? (
                <><Save className="mr-2 h-4 w-4" />変更を保存</>
              ) : (
                <><Check className="mr-2 h-4 w-4" />保存済み</>
              )}
            </Button>
          </div>

          {/* 通知の種類 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold">通知される内容</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 text-white/70">
                <Check className="h-4 w-4 text-green-400" />
                手紙が初めて開封されたとき
              </li>
            </ul>
            <p className="text-xs text-white/30">
              ※ 通知には宛先と開封日時のみが含まれます。本文はゼロ知識設計のため、運営者も読めません。
            </p>
          </div>

          {/* 家族グループ */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold">家族グループ</h2>
                <p className="text-xs text-white/40">家族グループを作成して、メンバーと手紙を共有できます。</p>
              </div>
            </div>
            <Link href="/family">
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 rounded-full">
                <Users className="mr-2 h-4 w-4" />
                家族グループを管理
              </Button>
            </Link>
          </div>

          {/* アカウント引き継ぎ */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold">アカウント引き継ぎ・復旧</h2>
                <p className="text-xs text-white/40">アカウントを失うと手紙が開封できなくなる可能性があります。</p>
              </div>
            </div>
            <Link href="/account-recovery">
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 rounded-full">
                <Users className="mr-2 h-4 w-4" />
                引き継ぎ手順を見る
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
