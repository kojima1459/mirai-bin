import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="container max-w-3xl py-8 px-4">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            ホームに戻る
          </Button>
        </Link>

        <article className="prose prose-amber max-w-none">
          <h1 className="text-3xl font-bold text-amber-900 mb-8">利用規約</h1>
          
          <p className="text-muted-foreground mb-6">
            最終更新日: 2025年1月6日
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第1条（適用）</h2>
            <p className="text-foreground leading-relaxed">
              本規約は、未来便（以下「本サービス」）の利用に関する条件を定めるものです。
              ユーザーは、本規約に同意した上で本サービスを利用するものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第2条（サービスの概要）</h2>
            <p className="text-foreground leading-relaxed mb-4">
              本サービスは、ユーザーが大切な人に宛てた手紙を作成し、指定した日時に届けることができるサービスです。
              主な機能は以下の通りです：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>音声録音と文字起こし</li>
              <li>AI支援による手紙の下書き作成</li>
              <li>クライアント側暗号化による安全な保存</li>
              <li>指定日時での開封機能</li>
              <li>共有リンクによる手紙の送付</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第3条（アカウント）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-foreground">
              <li>ユーザーは、正確かつ最新の情報を提供してアカウントを登録するものとします。</li>
              <li>アカウントの管理責任はユーザーにあり、第三者への貸与・譲渡は禁止します。</li>
              <li>アカウント情報の漏洩が発生した場合、速やかに本サービスに報告してください。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第4条（暗号化と復号キー）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-foreground">
              <li>手紙の内容はクライアント側で暗号化され、復号キーはShamir's Secret Sharingにより分割されます。</li>
              <li>復号キーの一部（クライアントシェア）は共有リンクに含まれます。このリンクを紛失した場合、手紙を復号することはできません。</li>
              <li>本サービスは、ユーザーの復号キー紛失による損害について責任を負いません。</li>
              <li>重要な手紙については、共有リンクを安全な場所に保管することを強く推奨します。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第5条（禁止事項）</h2>
            <p className="text-foreground leading-relaxed mb-4">
              ユーザーは、以下の行為を行ってはなりません：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>法令または公序良俗に違反する内容の送信</li>
              <li>他者の権利を侵害する内容の送信</li>
              <li>脅迫、嫌がらせ、誹謗中傷を目的とした利用</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセスまたはそれを試みる行為</li>
              <li>本サービスを商業目的で利用する行為（事前承認がある場合を除く）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第6条（知的財産権）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-foreground">
              <li>本サービスに関する知的財産権は、本サービスの運営者に帰属します。</li>
              <li>ユーザーが作成した手紙の内容に関する権利は、ユーザーに帰属します。</li>
              <li>AI支援により生成された文章は、ユーザーが自由に編集・使用できます。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第7条（サービスの変更・停止）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-foreground">
              <li>本サービスは、事前の通知なくサービス内容を変更することがあります。</li>
              <li>メンテナンスや不可抗力により、サービスを一時停止することがあります。</li>
              <li>サービス終了の場合は、30日前までに通知し、データのエクスポート期間を設けます。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第8条（免責事項）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-foreground">
              <li>本サービスは「現状有姿」で提供され、特定目的への適合性を保証しません。</li>
              <li>手紙の配信遅延、未配信、データ損失について、本サービスは責任を負いません。</li>
              <li>ユーザー間のトラブルについて、本サービスは関与しません。</li>
              <li>本サービスの利用により生じた損害について、故意または重過失がある場合を除き、責任を負いません。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第9条（退会）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-foreground">
              <li>ユーザーは、いつでもアカウントを削除して退会できます。</li>
              <li>退会後、ユーザーのデータは30日以内に完全に削除されます。</li>
              <li>既に送信された手紙は、受信者が開封するまで保持されます。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第10条（規約の変更）</h2>
            <p className="text-foreground leading-relaxed">
              本規約は、必要に応じて変更されることがあります。
              重要な変更がある場合は、サービス内でお知らせします。
              変更後も本サービスを利用し続けた場合、変更に同意したものとみなします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第11条（準拠法・管轄）</h2>
            <p className="text-foreground leading-relaxed">
              本規約は日本法に準拠し、本サービスに関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">第12条（お問い合わせ）</h2>
            <p className="text-foreground leading-relaxed">
              本規約に関するご質問は、サービス内のお問い合わせフォームよりご連絡ください。
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
