import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation, useParams } from "wouter";
import { 
  ArrowLeft, 
  Loader2, 
  Mail, 
  Lock,
  Clock,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  RefreshCw,
  Eye,
  Calendar,
  Bell,
  BellOff,
  ExternalLink,
  Pencil,
  Save,
  X,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LetterDetail() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const letterId = parseInt(params.id || "0", 10);
  const utils = trpc.useUtils();
  
  const [copied, setCopied] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  
  // スケジュール編集モード
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editUnlockAt, setEditUnlockAt] = useState("");
  const [editReminderEnabled, setEditReminderEnabled] = useState(true);
  const [editReminderDays, setEditReminderDays] = useState<number[]>([]);

  // 手紙詳細を取得
  const { data: letter, isLoading: letterLoading } = trpc.letter.getById.useQuery(
    { id: letterId },
    { enabled: letterId > 0 }
  );

  // 共有リンク状態を取得
  const { data: shareLinkStatus, isLoading: shareLinkLoading } = trpc.letter.getShareLinkStatus.useQuery(
    { letterId },
    { enabled: letterId > 0 }
  );

  // リマインダー設定を取得
  const { data: reminders } = trpc.reminder.getByLetterId.useQuery(
    { letterId },
    { enabled: letterId > 0 }
  );

  // 共有リンク生成
  const generateShareLinkMutation = trpc.letter.generateShareLink.useMutation({
    onSuccess: () => {
      toast.success("共有リンクを生成しました");
      utils.letter.getShareLinkStatus.invalidate({ letterId });
    },
    onError: () => {
      toast.error("共有リンクの生成に失敗しました");
    },
  });

  // 共有リンク無効化
  const revokeShareLinkMutation = trpc.letter.revokeShareLink.useMutation({
    onSuccess: (result) => {
      if (result.wasActive) {
        toast.success("共有リンクを無効化しました");
      } else {
        toast.info("有効な共有リンクはありませんでした");
      }
      utils.letter.getShareLinkStatus.invalidate({ letterId });
      setShowRevokeDialog(false);
    },
    onError: () => {
      toast.error("共有リンクの無効化に失敗しました");
    },
  });

  // 共有リンク再発行
  const rotateShareLinkMutation = trpc.letter.rotateShareLink.useMutation({
    onSuccess: () => {
      toast.success("新しい共有リンクを発行しました");
      utils.letter.getShareLinkStatus.invalidate({ letterId });
      setShowRotateDialog(false);
    },
    onError: () => {
      toast.error("共有リンクの再発行に失敗しました");
    },
  });

  // スケジュール更新
  const updateScheduleMutation = trpc.letter.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("スケジュールを更新しました");
      utils.letter.getById.invalidate({ id: letterId });
      utils.reminder.getByLetterId.invalidate({ letterId });
      setIsEditingSchedule(false);
    },
    onError: (error) => {
      toast.error(error.message || "スケジュールの更新に失敗しました");
    },
  });

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  // 編集モード開始時に現在の値をセット
  useEffect(() => {
    if (isEditingSchedule && letter) {
      if (letter.unlockAt) {
        // datetime-local用のフォーマット（YYYY-MM-DDTHH:mm）
        const date = new Date(letter.unlockAt);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setEditUnlockAt(localDate.toISOString().slice(0, 16));
      }
      if (reminders) {
        setEditReminderEnabled(reminders.reminders.length > 0);
        setEditReminderDays(reminders.daysBeforeList || []);
      }
    }
  }, [isEditingSchedule, letter, reminders]);

  const handleCopyLink = async () => {
    if (!shareLinkStatus?.shareToken) return;
    const url = `${window.location.origin}/share/${shareLinkStatus.shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("リンクをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSchedule = () => {
    updateScheduleMutation.mutate({
      letterId,
      unlockAt: editUnlockAt ? new Date(editUnlockAt).toISOString() : undefined,
      reminderEnabled: editReminderEnabled,
      reminderDaysBeforeList: editReminderEnabled ? editReminderDays : [],
    });
  };

  const handleReminderDayToggle = (day: number) => {
    setEditReminderDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => b - a)
    );
  };

  const reminderDayOptions = [90, 30, 7, 1];

  if (authLoading || letterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">手紙が見つかりません</p>
          <Button onClick={() => navigate("/my-letters")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            マイレターに戻る
          </Button>
        </div>
      </div>
    );
  }

  const shareUrl = shareLinkStatus?.shareToken 
    ? `${window.location.origin}/share/${shareLinkStatus.shareToken}`
    : null;

  const isOpened = !!letter.unlockedAt;

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("/my-letters")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm sm:text-base">手紙の詳細</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-8 max-w-3xl px-4">
        <div className="space-y-4 sm:space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    {letter.recipientName ? `${letter.recipientName}へ` : "手紙"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {letter.templateUsed || "カスタムテンプレート"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isOpened && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      開封済み
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    暗号化済み
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    作成: {format(new Date(letter.createdAt), "yyyy年M月d日", { locale: ja })}
                  </span>
                </div>
                {letter.unlockAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      開封日: {format(new Date(letter.unlockAt), "yyyy年M月d日", { locale: ja })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* スケジュール設定 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Calendar className="h-5 w-5" />
                    スケジュール設定
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    開封日時とリマインダーの設定
                  </CardDescription>
                </div>
                {!isEditingSchedule && !isOpened && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditingSchedule(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    編集
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isOpened ? (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    この手紙は既に開封されているため、スケジュールの変更はできません。
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    開封日時: {letter.unlockedAt && format(new Date(letter.unlockedAt), "yyyy年M月d日 HH:mm", { locale: ja })}
                  </p>
                </div>
              ) : isEditingSchedule ? (
                <div className="space-y-6">
                  {/* 開封日時編集 */}
                  <div className="space-y-2">
                    <Label htmlFor="unlockAt" className="text-sm font-medium">
                      開封日時
                    </Label>
                    <Input
                      id="unlockAt"
                      type="datetime-local"
                      value={editUnlockAt}
                      onChange={(e) => setEditUnlockAt(e.target.value)}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      この日時以降に手紙を開封できるようになります
                    </p>
                  </div>

                  <Separator />

                  {/* リマインダー設定 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="reminderEnabled"
                        checked={editReminderEnabled}
                        onCheckedChange={(checked) => setEditReminderEnabled(checked === true)}
                      />
                      <Label htmlFor="reminderEnabled" className="text-sm font-medium">
                        リマインダー通知を有効にする
                      </Label>
                    </div>

                    {editReminderEnabled && (
                      <div className="space-y-3 pl-6">
                        <p className="text-sm text-muted-foreground">
                          開封日の何日前に通知を受け取りますか？
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {reminderDayOptions.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleReminderDayToggle(day)}
                              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                editReminderDays.includes(day)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80"
                              }`}
                            >
                              {day}日前
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 操作ボタン */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingSchedule(false)}
                      disabled={updateScheduleMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleSaveSchedule}
                      disabled={updateScheduleMutation.isPending}
                    >
                      {updateScheduleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 現在の開封日時 */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">開封日時</span>
                    </div>
                    <span className="text-sm font-medium">
                      {letter.unlockAt 
                        ? format(new Date(letter.unlockAt), "yyyy年M月d日 HH:mm", { locale: ja })
                        : "未設定"
                      }
                    </span>
                  </div>

                  {/* 現在のリマインダー設定 */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">リマインダー</span>
                    </div>
                    <span className="text-sm font-medium">
                      {reminders && reminders.reminders.length > 0
                        ? `${reminders.daysBeforeList.join(", ")}日前`
                        : "無効"
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 共有リンク管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Share2 className="h-5 w-5" />
                共有リンク管理
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                共有リンクの生成、無効化、再発行ができます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shareLinkLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : shareLinkStatus?.hasActiveLink ? (
                <>
                  {/* 共有リンク表示 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">現在の共有リンク</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 p-2 sm:p-3 bg-muted rounded-md text-xs sm:text-sm font-mono break-all">
                        {shareUrl}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCopyLink}
                        className="h-10 sm:h-auto shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        {copied ? "コピー済み" : "コピー"}
                      </Button>
                    </div>
                  </div>

                  {/* アクセス統計 */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>閲覧数: {shareLinkStatus.viewCount}回</span>
                    </div>
                    {shareLinkStatus.lastAccessedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          最終アクセス: {format(new Date(shareLinkStatus.lastAccessedAt), "M月d日 HH:mm", { locale: ja })}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* 操作ボタン */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* 無効化ボタン */}
                    <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10 h-10 sm:h-auto">
                          <ShieldAlert className="h-4 w-4 mr-2" />
                          共有リンクを無効化
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>共有リンクを無効化しますか？</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>この操作を行うと、現在の共有リンクは使用できなくなります。</p>
                            <p className="text-destructive font-medium">
                              受信者はこのリンクで手紙を開けなくなります。
                            </p>
                            <p>再度共有する場合は「共有リンクを再発行」してください。</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeShareLinkMutation.mutate({ letterId })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                            disabled={revokeShareLinkMutation.isPending}
                          >
                            {revokeShareLinkMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ShieldAlert className="h-4 w-4 mr-2" />
                            )}
                            無効化する
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* 再発行ボタン */}
                    <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="h-10 sm:h-auto">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          共有リンクを再発行
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>共有リンクを再発行しますか？</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>新しい共有リンクが発行され、現在のリンクは無効になります。</p>
                            <p className="text-amber-600 font-medium">
                              受信者には新しいリンクを再度共有する必要があります。
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => rotateShareLinkMutation.mutate({ letterId })}
                            disabled={rotateShareLinkMutation.isPending}
                            className="w-full sm:w-auto"
                          >
                            {rotateShareLinkMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            再発行する
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <p className="text-muted-foreground text-sm">
                    共有リンクがまだ生成されていません
                  </p>
                  <Button 
                    onClick={() => generateShareLinkMutation.mutate({ id: letterId })}
                    disabled={generateShareLinkMutation.isPending}
                  >
                    {generateShareLinkMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4 mr-2" />
                    )}
                    共有リンクを生成
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* リマインダー設定（詳細表示） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="h-5 w-5" />
                リマインダー履歴
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                通知の送信状況を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reminders && reminders.reminders.length > 0 ? (
                <div className="space-y-3">
                  {reminders.reminders.map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        {reminder.status === "sent" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Bell className="h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <span className="text-xs sm:text-sm">
                            開封日の{reminder.daysBefore}日前
                          </span>
                          {reminder.scheduledAt && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(reminder.scheduledAt), "M月d日 HH:mm", { locale: ja })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={reminder.status === "sent" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {reminder.status === "sent" ? "送信済み" : "予定"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BellOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">
                    リマインダーは設定されていません
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 共有ページへのリンク */}
          {shareLinkStatus?.hasActiveLink && (
            <Card>
              <CardContent className="pt-6">
                <Button 
                  variant="outline" 
                  className="w-full h-10 sm:h-auto"
                  onClick={() => window.open(`/share/${shareLinkStatus.shareToken}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  共有ページをプレビュー
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
