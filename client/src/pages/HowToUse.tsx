import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mic, 
  Sparkles, 
  Lock, 
  Send, 
  Key, 
  Mail,
  ArrowRight,
  Clock,
  Shield,
  FileText,
  Home,
  RefreshCw,
  Settings,
  Link2
} from "lucide-react";

export default function HowToUse() {
  const steps = [
    {
      number: 1,
      icon: <Mic className="h-8 w-8" />,
      title: "想いを声に出す",
      description: "90秒以内で、伝えたい想いを自由に話してください。テンプレートを選ぶと、話しやすくなります。",
      tips: [
        "静かな場所で録音すると、文字起こしの精度が上がります",
        "話し言葉でOK。AIが手紙らしく整えます",
        "何度でも録り直せます"
      ]
    },
    {
      number: 2,
      icon: <Sparkles className="h-8 w-8" />,
      title: "AIが手紙を作成",
      description: "録音した内容をAIが文字起こしし、心のこもった手紙に仕上げます。",
      tips: [
        "生成された手紙は自由に編集できます",
        "下書きは自動保存されます",
        "納得いくまで何度でも再生成できます"
      ]
    },
    {
      number: 3,
      icon: <Lock className="h-8 w-8" />,
      title: "暗号化して封緘",
      description: "手紙はあなたの端末で暗号化されます。運営者を含め、誰も内容を読むことができません。",
      tips: [
        "AES-256-GCM + Shamir分割で保護",
        "暗号化は完全にブラウザ内で実行",
        "サーバーには暗号文のみ保存"
      ]
    },
    {
      number: 4,
      icon: <Key className="h-8 w-8" />,
      title: "解錠コードを保管",
      description: "12文字の解錠コードが生成されます。これは手紙を開封するために必要です。",
      tips: [
        "解錠コードは必ずメモして保管してください",
        "紛失すると手紙を開封できなくなります",
        "バックアップシェアも保管しておくと安心です"
      ]
    },
    {
      number: 5,
      icon: <Send className="h-8 w-8" />,
      title: "共有リンクを送る",
      description: "生成された共有リンクと解錠コードを、大切な人に渡してください。",
      tips: [
        "リンクと解錠コードは別々に渡すと安全です",
        "開封日時を設定した場合、その日まで開封できません",
        "リンクは何度でもコピーできます"
      ]
    },
    {
      number: 6,
      icon: <Mail className="h-8 w-8" />,
      title: "未来で開封",
      description: "開封日時になったら、解錠コードを入力して手紙を開封できます。",
      tips: [
        "解錠コードを入力すると即座に復号されます",
        "復号はブラウザ内で実行されます",
        "開封後も手紙は保存されています"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">未来便</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground">
              注意点・FAQ
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                ホームへ
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-12">
        {/* タイトル */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">未来便の使い方</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            未来便は、大切な人への想いを「未来の特別な日」に届けるサービスです。
            音声で想いを録音し、AIが心のこもった手紙に仕上げ、暗号化して安全に保管します。
          </p>
        </div>

        {/* ステップ */}
        <div className="space-y-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <Card key={step.number} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary/20" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                  <div>
                    <CardDescription>ステップ {step.number}</CardDescription>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{step.description}</p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">ポイント</p>
                  <ul className="space-y-1">
                    {step.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              {index < steps.length - 1 && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="w-8 h-8 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-primary/60 rotate-90" />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* 便利な機能 */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">便利な機能</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                  <Settings className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">スケジュール変更</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  開封日時やリマインダーは後から変更できます。
                  「マイレター」から手紙の詳細を開き、「スケジュール設定」で変更できます。
                  ※開封済みの手紙は変更できません。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">解錠コード再発行</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  解錠コードを紛失した場合、1回だけ再発行できます。
                  再発行後は新しい封筒PDFをダウンロードしてください。
                  旧コードは無効になります。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mb-2">
                  <Link2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">共有リンク管理</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  共有リンクは無効化・再発行が可能です。
                  リンクが漏れた場合や、受取人を変更したい場合に便利です。
                  旧リンクは自動的に無効になります。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 重要な概念 */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">知っておきたい仕組み</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">ゼロ知識暗号化</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  手紙の暗号化はすべてあなたの端末で行われます。
                  サーバーには暗号文のみが保存され、運営者を含め誰も内容を読むことができません。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                  <Key className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">Shamir分割</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  復号キーは3つのシェアに分割されます。
                  開封には「解錠コード」と「サーバーシェア」の2つが必要で、
                  どちらか一方だけでは復号できません。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                  <Clock className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">時限開封</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  開封日時を設定すると、その日時までサーバーシェアが提供されません。
                  技術的に開封日時前の復号が不可能な仕組みです。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Card className="max-w-xl mx-auto bg-primary/5 border-primary/20">
            <CardContent className="py-8">
              <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">さっそく手紙を書いてみましょう</h3>
              <p className="text-muted-foreground mb-6">
                大切な人への想いを、未来の特別な日に届けませんか？
              </p>
              <Link href="/create">
                <Button size="lg">
                  <Mic className="mr-2 h-5 w-5" />
                  手紙を書く
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* フッターリンク */}
        <div className="mt-12 text-center">
          <Link href="/faq" className="text-primary hover:underline">
            注意点・FAQを見る →
          </Link>
        </div>
      </main>
    </div>
  );
}
