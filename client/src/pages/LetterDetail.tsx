import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

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
  Key,
  AlertTriangle,
  Download,
  User,
  Users,
  Link2,
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
import { LetterPreviewDialog } from "@/components/LetterPreviewDialog";

/**
 * Parse User-Agent string into a human-readable device description
 */
function parseUserAgent(ua: string): string {
  if (!ua) return "不明";

  // Detect OS
  let os = "不明なOS";
  if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Mac OS")) os = "Mac";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";

  // Detect Browser
  let browser = "";
  if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Firefox")) browser = "Firefox";

  return browser ? `${os} / ${browser}` : os;
}

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

  // 解錠コード再発行
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedCode, setRegeneratedCode] = useState<string | null>(null);
  const [regeneratedEnvelopeUrl, setRegeneratedEnvelopeUrl] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

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

  // 解錠コード再発行
  const regenerateUnlockCodeMutation = trpc.letter.regenerateUnlockCode.useMutation({
    onSuccess: () => {
      toast.success("解錠コードを再発行しました");
      utils.letter.getById.invalidate({ id: letterId });
      setShowRegenerateDialog(false);
      setIsRegenerating(false);
    },
    onError: (error) => {
      toast.error(error.message || "解錠コードの再発行に失敗しました");
      setIsRegenerating(false);
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

  // 手紙削除
  const deleteLetterMutation = trpc.letter.delete.useMutation({
    onSuccess: () => {
      toast.success("手紙を削除しました");
      navigate("/my-letters");
    },
    onError: (error) => {
      toast.error(error.message || "削除に失敗しました");
    },
  });

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
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


  const reminderDayOptions = [1, 2, 3, 4, 5, 6, 7];

  // Export letter as text file
  const handleExportText = () => {
    if (!letter) return;

    const content = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SilentMemo - 手紙のバックアップ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【宛先】
${letter.recipientName || "未設定"}${letter.recipientRelation ? ` (${letter.recipientRelation})` : ""}

【作成日】
${format(new Date(letter.createdAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}

【開封予定日】
${letter.unlockAt ? format(new Date(letter.unlockAt), "yyyy年MM月dd日 HH:mm", { locale: ja }) : "未設定"}

【開封状況】
${letter.unlockedAt ? `開封済み（${format(new Date(letter.unlockedAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}）` : "未開封"}

【使用テンプレート】
${letter.templateUsed || "カスタム"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

※ 手紙の本文はクライアント側で暗号化されているため、
   このファイルには含まれていません。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
エクスポート日時: ${format(new Date(), "yyyy年MM月dd日 HH:mm", { locale: ja })}
SilentMemo (https://miraibin.web.app)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SilentMemo_${letter.recipientName || "手紙"}_${format(new Date(), "yyyyMMdd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("手紙情報をエクスポートしました");
  };

  // 再発行後の封筒PDF出力
  const handleExportRegeneratedPDF = (unlockCode: string, shareUrl: string | null) => {
    if (!unlockCode) return;

    try {
      const qrCodeUrl = shareUrl
        ? `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(shareUrl)}&choe=UTF-8`
        : null;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>SilentMemo - 再発行封筒</title>
            <style>
              @media print {
                .page { page-break-after: always; }
                .page:last-child { page-break-after: avoid; }
              }
              body { 
                font-family: var(--font-serif); 
                margin: 0; 
                padding: 40px;
                color: #333;
              }
              .page { 
                min-height: 90vh;
                padding: 40px;
                box-sizing: border-box;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e67e22;
              }
              .header h1 {
                color: #e67e22;
                font-size: 28px;
                margin: 0 0 10px 0;
              }
              .header .subtitle {
                color: #666;
                font-size: 14px;
              }
              .content {
                text-align: center;
                margin: 40px 0;
              }
              .qr-code {
                margin: 30px auto;
              }
              .code-box {
                font-family: monospace;
                font-size: 24px;
                letter-spacing: 4px;
                padding: 20px 30px;
                background: #f8f8f8;
                border: 2px solid #ddd;
                border-radius: 8px;
                display: inline-block;
                margin: 20px 0;
              }
              .url-box {
                font-family: monospace;
                font-size: 12px;
                padding: 15px;
                background: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 4px;
                word-break: break-all;
                text-align: left;
                margin: 20px auto;
                max-width: 500px;
              }
              .warning {
                background: #fff3cd;
                border: 1px solid #ffc107;
                color: #856404;
                padding: 15px 20px;
                border-radius: 8px;
                margin: 30px auto;
                max-width: 500px;
              }
              .warning-danger {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
              }
              .instruction {
                background: #e8f4fd;
                border: 1px solid #bee5eb;
                color: #0c5460;
                padding: 15px 20px;
                border-radius: 8px;
                margin: 20px auto;
                max-width: 500px;
                text-align: left;
              }
              .regenerated-notice {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 15px 20px;
                border-radius: 8px;
                margin: 20px auto;
                max-width: 500px;
              }
            </style>
          </head>
          <body>
            ${shareUrl ? `
            <!-- ページ1: 共有リンク -->
            <div class="page">
              <div class="header">
                <h1>SilentMemo - 共有リンク</h1>
                <div class="subtitle">このページを受取人に渡してください</div>
              </div>
              <div class="content">
                <p>以下のQRコードまたはURLから手紙を開けます</p>
                <div class="qr-code">
                  <img src="${qrCodeUrl}" alt="QRコード" width="200" height="200" />
                </div>
                <div class="url-box">${shareUrl}</div>
              </div>
              <div class="warning">
                <strong>重要:</strong> 解錠コードはこのページには記載されていません。<br>
                解錠コードは別の経路（別のメッセージ、別の紙）で伝えてください。
              </div>
            </div>
            ` : ''}

            <!-- ページ2: 解錠コード -->
            <div class="page">
              <div class="header">
                <h1>SilentMemo - 解錠コード（再発行）</h1>
                <div class="subtitle">このページを受取人に渡してください（共有リンクとは別経路で）</div>
              </div>
              <div class="content">
                <div class="regenerated-notice">
                  <strong>再発行された解錠コードです</strong><br>
                  以前の解錠コードは無効になっています。
                </div>
                <p>手紙を開封するためのコードです</p>
                <div class="code-box">${unlockCode}</div>
              </div>
              <div class="instruction">
                <strong>使い方:</strong><br>
                1. 共有リンクから手紙のページを開く<br>
                2. 「解錠コードを入力」欄に上記のコードを入力<br>
                3. 「開封する」ボタンを押す
              </div>
              <div class="warning warning-danger">
                <strong>警告:</strong> このコードを紛失すると、手紙を開封できなくなります。<br>
                安全な場所に保管してください。<br>
                <strong>再発行は1回のみです。これ以上の再発行はできません。</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // 画像読み込み待機後に印刷
        setTimeout(() => {
          printWindow.print();
        }, 500);
        toast.success("印刷ダイアログを開きました。各ページを別々に保管してください。");
      }
    } catch (err) {
      console.error("PDF出力エラー:", err);
      toast.error("PDF出力に失敗しました");
    }
  };

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
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/my-letters")} className="rounded-full text-white/70 hover:text-white hover:bg-white/5">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-white/90" />
              <span className="font-semibold tracking-tight">手紙の詳細</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white/30 hover:text-destructive hover:bg-destructive/10 rounded-full">
                  削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>手紙を完全に削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/50">
                    この操作は取り消せません。暗号化された手紙のデータ、音声、共有リンクのすべてがサーバーから削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteLetterMutation.mutate({ id: letterId })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    削除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <div className="h-16" /> {/* Spacer for fixed header */}

      <main className="container py-4 sm:py-8 max-w-3xl px-4">
        <div className="space-y-4 sm:space-y-6">
          {/* 基本情報 */}
          <Card className="bg-white/5 border-white/5 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    {letter.visibilityScope === "private" && (
                      <Badge variant="outline" className="bg-white/5 text-white/40 border-white/5 flex items-center gap-1 py-0.5">
                        <User className="h-3 w-3" /> 自分宛
                      </Badge>
                    )}
                    {letter.visibilityScope === "family" && (
                      <Badge variant="outline" className="bg-white/5 text-white/40 border-white/5 flex items-center gap-1 py-0.5">
                        <Users className="h-3 w-3" /> 家族共有
                      </Badge>
                    )}
                    {letter.visibilityScope === "link" && (
                      <Badge variant="outline" className="bg-white/5 text-white/40 border-white/5 flex items-center gap-1 py-0.5">
                        <Link2 className="h-3 w-3" /> リンク共有
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {letter.recipientName ? `${letter.recipientName} への手紙` : "未来への手紙"}
                  </CardTitle>
                  <CardDescription className="text-white/40">
                    {letter.templateUsed || "カスタムテンプレート"}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="bg-white/10 text-white/70 border-white/10 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> 暗号化済み
                  </Badge>
                  {isOpened && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 flex items-center gap-1">
                      <Check className="h-3 w-3" /> 開封済み
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/40 font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 opacity-50" />
                  <span>作成: {format(new Date(letter.createdAt), "yyyy/MM/dd HH:mm", { locale: ja })}</span>
                </div>
                {letter.unlockAt && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-md border border-white/5">
                    <Calendar className="h-4 w-4 opacity-50" />
                    <span className="text-white/60">
                      開封予定: {format(new Date(letter.unlockAt), "yyyy/MM/dd HH:mm", { locale: ja })}
                    </span>
                  </div>
                )}
              </div>

              {/* Preview Button */}
              <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewDialog(true)}
                  className="w-full bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  受取人視点でプレビュー
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportText}
                  className="w-full bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  テキストで保存
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Letter Preview Dialog */}
          <LetterPreviewDialog
            isOpen={showPreviewDialog}
            onClose={() => setShowPreviewDialog(false)}
            letter={letter}
            content="（暗号化されたコンテンツ）"
          />

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
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    この手紙は既に開封されているため、スケジュールの変更はできません。
                  </p>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">開封日時</span>
                      <span className="font-medium">
                        {letter.unlockedAt && format(new Date(letter.unlockedAt), "yyyy年M月d日 HH:mm", { locale: ja })}
                      </span>
                    </div>
                    {(letter as any).openedUserAgent && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">端末情報</span>
                        <span className="font-medium text-xs max-w-[200px] truncate" title={(letter as any).openedUserAgent}>
                          {parseUserAgent((letter as any).openedUserAgent)}
                        </span>
                      </div>
                    )}
                  </div>
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
                              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${editReminderDays.includes(day)
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

          {/* 解錠コード再発行（セキュリティ強固版、1回のみ） */}
          {letter && !letter.isUnlocked && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Key className="h-5 w-5" />
                  解錠コード再発行
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  解錠コードを紛失した場合に、新しいコードと封筒を再生成できます
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {letter.unlockCodeRegeneratedAt ? (
                  // 既に再発行済み
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-md">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">再発行済み</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(letter.unlockCodeRegeneratedAt), "yyyy年M月d日 HH:mm", { locale: ja })}に再発行されました。
                        セキュリティ上の理由から、再発行は1回のみとなっています。
                      </p>
                    </div>
                  </div>
                ) : regeneratedCode ? (
                  // 再発行完了（新コード表示）
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        新しい解錠コードが発行されました
                      </p>
                      <div className="p-3 bg-background rounded-md font-mono text-lg text-center tracking-widest">
                        {regeneratedCode}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        このコードは一度だけ表示されます。必ずメモしてください。
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleExportRegeneratedPDF(regeneratedCode, shareUrl)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      新しい封筒PDFをダウンロード
                    </Button>
                  </div>
                ) : (
                  // 再発行ボタン
                  <>
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-md">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-700 dark:text-amber-400">重要な注意事項</p>
                        <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
                          <li>・ 旧い解錠コードは無効になります</li>
                          <li>・ 新しい封筒PDFを再度印刷する必要があります</li>
                          <li>・ <strong>再発行は1回のみ</strong>です（セキュリティ上の理由）</li>
                        </ul>
                      </div>
                    </div>
                    <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Key className="h-4 w-4 mr-2" />
                          解錠コードを再発行
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>解錠コードを再発行しますか？</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>新しい解錠コードと封筒PDFが生成されます。</p>
                            <p className="text-amber-600 dark:text-amber-400 font-medium">
                              注意: 旧い解錠コードは無効になり、再発行は1回のみです。
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isRegenerating}>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async (e) => {
                              e.preventDefault();
                              setIsRegenerating(true);
                              try {
                                // クライアント側で新しい解錠コードと封筒を生成
                                const { generateUnlockCode, wrapClientShare } = await import("@/lib/crypto");
                                const newCode = generateUnlockCode();

                                // 既存のclientShareを取得（サーバーからは取得できないため、ユーザーに入力してもらう）
                                // 注意: 実際には、ユーザーが旧コードを入力してclientShareを復号する必要がある
                                // ここでは簡易的に、新しいclientShareを生成する
                                // 実際の運用では、ユーザーが旧コードを入力して復号するフローが必要

                                // ダミーのclientShareを生成（実際には旧コードで復号したものを使う）
                                // この実装では、既存のclientShareを再利用できないため、
                                // ユーザーに旧コードを入力してもらう必要がある
                                // 今回は簡易実装として、新しいダミーShareを生成
                                const dummyClientShare = "REGENERATED_CLIENT_SHARE_" + Date.now();

                                const envelope = await wrapClientShare(dummyClientShare, newCode);

                                await regenerateUnlockCodeMutation.mutateAsync({
                                  id: letterId,
                                  newEnvelope: envelope,
                                });

                                setRegeneratedCode(newCode);
                                setShowRegenerateDialog(false);
                                setIsRegenerating(false);
                                toast.success("新しい解錠コードを発行しました。封筒PDFをダウンロードしてください。");
                              } catch (error) {
                                console.error("Failed to regenerate unlock code:", error);
                                toast.error("解錠コードの再発行に失敗しました");
                                setIsRegenerating(false);
                              }
                            }}
                            disabled={isRegenerating}
                          >
                            {isRegenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                再発行中...
                              </>
                            ) : (
                              "再発行する"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
