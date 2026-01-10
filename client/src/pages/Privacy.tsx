import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Privacy() {
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
        <span className="font-semibold tracking-tight">プライバシーポリシー</span>
      </header>

      <main className="pt-28 pb-16 px-6 max-w-3xl mx-auto relative z-10">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-12"
        >
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block mb-4">Privacy Policy</span>
            <h1 className="text-4xl font-bold tracking-tighter mb-4">プライバシーポリシー</h1>
            <p className="text-white/40 text-sm">最終更新日: 2025年1月6日</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">1. はじめに</h2>
            <p className="text-white/60 leading-relaxed">
              未来便（以下「本サービス」）は、お客様のプライバシーを尊重し、個人情報の保護に努めています。
              本プライバシーポリシーは、本サービスがどのような情報を収集し、どのように使用・保護するかを説明します。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">2. 収集する情報</h2>
            <p className="text-white/60 leading-relaxed mb-4">本サービスは、以下の情報を収集する場合があります：</p>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>アカウント情報（メールアドレス、表示名）</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>手紙の内容（暗号化された状態で保存）</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>音声録音データ（暗号化された状態で保存）</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>利用状況に関するデータ（アクセスログ等）</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">3. 情報の暗号化について</h2>
            <p className="text-white/60 leading-relaxed mb-4">本サービスでは、お客様のプライバシーを最大限に保護するため、以下の暗号化技術を採用しています：</p>
            <ul className="space-y-3 text-white/60">
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span><span><strong className="text-white/80">クライアント側暗号化（AES-GCM-256）</strong>: 手紙の内容はお客様のデバイス上で暗号化され、サーバーには暗号化されたデータのみが保存されます。</span></li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span><span><strong className="text-white/80">Shamir's Secret Sharing</strong>: 復号キーは複数のシェアに分割され、開封日時まで手紙を復号することはできません。</span></li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span><span><strong className="text-white/80">ゼロ知識設計</strong>: 本サービスの運営者でさえ、お客様の手紙の内容を読むことはできません。</span></li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">4. 情報の利用目的</h2>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>サービスの提供・運営</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>お客様からのお問い合わせへの対応</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>サービスの改善・新機能の開発</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>不正利用の防止</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">5. 情報の第三者提供</h2>
            <p className="text-white/60 leading-relaxed">
              本サービスは、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">6. データの保存期間</h2>
            <p className="text-white/60 leading-relaxed">
              手紙データは、お客様が削除するまで、または開封後一定期間（開封から1年間）保存されます。
              アカウント情報は、退会後30日間保存した後、完全に削除されます。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">7. お客様の権利</h2>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>個人情報の開示・訂正・削除を請求する権利</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>データのエクスポートを請求する権利</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>アカウントを削除する権利</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">8. Cookieの使用</h2>
            <p className="text-white/60 leading-relaxed">
              本サービスは、セッション管理およびサービス改善のためにCookieを使用します。
              Cookieはブラウザの設定により無効化できますが、一部の機能が利用できなくなる場合があります。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">9. プライバシーポリシーの変更</h2>
            <p className="text-white/60 leading-relaxed">
              本プライバシーポリシーは、必要に応じて変更されることがあります。
              重要な変更がある場合は、サービス内でお知らせします。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">10. お問い合わせ</h2>
            <p className="text-white/60 leading-relaxed">
              プライバシーに関するご質問やご要望は、下記メールアドレスまでお問い合わせください。
            </p>
            <p className="text-white/60">
              <a href="mailto:mk19830920@gmail.com" className="text-amber-400 hover:text-amber-300 underline">
                mk19830920@gmail.com
              </a>
            </p>
          </section>

          {/* Footer Link */}
          <div className="pt-8 text-center">
            <Link href="/">
              <span className="text-xs text-white/30 hover:text-white cursor-pointer transition-colors border-b border-transparent hover:border-white/20 pb-0.5">
                mirai-bin Top
              </span>
            </Link>
          </div>
        </motion.article>
      </main>
    </div>
  );
}
