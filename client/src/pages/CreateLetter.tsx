import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useEncryption } from "@/hooks/useEncryption";
import { formatDuration } from "@/lib/audio";
import { getLoginUrl } from "@/const";
import { useLocation, useSearch } from "wouter";
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
  Lock
} from "lucide-react";
import { toast } from "sonner";

type Step = "template" | "recording" | "transcribing" | "generating" | "editing" | "encrypting" | "complete";

const iconMap: Record<string, React.ReactNode> = {
  cake: <Cake className="h-6 w-6" />,
  "graduation-cap": <GraduationCap className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
};

const MAX_DURATION = 90; // 90秒

export default function CreateLetter() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialTemplate = searchParams.get("template") || "";

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

  // 録音停止 → 文字起こし → AI生成
  const handleStopRecording = async () => {
    const result = await stop();
    if (!result || !base64) return;

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

  // 保存（暗号化 → アップロード → DB保存）
  const handleSave = async () => {
    if (!finalContent.trim()) {
      toast.error("手紙の内容を入力してください");
      return;
    }

    setStep("encrypting");

    try {
      // 暗号化
      const encryptResult = await encrypt(finalContent);
      if (!encryptResult) {
        throw new Error("暗号化に失敗しました");
      }

      // 暗号文をアップロード
      const uploadResult = await uploadCiphertextMutation.mutateAsync({
        ciphertextBase64: encryptResult.encryption.ciphertext,
      });

      // DB保存
      const letterResult = await createLetterMutation.mutateAsync({
        recipientName: recipientName || undefined,
        recipientRelation: recipientRelation || undefined,
        audioUrl: audioUrl || undefined,
        audioDuration: elapsed,
        transcription: transcription || undefined,
        aiDraft: aiDraft || undefined,
        finalContent: finalContent,
        templateUsed: selectedTemplate || undefined,
        encryptionIv: encryptResult.encryption.iv,
        ciphertextUrl: uploadResult.url,
        proofHash: encryptResult.proof.hash,
      });

      setLetterId(letterResult.id);
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
        <div className="container flex h-16 items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-semibold">手紙を書く</span>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* ステップインジケーター */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["template", "recording", "editing", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
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
              {i < 3 && <div className="w-8 h-0.5 bg-muted mx-1" />}
            </div>
          ))}
        </div>

        {/* テンプレート選択 */}
        {step === "template" && (
          <Card>
            <CardHeader>
              <CardTitle>テンプレートを選ぶ</CardTitle>
              <CardDescription>
                手紙のシーンを選んでください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates?.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTemplate === template.name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedTemplate(template.name)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          {iconMap[template.icon || ""] || <Mail className="h-6 w-6" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{template.displayName}</h3>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        {selectedTemplate === template.name && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">宛先の名前（任意）</Label>
                  <Input
                    id="recipientName"
                    placeholder="例：太郎"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientRelation">関係（任意）</Label>
                  <Select value={recipientRelation} onValueChange={setRecipientRelation}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="son">息子</SelectItem>
                      <SelectItem value="daughter">娘</SelectItem>
                      <SelectItem value="child">子ども</SelectItem>
                      <SelectItem value="grandchild">孫</SelectItem>
                      <SelectItem value="other">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => setStep("recording")}
                disabled={!selectedTemplate}
                className="w-full"
              >
                次へ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 録音 */}
        {step === "recording" && (
          <Card>
            <CardHeader>
              <CardTitle>90秒で想いを録音</CardTitle>
              <CardDescription>
                {selectedTemplateData?.recordingPrompt || "思いつくままに話してください"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="text-center">
                {/* タイマー */}
                <div className="text-6xl font-mono font-bold mb-4">
                  {isRecording ? formatDuration(remaining) : formatDuration(MAX_DURATION)}
                </div>

                {/* 波形アニメーション */}
                {isRecording && (
                  <div className="flex items-center justify-center gap-1 h-12 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="wave-bar w-2 bg-primary rounded-full"
                        style={{ height: "100%" }}
                      />
                    ))}
                  </div>
                )}

                {/* 録音ボタン */}
                <Button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className={`w-24 h-24 rounded-full ${isRecording ? "recording-pulse" : ""}`}
                >
                  {isRecording ? (
                    <Square className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </Button>

                <p className="text-sm text-muted-foreground mt-4">
                  {isRecording ? "録音中... タップして停止" : "タップして録音開始"}
                </p>

                {recordingError && (
                  <p className="text-sm text-destructive mt-2">{recordingError}</p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  resetRecording();
                  setStep("template");
                }}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                戻る
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 文字起こし中 */}
        {step === "transcribing" && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <div className="text-lg font-medium">文字起こし中...</div>
                <p className="text-sm text-muted-foreground">
                  音声をテキストに変換しています
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI生成中 */}
        {step === "generating" && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <div className="text-lg font-medium">手紙を生成中...</div>
                <p className="text-sm text-muted-foreground">
                  AIが温かい手紙を作成しています
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 編集 */}
        {step === "editing" && (
          <Card>
            <CardHeader>
              <CardTitle>手紙を確認・編集</CardTitle>
              <CardDescription>
                内容を確認し、必要に応じて編集してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {transcription && (
                <div className="space-y-2">
                  <Label>文字起こし結果</Label>
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    {transcription}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="finalContent">手紙の内容</Label>
                <Textarea
                  id="finalContent"
                  value={finalContent}
                  onChange={(e) => setFinalContent(e.target.value)}
                  rows={12}
                  className="letter-content text-base"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetRecording();
                    setStep("recording");
                  }}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  録り直す
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  <Lock className="mr-2 h-4 w-4" />
                  暗号化して保存
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 暗号化中 */}
        {step === "encrypting" && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <div className="text-lg font-medium">{encryptionProgress || "暗号化中..."}</div>
                <p className="text-sm text-muted-foreground">
                  あなたの想いを安全に保護しています
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 完了 */}
        {step === "complete" && (
          <Card>
            <CardContent className="py-16">
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">暗号化</span>
                    <span className="text-green-600">AES-256-GCM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">証跡</span>
                    <span className="text-green-600">SHA-256</span>
                  </div>
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
