import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  Shield,
  Key,
  Clock,
  HelpCircle,
  RefreshCw,
  Trash2,
  FileText,
  ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function FAQ() {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const warnings = [
    {
      icon: <Key className="h-5 w-5" />,
      title: "解錠コードは絶対に紛失しないでください",
      description: "解錠コードを紛失すると、手紙を開封できなくなります。運営者でも復元できません。",
      severity: "critical"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "バックアップシェアも保管してください",
      description: "万が一の場合に備えて、バックアップシェアも保管しておくことをお勧めします。",
      severity: "warning"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "開封日時は変更可能ですが、開封済みの手紙は変更できません",
      description: "開封日時は「マイレター」から変更できます。",
      severity: "info"
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      title: "解錠コードの再発行は1回のみです",
      description: "解錠コードを紛失した場合、1回だけ再発行できます。旧コードは無効になります。",
      severity: "warning"
    },
    {
      icon: <Trash2 className="h-5 w-5" />,
      title: "削除した手紙は復元できません",
      description: "手紙を削除すると、サーバーから完全に削除されます。",
      severity: "info"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "下書きはサーバーに保存されます",
      description: "「ゼロ知識」が適用されるのは、封緘（暗号化）後の手紙のみです。",
      severity: "info"
    }
  ];

  const faqs = [
    {
      category: "基本的な使い方",
      questions: [
        { q: "SilentMemoとは何ですか？", a: "SilentMemoは、大切な人への想いを「未来の特別な日」に届けるサービスです。音声で想いを録音し、AIが心のこもった手紙に仕上げ、暗号化して安全に保管します。" },
        { q: "手紙を書くのに費用はかかりますか？", a: "現在、SilentMemoは無料でご利用いただけます。将来的に有料プランを導入する可能性がありますが、既存の手紙には影響しません。" },
        { q: "何通まで手紙を書けますか？", a: "現在、手紙の数に制限はありません。ただし、サービスの安定運用のため、将来的に制限を設ける可能性があります。" },
        { q: "音声録音は必須ですか？", a: "はい、現在は音声録音から手紙を作成する方式のみ対応しています。90秒以内で想いを話していただき、AIが手紙に仕上げます。" }
      ]
    },
    {
      category: "セキュリティ・プライバシー",
      questions: [
        { q: "「ゼロ知識」とは何ですか？", a: "ゼロ知識暗号化とは、サービス運営者でさえも内容を読むことができない暗号化方式です。手紙の暗号化をすべてあなたの端末で行い、サーバーには暗号文のみを保存します。" },
        { q: "運営者は本当に手紙を読めないのですか？", a: "はい、技術的に読むことができません。復号キーはShamir分割により分散されており、解錠コードがなければ復号できません。" },
        { q: "下書きも暗号化されていますか？", a: "いいえ、下書きは暗号化されていません。「ゼロ知識」が適用されるのは、封緬（暗号化）後の手紙本文のみです。" },
        { q: "データはどこに保存されていますか？", a: "暗号化された手紙はAWS S3に、メタデータはTiDB（MySQL互換データベース）に保存されています。" }
      ]
    },
    {
      category: "解錠コード・開封",
      questions: [
        { q: "解錠コードとは何ですか？", a: "解錠コードは、手紙を開封するために必要な12文字のコードです。手紙を封緬する際に生成され、このコードがないと手紙を開封できません。" },
        { q: "解錠コードを紛失したらどうなりますか？", a: "解錠コードを紛失した場合、1回だけ再発行できます。「マイレター」から手紙の詳細を開き、「解錠コードを再発行」ボタンを押してください。" },
        { q: "開封日時前に手紙を開封できますか？", a: "いいえ、技術的に不可能です。開封日時前は、サーバーが「サーバーシェア」を提供しないため、解錠コードがあっても復号できません。" },
        { q: "手紙は何回開封できますか？", a: "開封日時後であれば、何度でも開封できます。ただし、解錠コードは毎回入力する必要があります。" }
      ]
    },
    {
      category: "トラブルシューティング",
      questions: [
        { q: "音声が録音できません", a: "ブラウザがマイクへのアクセスを許可しているか確認してください。また、HTTPS接続でないとマイクが使用できない場合があります。" },
        { q: "AIの生成が失敗します", a: "一時的なサーバーの問題の可能性があります。しばらく待ってから再度お試しください。" },
        { q: "共有リンクが開けません", a: "リンクが正しくコピーされているか確認してください。また、手紙がキャンセルされている場合は開けません。" },
        { q: "解錠コードを入力しても開封できません", a: "解錠コードが正しいか確認してください。また、開封日時前の場合は開封できません。" }
      ]
    }
  ];

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 border-red-500/20 text-red-400";
      case "warning": return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      default: return "bg-white/5 border-white/10 text-white/60";
    }
  };

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
        <span className="font-semibold tracking-tight">よくある質問</span>
      </header>

      <main className="pt-28 pb-16 px-6 max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-16"
        >
          {/* Title */}
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block mb-4">FAQ</span>
            <h1 className="text-4xl font-bold tracking-tighter mb-4">注意点・よくある質問</h1>
            <p className="text-white/50">SilentMemoをご利用いただく前に、必ずお読みください。</p>
          </div>

          {/* Warnings */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-bold tracking-tighter">重要な注意点</h2>
            </div>

            <div className="grid gap-3">
              {warnings.map((warning, index) => (
                <div key={index} className={`border rounded-2xl p-5 flex items-start gap-4 ${getSeverityStyles(warning.severity)}`}>
                  <div className="shrink-0 mt-0.5">{warning.icon}</div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{warning.title}</h3>
                    <p className="text-sm text-white/50">{warning.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="space-y-8">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="h-5 w-5 text-white/60" />
              <h2 className="text-xl font-bold tracking-tighter">よくある質問</h2>
            </div>

            {faqs.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                  <h3 className="font-semibold tracking-tight">{category.category}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {category.questions.map((item, itemIndex) => {
                    const id = `${categoryIndex}-${itemIndex}`;
                    const isOpen = openItems.includes(id);
                    return (
                      <div key={itemIndex} className="px-6">
                        <button
                          onClick={() => toggleItem(id)}
                          className="w-full py-4 flex items-center justify-between text-left"
                        >
                          <span className="text-sm text-white/80 pr-4">{item.q}</span>
                          <ChevronDown className={`h-4 w-4 text-white/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="pb-4 text-sm text-white/50 leading-relaxed">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* Footer Links */}
          <div className="text-center space-y-4">
            <Link href="/how-to-use">
              <span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors block">
                ← 使い方を見る
              </span>
            </Link>
            <Link href="/contact">
              <span className="text-sm text-white/30 hover:text-white cursor-pointer transition-colors block">
                お問い合わせ
              </span>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
