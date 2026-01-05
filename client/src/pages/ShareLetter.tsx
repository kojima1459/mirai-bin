import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  Mail, 
  Lock, 
  Clock, 
  Cake, 
  GraduationCap, 
  Heart,
  AlertCircle,
  Home,
  School,
  BookOpen,
  Star,
  Briefcase,
  Baby,
  HandHeart,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";
import { decryptLetter } from "@/lib/crypto";
import { combineShares } from "@/lib/shamir";

const iconMap: Record<string, React.ReactNode> = {
  "10years": <Cake className="h-8 w-8" />,
  graduation: <GraduationCap className="h-8 w-8" />,
  "first-love": <Heart className="h-8 w-8" />,
  "elementary-graduation": <School className="h-8 w-8" />,
  "junior-high-entrance": <School className="h-8 w-8" />,
  "junior-high-graduation": <School className="h-8 w-8" />,
  "high-school-entrance": <BookOpen className="h-8 w-8" />,
  "high-school-graduation": <GraduationCap className="h-8 w-8" />,
  "university-entrance": <GraduationCap className="h-8 w-8" />,
  "coming-of-age": <Star className="h-8 w-8" />,
  "first-job": <Briefcase className="h-8 w-8" />,
  "wedding-day": <Heart className="h-8 w-8" />,
  "first-child": <Baby className="h-8 w-8" />,
  "hard-times": <HandHeart className="h-8 w-8" />,
  "someday": <Mail className="h-8 w-8" />,
};

const templateNameMap: Record<string, string> = {
  "10years": "10歳へ",
  graduation: "進学の朝に",
  "first-love": "最初に恋をした日へ",
  "elementary-graduation": "小学校卒業の日に",
  "junior-high-entrance": "中学校入学の日に",
  "junior-high-graduation": "中学校卒業の日に",
  "high-school-entrance": "高校入学の日に",
  "high-school-graduation": "高校卒業の日に",
  "university-entrance": "大学入学の日に",
  "coming-of-age": "成人の日に",
  "first-job": "就職の日に",
  "wedding-day": "結婚する日に",
  "first-child": "子どもが生まれた日に",
  "hard-times": "辛いときに読んで",
  "someday": "いつか読んでほしい手紙",
};

export default function ShareLetter() {
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const token = params.token || "";
  
  const [userAgent, setUserAgent] = useState("");
  const [countdown, setCountdown] = useState<string>("");
  const [clientShare, setClientShare] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // URLフラグメントからクライアントシェアを取得
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#key=")) {
      const share = decodeURIComponent(hash.substring(5));
      setClientShare(share);
    }
  }, []);

  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);

  const { data, isLoading, error } = trpc.letter.getByShareToken.useQuery(
    { shareToken: token, userAgent },
    { enabled: !!token && !!userAgent }
  );

  // 復号処理（Shamir分割対応）
  useEffect(() => {
    const performDecryption = async () => {
      if (data && "canUnlock" in data && data.canUnlock && data.letter && clientShare) {
        // 既に復号済みの場合はスキップ
        if (decryptedContent) return;
        
        setIsDecrypting(true);
        setDecryptionError(null);
        
        try {
          let decryptionKey: string;
          
          // Shamir分割を使用している場合はシェアを結合
          if (data.useShamir && data.serverShare) {
            decryptionKey = await combineShares(clientShare, data.serverShare);
          } else {
            // 従来の方式（後方互換性）
            decryptionKey = clientShare;
          }
          
          // S3から暗号文を取得
          const response = await fetch(data.letter.ciphertextUrl);
          if (!response.ok) {
            throw new Error("暗号文の取得に失敗しました");
          }
          const ciphertext = await response.text();
          
          // 復号
          const plaintext = await decryptLetter(
            ciphertext,
            data.letter.encryptionIv,
            decryptionKey
          );
          
          setDecryptedContent(plaintext);
        } catch (err) {
          console.error("Decryption error:", err);
          setDecryptionError(
            err instanceof Error 
              ? err.message 
              : "復号に失敗しました。リンクが正しいか確認してください。"
          );
        } finally {
          setIsDecrypting(false);
        }
      }
    };
    
    performDecryption();
  }, [data, clientShare, decryptedContent]);

  // カウントダウン更新
  useEffect(() => {
    if (data && "canUnlock" in data && !data.canUnlock && data.unlockAt) {
      const updateCountdown = () => {
        const now = new Date();
        const unlockDate = new Date(data.unlockAt!);
        const diff = unlockDate.getTime() - now.getTime();
        
        if (diff <= 0) {
          setCountdown("開封可能になりました");
          // ページをリロード
          window.location.reload();
          return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) {
          setCountdown(`${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`);
        } else if (hours > 0) {
          setCountdown(`${hours}時間 ${minutes}分 ${seconds}秒`);
        } else if (minutes > 0) {
          setCountdown(`${minutes}分 ${seconds}秒`);
        } else {
          setCountdown(`${seconds}秒`);
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [data]);

  // ローディング
  if (isLoading || !userAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー
  if (error || (data && "error" in data)) {
    const errorType = data && "error" in data ? data.error : "unknown";
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold">
                {errorType === "not_found" ? "手紙が見つかりません" : 
                 errorType === "canceled" ? "この手紙はキャンセルされました" : 
                 "エラーが発生しました"}
              </h2>
              <p className="text-muted-foreground">
                {errorType === "not_found" ? "リンクが無効か、手紙が削除された可能性があります。" : 
                 errorType === "canceled" ? "送信者によってこの手紙はキャンセルされました。" : 
                 "しばらく経ってからもう一度お試しください。"}
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                ホームへ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Bot向けレスポンス（通常は表示されない）
  if (data && "isBot" in data && data.isBot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Mail className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-2xl font-bold">{data.title}</h1>
              <p className="text-muted-foreground">{data.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 開封前（カウントダウン表示）
  if (data && "canUnlock" in data && !data.canUnlock) {
    const unlockDate = data.unlockAt ? new Date(data.unlockAt) : null;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              {data.templateUsed ? (
                iconMap[data.templateUsed] || <Mail className="h-8 w-8" />
              ) : (
                <Mail className="h-8 w-8" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {data.recipientName ? `${data.recipientName}へ` : "あなたへ"}
            </CardTitle>
            <CardDescription>
              {data.templateUsed && templateNameMap[data.templateUsed]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-amber-600 mb-4">
                <Lock className="h-5 w-5" />
                <span className="font-medium">まだ開封できません</span>
              </div>
              
              <div className="bg-muted rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>開封可能日時</span>
                </div>
                {unlockDate && (
                  <div className="text-lg font-medium">
                    {format(unlockDate, "yyyy年M月d日 HH:mm", { locale: ja })}
                  </div>
                )}
                <div className="text-3xl font-bold text-primary">
                  {countdown}
                </div>
                <p className="text-sm text-muted-foreground">
                  あなたへの想いが届くまで、もう少しお待ちください
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 開封可能（手紙表示）
  if (data && "canUnlock" in data && data.canUnlock && data.letter) {
    const letter = data.letter;
    
    // クライアントシェアがない場合
    if (!clientShare) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <KeyRound className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold">復号キーが見つかりません</h2>
                <p className="text-muted-foreground">
                  この手紙を開封するには、正しい共有リンクが必要です。
                  送信者から受け取ったリンクを再度確認してください。
                </p>
                <Button onClick={() => navigate("/")} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  ホームへ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // 復号中
    if (isDecrypting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">手紙を開封しています...</p>
          </div>
        </div>
      );
    }
    
    // 復号エラー
    if (decryptionError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold">開封に失敗しました</h2>
                <p className="text-muted-foreground">
                  {decryptionError}
                </p>
                <Button onClick={() => navigate("/")} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  ホームへ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // 復号成功 - 手紙を表示
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center border-b">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                {letter.templateUsed ? (
                  iconMap[letter.templateUsed] || <Mail className="h-6 w-6" />
                ) : (
                  <Mail className="h-6 w-6" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {letter.recipientName ? `${letter.recipientName}へ` : "あなたへ"}
              </CardTitle>
              <CardDescription>
                {letter.templateUsed && templateNameMap[letter.templateUsed]}
              </CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              <div className="letter-content whitespace-pre-wrap leading-relaxed text-lg">
                {decryptedContent || letter.finalContent}
              </div>
              
              <div className="mt-8 pt-6 border-t text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>作成日</span>
                  <span>{format(new Date(letter.createdAt), "yyyy年M月d日", { locale: ja })}</span>
                </div>
                {letter.unlockAt && (
                  <div className="flex justify-between">
                    <span>開封可能日</span>
                    <span>{format(new Date(letter.unlockAt), "yyyy年M月d日", { locale: ja })}</span>
                  </div>
                )}
                {letter.unlockedAt && (
                  <div className="flex justify-between">
                    <span>開封日</span>
                    <span>{format(new Date(letter.unlockedAt), "yyyy年M月d日 HH:mm", { locale: ja })}</span>
                  </div>
                )}
                {decryptedContent && (
                  <div className="flex justify-between">
                    <span>暗号化</span>
                    <span className="text-green-600">AES-256-GCM で保護</span>
                  </div>
                )}
                
                {/* 証跡情報 */}
                {letter.proofInfo && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-medium">存在証明</span>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>ステータス</span>
                        <span>{letter.proofInfo.statusLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ハッシュ</span>
                        <span className="font-mono">{letter.proofInfo.hashShort}</span>
                      </div>
                      <p className="text-muted-foreground pt-1">
                        {letter.proofInfo.statusDescription}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              あなたも大切な人に想いを届けませんか？
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              未来便で手紙を書く
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
