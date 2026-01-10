import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Bell, Save, Loader2, Check, Users, Shield, Clock, AlertCircle, CheckCircle2, Smartphone, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [notificationEmail, setNotificationEmail] = useState("");
  const [trustedContactEmail, setTrustedContactEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasTrustedChanges, setHasTrustedChanges] = useState(false);
  const [hasEmailChanges, setHasEmailChanges] = useState(false);
  const [hasReminderChanges, setHasReminderChanges] = useState(false);

  // PWA install hook
  const pwa = usePWAInstall();

  // 設定を取得
  const { data: settings, isLoading: settingsLoading } = trpc.user.getSettings.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 通知先メール更新
  const updateMutation = trpc.user.updateNotificationEmail.useMutation({
    onSuccess: (data) => {
      if (data.requiresVerification) {
        toast.success("確認メールを送信しました", {
          description: "メール内のリンクをクリックして認証を完了してください",
        });
      } else {
        toast.success("通知先メールを更新しました");
      }
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

  // 信頼できる通知先更新
  const updateTrustedMutation = trpc.user.updateTrustedContactEmail.useMutation({
    onSuccess: () => {
      toast.success("信頼できる通知先を更新しました");
      setHasTrustedChanges(false);
    },
    onError: (error) => {
      toast.error("更新に失敗しました", { description: error.message });
    },
  });

  // リマインド通知設定更新
  const updateReminderMutation = trpc.user.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast.success("リマインド設定を更新しました");
      setHasReminderChanges(false);
    },
    onError: (error) => {
      toast.error("更新に失敗しました", { description: error.message });
    },
  });

  // 初期値を設定
  useEffect(() => {
    if (settings) {
      setNotificationEmail(settings.notificationEmail || "");
      setTrustedContactEmail(settings.trustedContactEmail || "");
      setAccountEmail(settings.accountEmail || "");
      setNotifyEnabled(settings.notifyEnabled ?? true);
      setNotifyDaysBefore(settings.notifyDaysBefore ?? 7);
    }
  }, [settings]);

  // 変更検知
  useEffect(() => {
    if (settings) {
      const original = settings.notificationEmail || "";
      setHasChanges(notificationEmail !== original);

      const originalTrusted = settings.trustedContactEmail || "";
      setHasTrustedChanges(trustedContactEmail !== originalTrusted);

      const originalEmail = settings.accountEmail || "";
      setHasEmailChanges(accountEmail !== originalEmail && accountEmail.trim() !== "");

      // リマインド設定の変更検知
      const originalEnabled = settings.notifyEnabled ?? true;
      const originalDays = settings.notifyDaysBefore ?? 7;
      setHasReminderChanges(notifyEnabled !== originalEnabled || notifyDaysBefore !== originalDays);
    }
  }, [notificationEmail, trustedContactEmail, accountEmail, notifyEnabled, notifyDaysBefore, settings]);

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

  const handleSaveTrusted = async () => {
    setIsSaving(true);
    try {
      const emailToSave = trustedContactEmail.trim() || null;
      await updateTrustedMutation.mutateAsync({ trustedContactEmail: emailToSave });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReminder = async () => {
    setIsSaving(true);
    try {
      await updateReminderMutation.mutateAsync({ notifyEnabled, notifyDaysBefore });
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
          {/* アカウント・セキュリティ */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-white/40 tracking-wider px-2">ACCOUNT & SECURITY</h2>

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
                  ログインに使用するメールアドレスです。変更後は再ログインが必要です。
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

            {/* アカウント引き継ぎ */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white/60" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">アカウント引き継ぎ・復旧</h2>
                  <p className="text-xs text-white/40">端末紛失時に備えて設定を確認してください。</p>
                </div>
              </div>
              <Link href="/account-recovery">
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 rounded-full">
                  <Users className="mr-2 h-4 w-4" />
                  引き継ぎ手順を見る
                </Button>
              </Link>
            </div>
          </section>

          {/* アプリインストール */}
          {(pwa.canInstall || pwa.isIOS) && !pwa.isInstalled && (
            <section className="space-y-4 pt-4">
              <h2 className="text-xs font-bold text-white/40 tracking-wider px-2">APP</h2>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Download className="h-5 w-5 text-white/60" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">アプリをインストール</h2>
                    <p className="text-xs text-white/40">ホーム画面に追加してすばやくアクセス</p>
                  </div>
                </div>

                {pwa.canInstall ? (
                  <Button
                    onClick={async () => {
                      const success = await pwa.promptInstall();
                      if (success) {
                        toast.success("アプリをインストールしました！");
                      }
                    }}
                    className="w-full bg-white text-black hover:bg-white/90 rounded-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    ホーム画面に追加
                  </Button>
                ) : pwa.isIOS ? (
                  <div className="bg-white/5 rounded-lg p-4 text-sm text-white/60">
                    <p className="mb-2">iOSでインストールするには：</p>
                    <ol className="list-decimal pl-4 space-y-1 text-xs">
                      <li>Safariの共有ボタン（下部の□↑）をタップ</li>
                      <li>「ホーム画面に追加」を選択</li>
                    </ol>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {/* 通知設定セクション */}
          <section className="space-y-4 pt-4">
            <h2 className="text-xs font-bold text-white/40 tracking-wider px-2">NOTIFICATIONS</h2>

            {/* 通知設定 */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-white/60" />
                </div>
                <div>
                  <h2 className="font-semibold">自分への通知</h2>
                  <p className="text-xs text-white/40">手紙が開封されたときなどの通知先</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="notificationEmail" className="text-sm">通知先メールアドレス</Label>
                  {notificationEmail && settings?.notificationEmailVerified ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />認証済み
                    </Badge>
                  ) : notificationEmail ? (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />未認証
                    </Badge>
                  ) : null}
                </div>
                <Input
                  id="notificationEmail"
                  type="email"
                  placeholder={settings?.accountEmail || "example@email.com"}
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl h-12"
                />
                {notificationEmail && !settings?.notificationEmailVerified && (
                  <p className="text-xs text-yellow-400/80">
                    ※ 認証が完了するまでメール通知は送信されません。アプリ内通知には届きます。
                  </p>
                )}
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

            {/* プッシュ通知 */}
            <PushNotificationSection />

            {/* 信頼できる通知先 */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white/60" />
                </div>
                <div>
                  <h2 className="font-semibold">信頼できる通知先</h2>
                  <p className="text-xs text-white/40">配偶者など、あなたに何かあったときに通知を受け取る人</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trustedContactEmail" className="text-sm">信頼できる通知先メール</Label>
                <Input
                  id="trustedContactEmail"
                  type="email"
                  placeholder="spouse@email.com"
                  value={trustedContactEmail}
                  onChange={(e) => setTrustedContactEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl h-12"
                />
                <p className="text-xs text-white/30">
                  この人にもリマインドや開封通知が届きます（手紙の本文は含まれません）。
                </p>
              </div>

              <Button
                onClick={handleSaveTrusted}
                disabled={isSaving || !hasTrustedChanges}
                className="bg-white text-black hover:bg-white/90 rounded-full"
              >
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</>
                ) : hasTrustedChanges ? (
                  <><Save className="mr-2 h-4 w-4" />変更を保存</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" />保存済み</>
                )}
              </Button>
            </div>

            {/* リマインド設定 */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white/60" />
                </div>
                <div>
                  <h2 className="font-semibold">開封日のお知らせ</h2>
                  <p className="text-xs text-white/40">開封日が近づいたらメールでお知らせします</p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="space-y-1">
                  <Label htmlFor="notifyEnabled" className="text-sm font-medium">通知を受け取る</Label>
                  <p className="text-xs text-white/40">開封日前にリマインドメールを送信</p>
                </div>
                <Switch
                  id="notifyEnabled"
                  checked={notifyEnabled}
                  onCheckedChange={setNotifyEnabled}
                />
              </div>

              {notifyEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="notifyDaysBefore" className="text-sm">何日前に通知</Label>
                  <Select
                    value={String(notifyDaysBefore)}
                    onValueChange={(v) => setNotifyDaysBefore(Number(v))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                      <SelectValue placeholder="選択..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-white/10">
                      <SelectItem value="1">1日前</SelectItem>
                      <SelectItem value="3">3日前</SelectItem>
                      <SelectItem value="7">7日前</SelectItem>
                      <SelectItem value="30">30日前</SelectItem>
                      <SelectItem value="90">90日前</SelectItem>
                      <SelectItem value="365">1年前</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-white/30">
                    通知には本文は含まれません。解錠コードも送信されません。
                  </p>
                </div>
              )}

              <Button
                onClick={handleSaveReminder}
                disabled={isSaving || !hasReminderChanges}
                className="bg-white text-black hover:bg-white/90 rounded-full"
              >
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</>
                ) : hasReminderChanges ? (
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
          </section>

          {/* その他 */}
          <section className="space-y-4 pt-4">
            <h2 className="text-xs font-bold text-white/40 tracking-wider px-2">OTHERS</h2>

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
          </section>        </motion.div>
      </main>
    </div>
  );
}

/**
 * Push notification section component
 */
function PushNotificationSection() {
  const push = usePushNotifications();

  const handleToggle = async () => {
    const success = await push.toggle();
    if (success) {
      if (push.isSubscribed) {
        toast.success("プッシュ通知を無効にしました");
      } else {
        toast.success("プッシュ通知を有効にしました");
      }
    } else if (push.error) {
      toast.error("設定に失敗しました", { description: push.error });
    }
  };

  // Not supported at all
  if (!push.isSupported) {
    return (
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white/40" />
          </div>
          <div>
            <h2 className="font-semibold text-white/50">プッシュ通知</h2>
            <p className="text-xs text-white/30">このブラウザはプッシュ通知に対応していません</p>
          </div>
        </div>
      </div>
    );
  }

  // iOS but not installed as PWA
  if (push.needsPWAInstall) {
    return (
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold">プッシュ通知</h2>
            <p className="text-xs text-white/40">ホーム画面への追加が必要です</p>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-sm text-amber-200 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              iOSでプッシュ通知を受け取るには、このアプリをホーム画面に追加してください。
              <br />
              <strong>Safari → 共有ボタン → ホーム画面に追加</strong>
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Server not configured
  if (!push.isConfigured) {
    return (
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white/40" />
          </div>
          <div>
            <h2 className="font-semibold text-white/50">プッシュ通知</h2>
            <p className="text-xs text-white/30">現在準備中です</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-white/60" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">プッシュ通知</h2>
          <p className="text-xs text-white/40">リマインドなどをプッシュ通知で受け取る</p>
        </div>
        <Switch
          checked={push.isSubscribed}
          onCheckedChange={handleToggle}
          disabled={push.isLoading}
        />
      </div>

      {push.permission === "denied" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-200">
            通知がブロックされています。ブラウザの設定から通知を許可してください。
          </p>
        </div>
      )}

      {push.isSubscribed && (
        <p className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          プッシュ通知が有効です
        </p>
      )}

      <p className="text-xs text-white/30">
        メール通知と併用できます。端末がオフラインの場合はメールで通知されます。
      </p>
    </div>
  );
}
