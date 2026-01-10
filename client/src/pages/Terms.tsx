import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Terms() {
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
        <span className="font-semibold tracking-tight">利用規約</span>
      </header>

      <main className="pt-28 pb-16 px-6 max-w-3xl mx-auto relative z-10">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-12"
        >
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block mb-4">Terms of Service</span>
            <h1 className="text-4xl font-bold tracking-tighter mb-4">利用規約</h1>
            <p className="text-white/40 text-sm">最終更新日: 2025年1月6日</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第1条（適用）</h2>
            <p className="text-white/60 leading-relaxed">
              本規約は、未来便（以下「本サービス」）の利用に関する条件を定めるものです。
              ユーザーは、本規約に同意した上で本サービスを利用するものとします。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第2条（サービスの概要）</h2>
            <p className="text-white/60 leading-relaxed mb-4">
              本サービスは、ユーザーが大切な人に宛てた手紙を作成し、指定した日時に届けることができるサービスです。
            </p>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>音声録音と文字起こし</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>AI支援による手紙の下書き作成</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>クライアント側暗号化による安全な保存</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>指定日時での開封機能</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>共有リンクによる手紙の送付</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第3条（アカウント）</h2>
            <ol className="space-y-2 text-white/60 list-decimal list-inside">
              <li>ユーザーは、正確かつ最新の情報を提供してアカウントを登録するものとします。</li>
              <li>アカウントの管理責任はユーザーにあり、第三者への貸与・譲渡は禁止します。</li>
              <li>アカウント情報の漏洩が発生した場合、速やかに本サービスに報告してください。</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第4条（暗号化と復号キー）</h2>
            <ol className="space-y-2 text-white/60 list-decimal list-inside">
              <li>手紙の内容はクライアント側で暗号化され、復号キーはShamir's Secret Sharingにより分割されます。</li>
              <li>復号キーの一部（クライアントシェア）は共有リンクに含まれます。このリンクを紛失した場合、手紙を復号することはできません。</li>
              <li>本サービスは、ユーザーの復号キー紛失による損害について責任を負いません。</li>
              <li>重要な手紙については、共有リンクを安全な場所に保管することを強く推奨します。</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第5条（禁止事項）</h2>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>法令または公序良俗に違反する内容の送信</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>他者の権利を侵害する内容の送信</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>脅迫、嫌がらせ、誹謗中傷を目的とした利用</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>本サービスの運営を妨害する行為</li>
              <li className="flex items-start gap-3"><span className="text-white/30 mt-1">•</span>不正アクセスまたはそれを試みる行為</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第6条（知的財産権）</h2>
            <ol className="space-y-2 text-white/60 list-decimal list-inside">
              <li>本サービスに関する知的財産権は、本サービスの運営者に帰属します。</li>
              <li>ユーザーが作成した手紙の内容に関する権利は、ユーザーに帰属します。</li>
              <li>AI支援により生成された文章は、ユーザーが自由に編集・使用できます。</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第7条（サービスの変更・停止）</h2>
            <ol className="space-y-2 text-white/60 list-decimal list-inside">
              <li>本サービスは、事前の通知なくサービス内容を変更することがあります。</li>
              <li>メンテナンスや不可抗力により、サービスを一時停止することがあります。</li>
              <li>サービス終了の場合は、30日前までに通知し、データのエクスポート期間を設けます。</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第8条（免責事項）</h2>
            <ol className="space-y-2 text-white/60 list-decimal list-inside">
              <li>本サービスは「現状有姿」で提供され、特定目的への適合性を保証しません。</li>
              <li>手紙の配信遅延、未配信、データ損失について、本サービスは責任を負いません。</li>
              <li>ユーザー間のトラブルについて、本サービスは関与しません。</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第9条（退会）</h2>
            <ol className="space-y-2 text-white/60 list-decimal list-inside">
              <li>ユーザーは、いつでもアカウントを削除して退会できます。</li>
              <li>退会後、ユーザーのデータは30日以内に完全に削除されます。</li>
              <li>既に送信された手紙は、受信者が開封するまで保持されます。</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第10条（規約の変更）</h2>
            <p className="text-white/60 leading-relaxed">
              本規約は、必要に応じて変更されることがあります。
              重要な変更がある場合は、サービス内でお知らせします。
              変更後も本サービスを利用し続けた場合、変更に同意したものとみなします。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第11条（準拠法・管轄）</h2>
            <p className="text-white/60 leading-relaxed">
              本規約は日本法に準拠し、本サービスに関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-white/10 pb-3">第12条（お問い合わせ）</h2>
            <p className="text-white/60 leading-relaxed">
              本規約に関するご質問は、下記メールアドレスまでお問い合わせください。
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
