import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Sparkles,
  Lock,
  Send,
  Key,
  Mail,
  Clock,
  Shield,
  ArrowLeft,
  RefreshCw,
  Settings,
  Link2,
  PenLine
} from "lucide-react";
import { motion } from "framer-motion";

export default function HowToUse() {
  const steps = [
    {
      number: 1,
      icon: <Mic className="h-6 w-6" />,
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
      icon: <Sparkles className="h-6 w-6" />,
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
      icon: <Lock className="h-6 w-6" />,
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
      icon: <Key className="h-6 w-6" />,
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
      icon: <Send className="h-6 w-6" />,
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
      icon: <Mail className="h-6 w-6" />,
      title: "未来で開封",
      description: "開封日時になったら、解錠コードを入力して手紙を開封できます。",
      tips: [
        "解錠コードを入力すると即座に復号されます",
        "復号はブラウザ内で実行されます",
        "開封後も手紙は保存されています"
      ]
    }
  ];

  const features = [
    { icon: <Settings className="h-5 w-5" />, title: "スケジュール変更", desc: "開封日時やリマインダーは「マイレター」から後から変更できます。" },
    { icon: <RefreshCw className="h-5 w-5" />, title: "解錠コード再発行", desc: "解錠コードを紛失した場合、1回だけ再発行できます。" },
    { icon: <Link2 className="h-5 w-5" />, title: "共有リンク管理", desc: "共有リンクは無効化・再発行が可能です。" }
  ];

  const concepts = [
    { icon: <Shield className="h-5 w-5" />, title: "ゼロ知識暗号化", desc: "運営者を含め誰も内容を読めません。" },
    { icon: <Key className="h-5 w-5" />, title: "Shamir分割", desc: "復号キーは3つのシェアに分割されます。" },
    { icon: <Clock className="h-5 w-5" />, title: "時限開封", desc: "開封日時まで技術的に復号が不可能です。" }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
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
        <span className="font-semibold tracking-tight">使い方</span>
      </header>

      <main className="pt-28 pb-16 px-6 max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-16"
        >
          {/* Title */}
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block mb-4">How to Use</span>
            <h1 className="text-4xl font-bold tracking-tighter mb-6">SilentMemoの使い方</h1>
            <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
              SilentMemoは、大切な人への想いを「未来の特別な日」に届けるサービスです。
              音声で想いを録音し、AIが心のこもった手紙に仕上げ、暗号化して安全に保管します。
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="bg-white/5 border border-white/5 rounded-2xl p-6 relative"
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-white/70">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">Step {step.number}</span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight mb-2">{step.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-4">{step.description}</p>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                      <p className="text-xs text-white/40 uppercase tracking-[0.1em] mb-2">ポイント</p>
                      <ul className="space-y-1.5">
                        {step.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm text-white/50 flex items-start gap-2">
                            <span className="text-white/30 mt-0.5">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Features */}
          <div>
            <h2 className="text-2xl font-bold tracking-tighter text-center mb-8">便利な機能</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {features.map((feature, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold tracking-tight mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Concepts */}
          <div>
            <h2 className="text-2xl font-bold tracking-tighter text-center mb-8">知っておきたい仕組み</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {concepts.map((concept, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 mb-4">
                    {concept.icon}
                  </div>
                  <h3 className="font-semibold tracking-tight mb-2">{concept.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{concept.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-10 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <PenLine className="h-7 w-7 text-white/60" />
              </div>
              <h3 className="text-xl font-bold tracking-tighter mb-3">さっそく手紙を書いてみましょう</h3>
              <p className="text-white/50 mb-8">大切な人への想いを、未来の特別な日に届けませんか？</p>
              <Link href="/create">
                <Button className="bg-white text-black hover:bg-white/90 rounded-full font-semibold px-8 py-6 text-base shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <Mic className="mr-2 h-5 w-5" />
                  手紙を書く
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer Link */}
          <div className="text-center">
            <Link href="/faq">
              <span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">
                注意点・FAQを見る →
              </span>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
