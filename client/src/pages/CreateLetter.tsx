import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Loader2, Mail, Lock, AlertTriangle, Calendar
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { TemplateCatalogDialog } from "@/components/TemplateCatalogDialog";
import { LetterCompletionView } from "@/components/LetterCompletionView";
import { TemplateSelectStep } from "@/components/create-letter/TemplateSelectStep";
import { RecordingStep } from "@/components/create-letter/RecordingStep";
import { ReviewStep } from "@/components/create-letter/ReviewStep";
import { TranscriptEditStep } from "@/components/create-letter/TranscriptEditStep";

import { useAuth } from "@/_core/hooks/useAuth";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useDraftAutoSave } from "@/hooks/useDraftAutoSave";
import { trpc } from "@/lib/trpc";
import { useEncryption } from "@/hooks/useEncryption";
import { openPrintDialog } from "@/lib/pdfExport";
import {
  arrayBufferToBase64,
  generateUnlockCode,
  wrapClientShare,
  encryptAudio
} from "@/lib/crypto";
import { splitKey } from "@/lib/shamir";
import { saveEncryptedUnlockCodeOnce } from "@/lib/deviceSecrets";

export default function CreateLetter() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<"template" | "recording" | "transcribing" | "transcript-edit" | "generating" | "editing" | "encrypting" | "complete">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isRawMode, setIsRawMode] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [recipientRelation, setRecipientRelation] = useState("");
  const [unlockDate, setUnlockDate] = useState<Date>();
  const [unlockTime, setUnlockTime] = useState("09:00");

  const [transcription, setTranscription] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [finalContent, setFinalContent] = useState("");

  const [letterId, setLetterId] = useState<number | null>(null);
  const [unlockCode, setUnlockCode] = useState("");
  const [backupShare, setBackupShare] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState<number[]>([1]);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // useDraftAutoSave hook instead of manual state
  const { draftId, isSaving, lastSaved, resetDraft } = useDraftAutoSave({
    templateName: selectedTemplate,
    recipientName,
    finalContent,
    transcription,
    aiDraft,
    currentStep: step
  });

  const {
    isRecording,
    start: startRecording,
    stop: stopRecording,
    reset: resetRecording,
    result: recordingResult,
    base64,
    elapsed,
    remaining,
    error: recordingError
  } = useVoiceRecorder();

  // Updated useEncryption usage
  const { encrypt, reset: resetEncryption } = useEncryption();

  const uploadAudioMutation = trpc.storage.uploadAudio.useMutation();
  const transcribeMutation = trpc.ai.transcribe.useMutation();
  const generateDraftMutation = trpc.ai.generateDraft.useMutation();
  const uploadCiphertextMutation = trpc.storage.uploadCiphertext.useMutation();
  const uploadEncryptedAudioMutation = trpc.storage.uploadEncryptedAudio.useMutation();
  const createLetterMutation = trpc.letter.create.useMutation();
  const setUnlockEnvelopeMutation = trpc.letter.setUnlockEnvelope.useMutation();
  const generateShareLinkMutation = trpc.letter.generateShareLink.useMutation();
  const deleteDraftMutation = trpc.draft.delete.useMutation();
  const updateReminderMutation = trpc.reminder.update.useMutation();

  const { data: templates } = trpc.template.list.useQuery();

  const MAX_DURATION = 180;

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (e) {
      console.error(e);
      toast.error("録音を開始できませんでした。マイクの許可設定を確認してください。");
    }
  };

  const handleStopRecording = async () => {
    await stopRecording();
  };
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

      // Rawモード（そのままモード）の場合はAI生成をスキップ
      if (isRawMode) {
        setAiDraft("");
        setFinalContent(transcribeResult.text);
        setStep("editing");
        return;
      }

      // 文字起こし編集ステップへ（AI生成前）
      setStep("transcript-edit");
    } catch (err) {
      console.error("Error:", err);
      toast.error("処理中にエラーが発生しました");
      setStep("recording");
    }
  };

  // 編集済み文字起こしからAI手紙を生成
  const handleGenerateFromTranscript = async () => {
    if (!transcription.trim()) {
      toast.error("文字起こしが空です");
      return;
    }

    setStep("generating");

    try {
      const draftResult = await generateDraftMutation.mutateAsync({
        transcription: transcription,
        templateName: selectedTemplate === "__free__" ? "" : selectedTemplate,
        recipientName: recipientName || undefined,
      });
      setAiDraft(draftResult.draft);
      setFinalContent(draftResult.draft);
      setStep("editing");
    } catch (err) {
      console.error("Error generating draft:", err);
      toast.error("手紙の生成に失敗しました");
      setStep("transcript-edit");
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
      const success = openPrintDialog({
        shareUrl,
        unlockCode,
        backupShare,
      });

      if (success) {
        toast.success("印刷ダイアログを開きました。各ページを別々に保管してください。");
      } else {
        toast.error("ポップアップがブロックされました");
      }
    } catch (err) {
      console.error("PDF出力エラー:", err);
      toast.error("PDF出力に失敗しました");
    }
  };

  // 保存（ゼロ知識版：暗号化 → Shamir分割 → アップロード → DB保存）
  const handleSave = async () => {
    if (!finalContent.trim()) {
      toast.error("手紙の本文がまだ空っぽです");
      return;
    }

    setShowConfirmDialog(true);
  };

  const executeSave = async () => {
    setShowConfirmDialog(false);
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

      // 6.5. 音声がある場合は暗号化してアップロード（ゼロ知識設計）
      let encryptedAudioData: {
        url: string;
        iv: string;
        mimeType: string;
        byteSize: number;
        durationSec: number;
        version: string;
      } | null = null;

      if (recordingResult?.blob) {
        try {
          // 音声を暗号化（masterKeyから導出したキーを使用）
          const audioEncrypted = await encryptAudio(recordingResult.blob, encryptResult.encryption.key);

          // 暗号化された音声をBase64に変換してアップロード
          const encryptedAudioBase64 = arrayBufferToBase64(audioEncrypted.ciphertext);
          const audioUploadResult = await uploadEncryptedAudioMutation.mutateAsync({
            encryptedAudioBase64,
            mimeType: audioEncrypted.mimeType,
            byteSize: audioEncrypted.ciphertext.byteLength,
          });

          encryptedAudioData = {
            url: audioUploadResult.url,
            iv: audioEncrypted.iv,
            mimeType: audioEncrypted.mimeType,
            byteSize: audioEncrypted.ciphertext.byteLength,
            durationSec: elapsed,
            version: audioEncrypted.version,
          };
        } catch (audioErr) {
          console.warn("音声の暗号化アップロードに失敗しました（手紙本文は保存します）", audioErr);
          // 音声の暗号化失敗は警告のみで続行（本文は保存する）
        }
      }

      // 7. DB保存（サーバーにはserverShareのみ送信、本文は送らない）
      const letterResult = await createLetterMutation.mutateAsync({
        recipientName: recipientName || undefined,
        recipientRelation: recipientRelation || undefined,
        audioUrl: audioUrl || undefined,
        audioDuration: elapsed,
        templateUsed: selectedTemplate || undefined,
        encryptionIv: encryptResult.encryption.iv,
        ciphertextUrl: uploadResult.url,
        // 暗号化済み音声メタデータ
        encryptedAudioUrl: encryptedAudioData?.url,
        encryptedAudioIv: encryptedAudioData?.iv,
        encryptedAudioMimeType: encryptedAudioData?.mimeType,
        encryptedAudioByteSize: encryptedAudioData?.byteSize,
        encryptedAudioDurationSec: encryptedAudioData?.durationSec,
        encryptedAudioCryptoVersion: encryptedAudioData?.version,
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

      // 10. 解錠コードを同一端末用1回再表示用にIndexedDBに保存
      await saveEncryptedUnlockCodeOnce(letterResult.id, code);

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
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased relative">
      {/* Background Grain Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* ヘッダー */}
      <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white/70 hover:text-white hover:bg-white/5 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <Mail className="h-5 w-5 text-white/90" />
              <span className="font-semibold tracking-tight">手紙を書く</span>
            </div>
          </div>
          {/* 下書き保存インジケーター */}
          {step !== "complete" && (draftId || isSaving || lastSaved) && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : lastSaved ? (
                <span>保存済み</span>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <main className="container py-8 md:py-12 max-w-2xl relative z-10">
        {/* ステップインジケーター */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {["template", "recording", "editing", "complete"].map((s, i) => {
            const isActive = step === s || (step === "transcribing" && s === "recording") || (step === "generating" && s === "recording") || (step === "encrypting" && s === "editing");
            const isCompleted = ["template", "recording", "transcribing", "generating", "editing", "encrypting", "complete"].indexOf(step) > ["template", "recording", "editing", "complete"].indexOf(s);

            return (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${isActive
                    ? "bg-white text-black"
                    : isCompleted
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/30"
                    }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < 3 && <div className={`w-8 h-[1px] mx-2 ${isCompleted ? "bg-white/20" : "bg-white/5"}`} />}
              </div>
            );
          })}
        </div>

        {/* テンプレート選択 */}
        {step === "template" && (
          <TemplateSelectStep
            recipientName={recipientName}
            onRecipientNameChange={setRecipientName}
            selectedTemplate={selectedTemplate}
            templates={templates}
            isCatalogOpen={isCatalogOpen}
            onCatalogOpenChange={setIsCatalogOpen}
            onSelectFree={() => {
              setSelectedTemplate("__free__");
              setIsRawMode(false);
              setStep("recording");
            }}
            onSelectRaw={() => {
              setSelectedTemplate("__free__");
              setIsRawMode(true);
              setStep("recording");
            }}
            onSelectInterview={() => navigate("/interview")}
            onSelectFromCatalog={(name) => {
              setSelectedTemplate(name);
              setIsRawMode(false);
              setIsCatalogOpen(false);
              setStep("recording");
            }}
            onNext={() => {
              setStep("recording");
              setIsRawMode(false);
            }}
          />
        )}

        {/* 録音 */}
        {step === "recording" && (
          <RecordingStep
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onResetRecording={resetRecording}
            base64={base64}
            elapsed={elapsed}
            remaining={remaining}
            maxDuration={MAX_DURATION}
            recordingError={recordingError}
            selectedTemplatePrompt={selectedTemplateData?.recordingPrompt}
            onProceed={handleProceedToTranscription}
            onBack={() => setStep("template")}
          />
        )}

        {/* 文字起こし中 */}
        {step === "transcribing" && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-12 text-center animate-in fade-in">
            <Loader2 className="h-10 w-10 animate-spin text-white/70 mx-auto mb-6" />
            <h3 className="text-lg font-bold text-white mb-2">音声を文字に変換中...</h3>
            <p className="text-sm text-white/40">しばらくお待ちください</p>
          </div>
        )}

        {/* 文字起こし編集 */}
        {step === "transcript-edit" && (
          <TranscriptEditStep
            transcript={transcription}
            onTranscriptChange={setTranscription}
            onProceed={handleGenerateFromTranscript}
            onBack={() => {
              resetRecording();
              setStep("recording");
            }}
            isRegenerating={generateDraftMutation.isPending}
          />
        )}

        {/* AI生成中 */}
        {step === "generating" && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-12 text-center animate-in fade-in">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mx-auto mb-6" />
            <h3 className="text-lg font-bold text-white mb-2">手紙を作成中...</h3>
            <p className="text-sm text-white/40">AIがあなたの想いを手紙にしています</p>
          </div>
        )}

        {/* 編集 */}
        {step === "editing" && (
          <ReviewStep
            isRawMode={isRawMode}
            transcription={transcription}
            finalContent={finalContent}
            onFinalContentChange={setFinalContent}
            recipientName={recipientName}
            onRecipientNameChange={setRecipientName}
            unlockDate={unlockDate}
            onUnlockDateSelect={setUnlockDate}
            unlockTime={unlockTime}
            onUnlockTimeChange={setUnlockTime}
            reminderEnabled={reminderEnabled}
            onReminderEnabledChange={setReminderEnabled}
            reminderDays={reminderDays}
            onReminderDaysChange={setReminderDays}
            isEncrypting={isEncrypting}
            onSave={handleSave}
          />
        )}


        {/* 暗号化中 */}
        {
          step === "encrypting" && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Lock className="h-8 w-8 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">暗号化して封緘中...</h3>
                  <p className="text-sm text-white/50 mb-6">
                    この処理はあなたの端末内で行われます。<br />
                    絶対にページを閉じないでください。
                  </p>
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 ease-out"
                      style={{ width: `${encryptionProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* 保存最終確認ダイアログ */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
            <AlertDialogHeader className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mx-auto">
                <AlertTriangle className="h-6 w-6 text-white/70" />
              </div>
              <div className="text-center space-y-2">
                <AlertDialogTitle className="text-xl">手紙を封緘しますか？</AlertDialogTitle>
                <AlertDialogDescription className="text-white/50 text-sm leading-relaxed">
                  保存を開始すると、手紙の内容はあなたの端末内で厳重に暗号化されます。<br />
                  一度封緘すると、設定された開封日まで<br />
                  <strong>あなた自身も内容を閲覧・編集できなくなります。</strong>
                </AlertDialogDescription>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">宛先</span>
                  <span className="text-white/70 font-medium">{recipientName || "指定なし"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">開封予定</span>
                  <span className="text-white/70 font-mono">
                    {unlockDate ? format(getUnlockAt()!, "yyyy/MM/dd HH:mm") : "指定なし"}
                  </span>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto bg-white/5 border-white/10 text-white hover:bg-white/10">戻って修正</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeSave}
                className="w-full sm:w-auto bg-white text-black hover:bg-white/90 font-bold"
              >
                暗号化して保存する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 完了（リファクタ版） */}
        {
          step === "complete" && (
            <LetterCompletionView
              recipientName={recipientName || undefined}
              templateName={selectedTemplateData?.displayName}
              unlockDate={unlockDate}
              unlockTime={unlockTime}
              unlockCode={unlockCode || ""}
              backupShare={backupShare || ""}
              shareUrl={shareUrl}
              onGenerateShareLink={handleGenerateShareLink}
              isGeneratingShareLink={generateShareLinkMutation.isPending}
              onExportPDF={handleExportPDF}
              onReset={() => {
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
                setUnlockCode("");
                setBackupShare("");
                resetRecording();
                resetEncryption();
              }}
            />
          )
        }
      </main >
    </div >
  );
}
