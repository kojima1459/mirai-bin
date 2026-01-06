import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useEncryption } from "@/hooks/useEncryption";
import { formatDuration } from "@/lib/audio";
import { getLoginUrl } from "@/const";
import { useLocation, useSearch } from "wouter";
import { useDraftAutoSave } from "@/hooks/useDraftAutoSave";
import { splitKey } from "@/lib/shamir";
import { wrapClientShare, generateUnlockCode } from "@/lib/crypto";
import { 
  ArrowLeft, 
  ArrowRight, 
  Cake, 
  GraduationCap, 
  Heart, 
  Loader2, 
  Mail, 
  Mic, 
  Square, 
  Check,
  Lock,
  Calendar,
  Share2,
  Copy,
  ExternalLink,
  MessageCircle,
  School,
  BookOpen,
  Star,
  Briefcase,
  Baby,
  HandHeart,
  Key,
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  FileText,
  RotateCcw,
  Bell
} from "lucide-react";
import { AudioWaveform, RecordingTimer } from "@/components/AudioWaveform";
import { TemplateAccordion } from "@/components/TemplateAccordion";
import { motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "template" | "recording" | "transcribing" | "generating" | "editing" | "encrypting" | "complete";

const iconMap: Record<string, React.ReactNode> = {
  cake: <Cake className="h-6 w-6" />,
  "graduation-cap": <GraduationCap className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
  school: <School className="h-6 w-6" />,
  "book-open": <BookOpen className="h-6 w-6" />,
  star: <Star className="h-6 w-6" />,
  briefcase: <Briefcase className="h-6 w-6" />,
  baby: <Baby className="h-6 w-6" />,
  "hand-heart": <HandHeart className="h-6 w-6" />,
  mail: <Mail className="h-6 w-6" />,
};

const MAX_DURATION = 90; // 90秒

export default function CreateLetter() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialTemplate = searchParams.get("template") || "";
  const draftIdParam = searchParams.get("draft");

  // State
  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate);
  const [recipientName, setRecipientName] = useState("");
  const [recipientRelation, setRecipientRelation] = useState("");
  const [transcription, setTranscription] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [finalContent, setFinalContent] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [letterId, setLetterId] = useState<number | null>(null);
  const [unlockDate, setUnlockDate] = useState<Date | undefined>(undefined);
  const [unlockTime, setUnlockTime] = useState("09:00");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  
  // ゼロ知識設計: 解錠コードとバックアップシェア
  const [unlockCode, setUnlockCode] = useState<string | null>(null);
  const [backupShare, setBackupShare] = useState<string | null>(null);
  const [showUnlockCode, setShowUnlockCode] = useState(false);
  const [showBackupShare, setShowBackupShare] = useState(false);
  const [unlockCodeViewCount, setUnlockCodeViewCount] = useState(0); // 再表示制限用
  
  // リマインダー設定
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState<number[]>([30, 7, 1]); // デフォルト: 30日前、7日前、1日前

  // Hooks
  const { data: templates, isLoading: templatesLoading } = trpc.template.list.useQuery();
  const { isRecording, elapsed, remaining, start, stop, base64, error: recordingError, reset: resetRecording } = useVoiceRecorder({ maxDuration: MAX_DURATION });
  const { isEncrypting, progress: encryptionProgress, encrypt, reset: resetEncryption } = useEncryption();

  // Mutations
  const uploadAudioMutation = trpc.storage.uploadAudio.useMutation();
  const transcribeMutation = trpc.ai.transcribe.useMutation();
  const generateDraftMutation = trpc.ai.generateDraft.useMutation();
  const uploadCiphertextMutation = trpc.storage.uploadCiphertext.useMutation();
  const createLetterMutation = trpc.letter.create.useMutation();
  const setUnlockEnvelopeMutation = trpc.letter.setUnlockEnvelope.useMutation();
  const generateShareLinkMutation = trpc.letter.generateShareLink.useMutation();
  const deleteDraftMutation = trpc.draft.delete.useMutation();
  const updateReminderMutation = trpc.reminder.update.useMutation();

  // 下書き自動保存
  const { draftId, isSaving, lastSaved, save: saveDraft, saveImmediately, loadDraft, resetDraft, setDraftId } = useDraftAutoSave({
    debounceMs: 3000,
    onSaved: () => {
      // 保存成功時は静かに表示
    },
  });

  // 下書きデータ取得
  const { data: draftData, isLoading: isDraftLoading } = trpc.draft.get.useQuery(
    { id: Number(draftIdParam) },
    { enabled: !!draftIdParam }
  );

  // 下書きから復元
  useEffect(() => {
    if (draftData && !isLoadingDraft) {
      setIsLoadingDraft(true);
      setDraftId(draftData.id);
      if (draftData.templateName) setSelectedTemplate(draftData.templateName);
      if (draftData.recipientName) setRecipientName(draftData.recipientName);
      if (draftData.recipientRelation) setRecipientRelation(draftData.recipientRelation);
      if (draftData.audioUrl) setAudioUrl(draftData.audioUrl);
      if (draftData.transcription) setTranscription(draftData.transcription);
      if (draftData.aiDraft) setAiDraft(draftData.aiDraft);
      if (draftData.finalContent) setFinalContent(draftData.finalContent);
      if (draftData.unlockAt) {
        const date = new Date(draftData.unlockAt);
        setUnlockDate(date);
        setUnlockTime(format(date, "HH:mm"));
      }
      // ステップを復元
      if (draftData.currentStep === "editing" || draftData.finalContent) {
        setStep("editing");
      } else if (draftData.transcription) {
        setStep("editing");
      } else if (draftData.templateName) {
        setStep("recording");
      }
      setIsLoadingDraft(false);
      toast.success("下書きを読み込みました");
    }
  }, [draftData]);

  // 自動保存（ステップや内容が変わったとき）
  useEffect(() => {
    // completeステップでは保存しない
    if (step === "complete" || step === "encrypting") return;
    // テンプレートが選択されていない場合は保存しない
    if (!selectedTemplate && !recipientName && !transcription && !finalContent) return;

    saveDraft({
      templateName: selectedTemplate || undefined,
      recipientName: recipientName || undefined,
      recipientRelation: recipientRelation || undefined,
      audioUrl: audioUrl || undefined,
      transcription: transcription || undefined,
      aiDraft: aiDraft || undefined,
      finalContent: finalContent || undefined,
      unlockAt: unlockDate ? getUnlockAt()?.toISOString() : undefined,
      currentStep: step,
    });
  }, [selectedTemplate, recipientName, recipientRelation, transcription, aiDraft, finalContent, unlockDate, unlockTime, step]);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  // 録音開始
  const handleStartRecording = async () => {
    try {
      await start();
    } catch (err) {
      toast.error("マイクへのアクセスが拒否されました");
    }
  };

  // 録音停止 → 確認画面へ
  const handleStopRecording = async () => {
    const result = await stop();
    if (!result || !base64) return;
    // 録音完了後は確認画面を表示（次へ進むボタンで文字起こしへ）
  };

  // 次へ進む（文字起こし → AI生成）
  const handleProceedToTranscription = async () => {
    if (!base64) return;

    setStep("transcribing");

    try {
      // 音声をアップロード
      const uploadResult = await uploadAudioMutation.mutateAsync({
        audioBase64: base64,
        mimeType: "audio/webm",
      });
      setAudioUrl(uploadResult.url);

      // 文字起こし
      const transcribeResult = await transcribeMutation.mutateAsync({
        audioUrl: uploadResult.url,
      });
      setTranscription(transcribeResult.text);

      setStep("generating");

      // AI下書き生成
      const draftResult = await generateDraftMutation.mutateAsync({
        transcription: transcribeResult.text,
        templateName: selectedTemplate,
        recipientName: recipientName || undefined,
      });
      setAiDraft(draftResult.draft);
      setFinalContent(draftResult.draft);

      setStep("editing");
    } catch (err) {
      console.error("Error:", err);
      toast.error("処理中にエラーが発生しました");
      setStep("recording");
    }
  };

  // 開封日時を計算
  const getUnlockAt = (): Date | undefined => {
    if (!unlockDate) return undefined;
    const [hours, minutes] = unlockTime.split(":").map(Number);
    const date = new Date(unlockDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // 共有リンクを生成（ゼロ知識版）
  const handleGenerateShareLink = async () => {
    if (!letterId || !unlockCode) return;
    
    try {
      const result = await generateShareLinkMutation.mutateAsync({ id: letterId });
      setShareToken(result.shareToken);
      // URLには秘密を含めない（#key廃止）
      const url = `${window.location.origin}/share/${result.shareToken}`;
      setShareUrl(url);
      toast.success("共有リンクを生成しました");
    } catch (err) {
      console.error("Error:", err);
      toast.error("共有リンクの生成に失敗しました");
    }
  };

  // クリップボードにコピー
  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("リンクをコピーしました");
    } catch (err) {
      toast.error("コピーに失敗しました");
    }
  };

  // 解錠コードをコピー
  const handleCopyUnlockCode = async () => {
    if (!unlockCode) return;
    try {
      await navigator.clipboard.writeText(unlockCode);
      toast.success("解錠コードをコピーしました", {
        description: "今すぐ別経路で送ってください",
      });
      
      // 30秒後にクリップボードを自動クリア
      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText("");
        } catch (err) {
          // クリア失敗しても無視
        }
      }, 30000);
    } catch (err) {
      toast.error("コピーに失敗しました");
    }
  };

  // バックアップシェアをコピー
  const handleCopyBackupShare = async () => {
    if (!backupShare) return;
    try {
      await navigator.clipboard.writeText(backupShare);
      toast.success("バックアップコードをコピーしました");
    } catch (err) {
      toast.error("コピーに失敗しました");
    }
  };

  // PDF分割出力（3ページ：リンク+QR／解錠コード／バックアップ）
  const handleExportPDF = async () => {
    if (!shareUrl || !unlockCode) return;
    
    try {
      // QRコード生成（Google Charts API使用）
      const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(shareUrl)}&choe=UTF-8`;
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>未来便 - 共有情報</title>
            <style>
              @media print {
                .page { page-break-after: always; }
                .page:last-child { page-break-after: avoid; }
              }
              body { 
                font-family: 'Hiragino Kaku Gothic ProN', 'MS Gothic', sans-serif; 
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
                font-family: 'Courier New', monospace;
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
                font-family: 'Courier New', monospace;
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
              .page-label {
                position: absolute;
                bottom: 20px;
                right: 40px;
                color: #999;
                font-size: 12px;
              }
              .backup-warning {
                background: #343a40;
                color: #fff;
                padding: 20px;
                border-radius: 8px;
                margin: 20px auto;
                max-width: 500px;
              }
            </style>
          </head>
          <body>
            <!-- ページ1: 共有リンク -->
            <div class="page">
              <div class="header">
                <h1>未来便 - 共有リンク</h1>
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

            <!-- ページ2: 解錠コード -->
            <div class="page">
              <div class="header">
                <h1>未来便 - 解錠コード</h1>
                <div class="subtitle">このページを受取人に渡してください（共有リンクとは別経路で）</div>
              </div>
              <div class="content">
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
                安全な場所に保管してください。
              </div>
            </div>

            <!-- ページ3: バックアップコード -->
            <div class="page">
              <div class="header">
                <h1>未来便 - バックアップコード</h1>
                <div class="subtitle">【送信者保管用】受取人には渡さないでください</div>
              </div>
              <div class="content">
                <p>緑急時の復旧用コードです</p>
                <div class="code-box" style="font-size: 14px; letter-spacing: 2px;">${backupShare || '未生成'}</div>
              </div>
              <div class="backup-warning">
                <strong>重要な注意事項:</strong><br><br>
                • このコードは解錠コードを紛失した場合の緑急復旧用です<br>
                • 受取人には絶対に渡さないでください<br>
                • 金庫やセキュリティボックスなど安全な場所に保管してください<br>
                • このコードが漏洩すると、第三者が手紙を開封できる可能性があります
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

  // 保存（ゼロ知識版：暗号化 → Shamir分割 → アップロード → DB保存）
  const handleSave = async () => {
    if (!finalContent.trim()) {
      toast.error("手紙の内容を入力してください");
      return;
    }

    setStep("encrypting");

    try {
      // 1. 暗号化（クライアント側で完結）
      const encryptResult = await encrypt(finalContent);
      if (!encryptResult) {
        throw new Error("暗号化に失敗しました");
      }

      // 2. 暗号文をアップロード
      const uploadResult = await uploadCiphertextMutation.mutateAsync({
        ciphertextBase64: encryptResult.encryption.ciphertext,
      });

      // 3. Shamir分割（クライアント側で実行）
      const shares = await splitKey(encryptResult.encryption.key);
      
      // 4. 解錠コードを生成
      const code = generateUnlockCode(12);
      setUnlockCode(code);
      
      // 5. clientShareを解錠コードで暗号化（封筒作成）
      const envelope = await wrapClientShare(shares.clientShare, code);
      
      // 6. バックアップシェアを保存（ユーザーに提示）
      setBackupShare(shares.backupShare);

      // 開封日時を取得
      const unlockAt = getUnlockAt();

      // 7. DB保存（サーバーにはserverShareのみ送信、本文は送らない）
      const letterResult = await createLetterMutation.mutateAsync({
        recipientName: recipientName || undefined,
        recipientRelation: recipientRelation || undefined,
        audioUrl: audioUrl || undefined,
        audioDuration: elapsed,
        templateUsed: selectedTemplate || undefined,
        encryptionIv: encryptResult.encryption.iv,
        ciphertextUrl: uploadResult.url,
        proofHash: encryptResult.proof.hash,
        unlockAt: unlockAt,
        useShamir: true,
        serverShare: shares.serverShare, // サーバーにはserverShareのみ
      });

      setLetterId(letterResult.id);
      
      // 8. 封筒（暗号化されたclientShare）を保存
      await setUnlockEnvelopeMutation.mutateAsync({
        id: letterResult.id,
        wrappedClientShare: envelope.wrappedClientShare,
        wrappedClientShareIv: envelope.wrappedClientShareIv,
        wrappedClientShareSalt: envelope.wrappedClientShareSalt,
        wrappedClientShareKdf: envelope.wrappedClientShareKdf,
        wrappedClientShareKdfIters: envelope.wrappedClientShareKdfIters,
      });
      
      // 下書きを削除（正式保存したので）
      if (draftId) {
        try {
          await deleteDraftMutation.mutateAsync({ id: draftId });
          resetDraft();
        } catch (e) {
          // 下書き削除の失敗は無視
          console.warn("下書きの削除に失敗しました", e);
        }
      }
      
      // 9. リマインダーを設定（開封日が設定されている場合）
      if (reminderEnabled && reminderDays.length > 0 && unlockDate) {
        try {
          await updateReminderMutation.mutateAsync({
            letterId: letterResult.id,
            daysBeforeList: reminderDays,
            enabled: true,
          });
        } catch (e) {
          // リマインダー設定の失敗は警告のみ
          console.warn("リマインダーの設定に失敗しました", e);
          toast.warning("リマインダーの設定に失敗しました");
        }
      }
      
      setStep("complete");
      toast.success("手紙を保存しました");
    } catch (err) {
      console.error("Error:", err);
      toast.error("保存中にエラーが発生しました");
      setStep("editing");
    }
  };

  // ローディング
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedTemplateData = templates?.find((t) => t.name === selectedTemplate);

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
              <span className="font-semibold">手紙を書く</span>
            </div>
          </div>
          {/* 下書き保存インジケーター */}
          {step !== "complete" && (draftId || isSaving || lastSaved) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : lastSaved ? (
                <span>下書き保存済み</span>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <main className="container py-6 md:py-8 max-w-2xl">
        {/* ステップインジケーター - モバイル最適化 */}
        <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 md:mb-8">
          {["template", "recording", "editing", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s || (step === "transcribing" && s === "recording") || (step === "generating" && s === "recording") || (step === "encrypting" && s === "editing")
                    ? "bg-primary text-primary-foreground"
                    : ["template", "recording", "transcribing", "generating", "editing", "encrypting", "complete"].indexOf(step) > ["template", "recording", "editing", "complete"].indexOf(s)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["template", "recording", "transcribing", "generating", "editing", "encrypting", "complete"].indexOf(step) > ["template", "recording", "editing", "complete"].indexOf(s) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className="w-6 md:w-8 h-0.5 bg-muted mx-0.5 md:mx-1" />}
            </div>
          ))}
        </div>

        {/* テンプレート選択 */}
        {step === "template" && (
          <Card className="border-0 md:border shadow-none md:shadow-sm">
            <CardHeader className="px-0 md:px-6">
              <CardTitle className="text-xl md:text-lg">テンプレートを選ぶ</CardTitle>
              <CardDescription className="text-base md:text-sm">
                手紙のシーンを選んでください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-0 md:px-6">
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : templates && templates.length > 0 ? (
                <TemplateAccordion
                  templates={templates}
                  selectedTemplate={selectedTemplate}
                  onSelect={setSelectedTemplate}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>テンプレートがありません</p>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="recipientName" className="text-base md:text-sm">宛先の名前（任意）</Label>
                  <Input
                    id="recipientName"
                    placeholder="例：太郎"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="h-12 md:h-10 text-base md:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientRelation" className="text-base md:text-sm">関係（任意）</Label>
                  <Select value={recipientRelation} onValueChange={setRecipientRelation}>
                    <SelectTrigger className="h-12 md:h-10 text-base md:text-sm">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="son">息子</SelectItem>
                      <SelectItem value="daughter">娘</SelectItem>
                      <SelectItem value="child">子ども</SelectItem>
                      <SelectItem value="grandchild">孫</SelectItem>
                      <SelectItem value="friend">友達</SelectItem>
                      <SelectItem value="wife">妻</SelectItem>
                      <SelectItem value="husband">夫</SelectItem>
                      <SelectItem value="boyfriend">彼氏</SelectItem>
                      <SelectItem value="girlfriend">彼女</SelectItem>
                      <SelectItem value="colleague">同期</SelectItem>
                      <SelectItem value="other">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => setStep("recording")}
                disabled={!selectedTemplate}
                className="w-full h-12 md:h-10 text-base md:text-sm"
              >
                次へ
                <ArrowRight className="ml-2 h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 録音 */}
        {step === "recording" && (
          <Card className="border-0 md:border shadow-none md:shadow-sm">
            <CardHeader className="px-0 md:px-6 text-center">
              <CardTitle className="text-xl md:text-lg">想いを録音する</CardTitle>
              <CardDescription className="text-base md:text-sm">
                {selectedTemplateData?.recordingPrompt || "伝えたいことを自由に話してください"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-0 md:px-6">
              <div className="flex flex-col items-center gap-6 py-4">
                {isRecording ? (
                  <>
                    <AudioWaveform isRecording={isRecording} />
                    <RecordingTimer elapsed={elapsed} remaining={remaining} maxDuration={MAX_DURATION} />
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={handleStopRecording}
                      className="w-36 h-36 md:w-32 md:h-32 rounded-full shadow-lg"
                    >
                      <Square className="h-10 w-10 md:h-8 md:w-8" />
                    </Button>
                    <p className="text-base md:text-sm text-muted-foreground">
                      タップして録音を停止
                    </p>
                  </>
                ) : base64 ? (
                  // 録音完了後の確認画面
                  <>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="w-24 h-24 md:w-20 md:h-20 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="h-12 w-12 md:h-10 md:w-10 text-green-600" />
                      </div>
                      <p className="text-lg md:text-base font-medium text-green-700">録音完了！</p>
                      <p className="text-base md:text-sm text-muted-foreground">
                        {elapsed}秒の音声を録音しました
                      </p>
                    </motion.div>
                    <div className="flex gap-3 w-full max-w-xs">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetRecording();
                        }}
                        className="flex-1 h-12 md:h-10 text-base md:text-sm"
                      >
                        <RotateCcw className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                        撮り直す
                      </Button>
                    </div>
                  </>
                ) : (
                  // 録音開始前
                  <>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button
                        size="lg"
                        onClick={handleStartRecording}
                        className="w-36 h-36 md:w-32 md:h-32 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                      >
                        <Mic className="h-10 w-10 md:h-8 md:w-8" />
                      </Button>
                    </motion.div>
                    <p className="text-base md:text-sm text-muted-foreground">
                      タップして録音を開始（最大{MAX_DURATION}秒）
                    </p>
                  </>
                )}
              </div>

              {recordingError && (
                <p className="text-base md:text-sm text-destructive text-center">{recordingError}</p>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("template")} className="flex-1 h-12 md:h-10 text-base md:text-sm">
                  <ArrowLeft className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                  戻る
                </Button>
                {base64 && (
                  <Button
                    onClick={handleProceedToTranscription}
                    className="flex-1 h-12 md:h-10 text-base md:text-sm"
                  >
                    次へ進む
                    <ArrowRight className="ml-2 h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 文字起こし中 */}
        {step === "transcribing" && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">音声を文字に変換中...</p>
                <p className="text-sm text-muted-foreground">しばらくお待ちください</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI生成中 */}
        {step === "generating" && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">手紙を作成中...</p>
                <p className="text-sm text-muted-foreground">AIがあなたの想いを手紙にしています</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 編集 */}
        {step === "editing" && (
          <Card className="border-0 md:border shadow-none md:shadow-sm">
            <CardHeader className="px-0 md:px-6">
              <CardTitle className="text-xl md:text-lg">手紙を編集する</CardTitle>
              <CardDescription className="text-base md:text-sm">
                内容を確認・編集してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-0 md:px-6">
              {transcription && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-base md:text-sm">文字起こし結果</Label>
                  <div className="p-3 bg-muted rounded-lg text-base md:text-sm leading-relaxed">
                    {transcription}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="finalContent" className="text-base md:text-sm">手紙の内容</Label>
                <Textarea
                  id="finalContent"
                  value={finalContent}
                  onChange={(e) => setFinalContent(e.target.value)}
                  rows={12}
                  className="resize-none text-base md:text-sm leading-relaxed"
                />
              </div>

              {/* 開封日時設定 */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 md:h-4 md:w-4 text-amber-600" />
                  <Label className="font-medium text-base md:text-sm">開封日時を設定（任意）</Label>
                </div>
                <p className="text-base md:text-sm text-muted-foreground">
                  設定した日時まで手紙を開封できないようにします
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start h-12 md:h-10 text-base md:text-sm">
                        <Calendar className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                        {unlockDate ? format(unlockDate, "yyyy年M月d日", { locale: ja }) : "日付を選択"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={unlockDate}
                        onSelect={setUnlockDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={unlockTime}
                    onChange={(e) => setUnlockTime(e.target.value)}
                    className="w-full md:w-32 h-12 md:h-10 text-base md:text-sm"
                  />
                </div>
                {unlockDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUnlockDate(undefined);
                      setUnlockTime("09:00");
                    }}
                    className="text-muted-foreground text-base md:text-sm"
                  >
                    開封日時をクリア
                  </Button>
                )}
              </div>

              {/* リマインダー設定（開封日時が設定されている場合のみ表示） */}
              {unlockDate && (
                <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 md:h-4 md:w-4 text-amber-600" />
                      <Label className="font-medium text-base md:text-sm">開封日前のリマインダー</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="reminderEnabled"
                        checked={reminderEnabled}
                        onCheckedChange={(checked) => setReminderEnabled(checked === true)}
                      />
                      <Label htmlFor="reminderEnabled" className="text-base md:text-sm cursor-pointer">
                        有効
                      </Label>
                    </div>
                  </div>
                  
                  {reminderEnabled && (
                    <>
                      <p className="text-base md:text-sm text-muted-foreground">
                        開封日前にメールでお知らせします。PDFや解錠コードの保管場所を確認する機会になります。
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[90, 30, 7, 1].map((days) => (
                          <label
                            key={days}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              reminderDays.includes(days)
                                ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600"
                                : "bg-background border-input hover:bg-muted"
                            }`}
                          >
                            <Checkbox
                              checked={reminderDays.includes(days)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setReminderDays([...reminderDays, days].sort((a, b) => b - a));
                                } else {
                                  setReminderDays(reminderDays.filter((d) => d !== days));
                                }
                              }}
                            />
                            <span className="text-base md:text-sm">
                              {days === 1 ? "1日前" : `${days}日前`}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ※ 解錠コードはメールに含まれません（ゼロ知識設計）
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("recording")} className="flex-1 h-12 md:h-10 text-base md:text-sm">
                  <ArrowLeft className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                  録り直す
                </Button>
                <Button onClick={handleSave} className="flex-1 h-12 md:h-10 text-base md:text-sm">
                  保存する
                  <Lock className="ml-2 h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 暗号化中 */}
        {step === "encrypting" && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">暗号化中...</p>
                <p className="text-sm text-muted-foreground">
                  あなたの手紙を安全に暗号化しています
                </p>
                <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${encryptionProgress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 完了（ゼロ知識版） */}
        {step === "complete" && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Check className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">手紙を保存しました</h2>
                  <p className="text-muted-foreground">
                    あなたの想いは安全に暗号化されました
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">宛先</span>
                    <span>{recipientName || "未設定"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">テンプレート</span>
                    <span>{selectedTemplateData?.displayName}</span>
                  </div>
                  {unlockDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">開封日時</span>
                      <span className="text-amber-600">
                        {format(unlockDate, "yyyy年M月d日", { locale: ja })} {unlockTime}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">暗号化</span>
                    <span className="text-green-600">AES-256-GCM + Shamir分割</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ゼロ知識</span>
                    <span className="text-green-600">運営者も読めません</span>
                  </div>
                </div>

                {/* 重要：解錠コードとバックアップシェア */}
                <Alert className="text-left border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <strong>重要：</strong>以下の情報を安全な場所に保管してください。これらがないと手紙を開封できません。
                  </AlertDescription>
                </Alert>

                {/* 解錠コード */}
                <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <Key className="h-5 w-5" />
                      <span className="font-medium">解錠コード</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!showUnlockCode) {
                          // 表示する場合
                          if (unlockCodeViewCount >= 1) {
                            // 2回目以降は警告を表示
                            toast.warning("PDFで保存しましたか？", {
                              description: "解錠コードは一度しか表示できません。PDFで保存してください。",
                              action: {
                                label: "PDFをダウンロード",
                                onClick: () => handleExportPDF(),
                              },
                            });
                            return;
                          }
                          setUnlockCodeViewCount(prev => prev + 1);
                        }
                        setShowUnlockCode(!showUnlockCode);
                      }}
                    >
                      {showUnlockCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      value={showUnlockCode ? unlockCode || "" : "\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022"}
                      readOnly
                      className="font-mono text-center text-lg bg-background"
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={handleCopyUnlockCode}
                      title="コードをコピー（クリップボードは30秒後自動削除）"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    このコードを受取人に伝えてください（リンクとは別経路で）
                  </p>
                </div>

                {/* バックアップシェア */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      <span className="font-medium">バックアップコード</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBackupShare(!showBackupShare)}
                    >
                      {showBackupShare ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={showBackupShare ? backupShare || "" : "••••••••••••••••••••"}
                      readOnly
                      className="font-mono text-xs bg-background"
                    />
                    <Button size="icon" variant="outline" onClick={handleCopyBackupShare}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    緑急時の復旧用です。紙に印刷して安全な場所に保管してください。
                  </p>
                  
                  {/* PDF分割出力ボタン */}
                  {shareUrl && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={handleExportPDF}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      印刷用PDFを出力（3ページ分割）
                    </Button>
                  )}
                </div>

                {/* 共有リンクセクション */}
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Share2 className="h-5 w-5" />
                    <span className="font-medium">手紙を共有する</span>
                  </div>
                  
                  {!shareUrl ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        共有リンクを生成して、大切な人に手紙を届けましょう
                      </p>
                      <Button
                        onClick={handleGenerateShareLink}
                        disabled={generateShareLinkMutation.isPending}
                        className="w-full"
                      >
                        {generateShareLinkMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Share2 className="mr-2 h-4 w-4" />
                        )}
                        共有リンクを生成
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          value={shareUrl}
                          readOnly
                          className="text-sm bg-background"
                        />
                        <Button size="icon" variant="outline" onClick={handleCopyShareUrl}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => window.open(shareUrl, "_blank")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* 警告 */}
                      <Alert className="text-left border-red-500 bg-red-50 dark:bg-red-950/20">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-sm text-red-800 dark:text-red-200">
                          <strong>重要：リンクと解錠コードは別々に送ってください</strong>
                          <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>同じメッセージに両方を含めない</li>
                            <li>スクリーンショットに両方を入れない</li>
                            <li>漏洩時に第三者が開封できてしまいます</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                      
                      {/* LINE/メール共有ボタン */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 bg-[#06C755] hover:bg-[#05b34d] text-white border-0"
                          onClick={() => {
                            const text = `大切なあなたへの手紙が届いています。${unlockDate ? `\n開封可能日: ${format(unlockDate, "yyyy年M月d日", { locale: ja })}` : ""}\n\n※解錠コードは別途お伝えします`;
                            const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(text + "\n" + shareUrl)}`;
                            window.open(lineUrl, "_blank");
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          LINEで送る
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            const subject = `大切なあなたへの手紙`;
                            const body = `大切なあなたへの手紙が届いています。\n\n${unlockDate ? `開封可能日: ${format(unlockDate, "yyyy年M月d日", { locale: ja })}\n\n` : ""}以下のリンクからご覧ください。\n${shareUrl}\n\n※解錠コードは別途お伝えします`;
                            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          }}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          メールで送る
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        リンクを送った後、解錠コードを別のメッセージで送ってください
                        {unlockDate && "。開封日時までは内容を見ることができません"}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                    ホームへ
                  </Button>
                  <Button
                    onClick={() => {
                      // リセット
                      setStep("template");
                      setSelectedTemplate("");
                      setRecipientName("");
                      setRecipientRelation("");
                      setTranscription("");
                      setAiDraft("");
                      setFinalContent("");
                      setAudioUrl("");
                      setLetterId(null);
                      setUnlockDate(undefined);
                      setUnlockTime("09:00");
                      setShareToken(null);
                      setShareUrl(null);
                      setUnlockCode(null);
                      setBackupShare(null);
                      resetRecording();
                      resetEncryption();
                    }}
                    className="flex-1"
                  >
                    もう1通書く
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
