import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-3xl font-bold text-amber-900 mb-8">プライバシーポリシー</h1>
          
          <p className="text-muted-foreground mb-6">
            最終更新日: 2025年1月6日
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">1. はじめに</h2>
            <p className="text-foreground leading-relaxed">
              未来便（以下「本サービス」）は、お客様のプライバシーを尊重し、個人情報の保護に努めています。
              本プライバシーポリシーは、本サービスがどのような情報を収集し、どのように使用・保護するかを説明します。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">2. 収集する情報</h2>
            <p className="text-foreground leading-relaxed mb-4">
              本サービスは、以下の情報を収集する場合があります：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>アカウント情報（メールアドレス、表示名）</li>
              <li>手紙の内容（暗号化された状態で保存）</li>
              <li>音声録音データ（暗号化された状態で保存）</li>
              <li>利用状況に関するデータ（アクセスログ等）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">3. 情報の暗号化について</h2>
            <p className="text-foreground leading-relaxed mb-4">
              本サービスでは、お客様のプライバシーを最大限に保護するため、以下の暗号化技術を採用しています：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li><strong>クライアント側暗号化（AES-GCM-256）</strong>: 手紙の内容はお客様のデバイス上で暗号化され、サーバーには暗号化されたデータのみが保存されます。</li>
              <li><strong>Shamir's Secret Sharing</strong>: 復号キーは複数のシェアに分割され、開封日時まで手紙を復号することはできません。</li>
              <li><strong>ゼロ知識設計</strong>: 本サービスの運営者でさえ、お客様の手紙の内容を読むことはできません。</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">4. 情報の利用目的</h2>
            <p className="text-foreground leading-relaxed mb-4">
              収集した情報は、以下の目的で利用します：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>サービスの提供・運営</li>
              <li>お客様からのお問い合わせへの対応</li>
              <li>サービスの改善・新機能の開発</li>
              <li>不正利用の防止</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">5. 情報の第三者提供</h2>
            <p className="text-foreground leading-relaxed">
              本サービスは、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。
              ただし、以下の場合は例外とします：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground mt-4">
              <li>法令に基づく開示請求があった場合</li>
              <li>人の生命、身体または財産の保護のために必要な場合</li>
              <li>サービス提供に必要な業務委託先への提供（秘密保持契約を締結）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">6. データの保存期間</h2>
            <p className="text-foreground leading-relaxed">
              手紙データは、お客様が削除するまで、または開封後一定期間（開封から1年間）保存されます。
              アカウント情報は、退会後30日間保存した後、完全に削除されます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">7. お客様の権利</h2>
            <p className="text-foreground leading-relaxed mb-4">
              お客様は、以下の権利を有します：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>個人情報の開示・訂正・削除を請求する権利</li>
              <li>データのエクスポートを請求する権利</li>
              <li>アカウントを削除する権利</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">8. Cookieの使用</h2>
            <p className="text-foreground leading-relaxed">
              本サービスは、セッション管理およびサービス改善のためにCookieを使用します。
              Cookieはブラウザの設定により無効化できますが、一部の機能が利用できなくなる場合があります。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">9. プライバシーポリシーの変更</h2>
            <p className="text-foreground leading-relaxed">
              本プライバシーポリシーは、必要に応じて変更されることがあります。
              重要な変更がある場合は、サービス内でお知らせします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-amber-800 mb-4">10. お問い合わせ</h2>
            <p className="text-foreground leading-relaxed">
              プライバシーに関するご質問やご要望は、サービス内のお問い合わせフォームよりご連絡ください。
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
