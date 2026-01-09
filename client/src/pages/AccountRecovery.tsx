import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, FileText, Key, Mail, Shield, Users, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AccountRecovery() {
  const handleCopyExplanation = () => {
    const text = `【未来便 アカウント引き継ぎ情報】

私は「未来便」というサービスを使って、あなた（または子ども）に手紙を残しています。
開封日が来たら、以下の手順で手紙を読むことができます。

■ 必要な情報
• 共有リンク（URL）
• 解錠コード（12文字の英数字）

■ 開封手順
1. 開封日が来たら、共有リンクをブラウザで開く
2. 解錠コードを入力する
3. 手紙が表示されます

■ 注意事項
• 解錠コードは運営者も知りません（ゼロ知識設計）
• 解錠コードを紛失すると、永久に開封できなくなります
• 開封日前は、サーバー側の制限により開封できません`;
    navigator.clipboard.writeText(text);
    toast.success("説明文をコピーしました");
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
        <span className="font-semibold tracking-tight">アカウント引き継ぎ</span>
      </header>

      <main className="pt-28 pb-16 px-6 max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="mb-12">
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block mb-4">Account Recovery</span>
            <h1 className="text-3xl font-bold tracking-tighter mb-4">アカウント引き継ぎ・復旧ガイド</h1>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-white/70 leading-relaxed">
              未来便は「ゼロ知識設計」のため、運営者も手紙の本文や解錠コードを読めません。
              アカウントを失うと手紙が永久に開封できなくなる可能性があります。
              このページの手順に従って、大切な人に引き継ぎ情報を残しておきましょう。
            </div>
          </div>

          {/* 1. 保管すべき情報 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">1. 保管すべき情報</h2>
                <p className="text-xs text-white/40">以下の情報を安全な場所に保管してください。</p>
              </div>
            </div>

            <div className="space-y-4 pl-2">
              <div className="flex items-start gap-4">
                <Key className="h-5 w-5 text-white/50 mt-1 shrink-0" />
                <div>
                  <h3 className="font-medium text-white">解錠コード（最重要）</h3>
                  <p className="text-sm text-white/50 mt-1">手紙作成時にダウンロードしたPDFに記載されています。このコードがないと、開封日が来ても手紙を読めません。</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="h-5 w-5 text-white/50 mt-1 shrink-0" />
                <div>
                  <h3 className="font-medium text-white">共有リンク</h3>
                  <p className="text-sm text-white/50 mt-1">手紙を開封するためのURLです。PDFまたは「マイレター」画面から確認できます。</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Shield className="h-5 w-5 text-white/50 mt-1 shrink-0" />
                <div>
                  <h3 className="font-medium text-white">アカウント情報</h3>
                  <p className="text-sm text-white/50 mt-1">ログインに使用しているメールアドレス。設定画面から確認・変更できます。</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 推奨される保管場所 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">2. 推奨される保管場所</h2>
                <p className="text-xs text-white/40">複数の場所に分散して保管することをおすすめします。</p>
              </div>
            </div>

            <div className="space-y-3 pl-2">
              {[
                { title: "銀行の貸金庫", desc: "最も安全な方法。PDFを印刷して保管します。" },
                { title: "遺言書や重要書類と一緒に保管", desc: "弁護士や司法書士に預ける遺言書に同封する方法。" },
                { title: "信頼できる第三者に預ける", desc: "配偶者や親族など、信頼できる人に「開封日まで開けないこと」を条件に預ける。" },
                { title: "パスワード管理ツール", desc: "1Password、Bitwarden、LastPassなど。緊急アクセス機能を設定しておくと安心です。" }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-medium text-white">{item.title}</h3>
                    <p className="text-sm text-white/50 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 配偶者・家族への説明 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">3. 配偶者・家族への説明文</h2>
                <p className="text-xs text-white/40">以下の文章をコピーして、大切な人に渡してください。</p>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 text-sm text-white/60 leading-relaxed space-y-4">
              <p className="font-semibold text-white">【未来便 アカウント引き継ぎ情報】</p>
              <p>私は「未来便」というサービスを使って、あなた（または子ども）に手紙を残しています。開封日が来たら、以下の手順で手紙を読むことができます。</p>
              <div>
                <p className="font-medium text-white/80 mb-1">■ 必要な情報</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>共有リンク（URL）</li>
                  <li>解錠コード（12文字の英数字）</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-white/80 mb-1">■ 開封手順</p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>開封日が来たら、共有リンクをブラウザで開く</li>
                  <li>解錠コードを入力する</li>
                  <li>手紙が表示されます</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-white/80 mb-1">■ 注意事項</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>解錠コードは運営者も知りません（ゼロ知識設計）</li>
                  <li>解錠コードを紛失すると、永久に開封できなくなります</li>
                </ul>
              </div>
            </div>

            <Button variant="outline" onClick={handleCopyExplanation} className="border-white/10 text-white hover:bg-white/5 rounded-full">
              <FileText className="mr-2 h-4 w-4" />
              説明文をコピー
            </Button>
          </div>

          {/* 4. アカウント喪失時の対処法 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">4. アカウントを失った場合</h2>
                <p className="text-xs text-white/40">ログインできなくなった場合の対処法です。</p>
              </div>
            </div>

            <div className="space-y-4 pl-2">
              <div>
                <h3 className="font-medium text-white">Q. ログインできなくなりました</h3>
                <p className="text-sm text-white/50 mt-1">A. 設定画面からアカウントメールを変更できます。ログインできる状態で、新しいメールアドレスに変更してください。</p>
              </div>
              <div>
                <h3 className="font-medium text-white">Q. 解錠コードを紛失しました</h3>
                <p className="text-sm text-white/50 mt-1">A. 残念ながら、運営者も解錠コードを知らないため、復旧できません。これがゼロ知識設計の特徴です。</p>
              </div>
              <div>
                <h3 className="font-medium text-white">Q. 共有リンクを忘れました</h3>
                <p className="text-sm text-white/50 mt-1">A. ログイン後、「マイレター」画面から確認できます。</p>
              </div>
            </div>
          </div>

          {/* 関連リンク */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold tracking-tight">関連リンク</h2>
            <div className="space-y-3">
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start border-white/10 text-white hover:bg-white/5 rounded-xl">
                  <Mail className="mr-2 h-4 w-4" />
                  設定画面（メール変更）
                </Button>
              </Link>
              <Link href="/my-letters">
                <Button variant="outline" className="w-full justify-start border-white/10 text-white hover:bg-white/5 rounded-xl">
                  <FileText className="mr-2 h-4 w-4" />
                  マイレター（共有リンク確認）
                </Button>
              </Link>
              <Link href="/faq">
                <Button variant="outline" className="w-full justify-start border-white/10 text-white hover:bg-white/5 rounded-xl">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  よくある質問
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
