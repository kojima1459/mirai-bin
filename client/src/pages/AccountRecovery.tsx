import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertTriangle, FileText, Key, Mail, Shield, Users, CheckCircle2 } from "lucide-react";

export default function AccountRecovery() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">アカウント引き継ぎ・復旧ガイド</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* 概要 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              未来便は「ゼロ知識設計」のため、運営者も手紙の本文や解錠コードを読めません。
              アカウントを失うと手紙が永久に開封できなくなる可能性があります。
              このページの手順に従って、大切な人に引き継ぎ情報を残しておきましょう。
            </AlertDescription>
          </Alert>

          {/* 1. 何を保管すべきか */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. 保管すべき情報
              </CardTitle>
              <CardDescription>
                以下の情報を安全な場所に保管してください。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">解錠コード（最重要）</h3>
                    <p className="text-sm text-muted-foreground">
                      手紙作成時にダウンロードしたPDFに記載されています。
                      このコードがないと、開封日が来ても手紙を読めません。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">共有リンク</h3>
                    <p className="text-sm text-muted-foreground">
                      手紙を開封するためのURLです。PDFまたは「マイレター」画面から確認できます。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">アカウント情報</h3>
                    <p className="text-sm text-muted-foreground">
                      ログインに使用しているメールアドレスとパスワード（Manus OAuth）。
                      設定画面からメールアドレスを確認・変更できます。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. 保管場所の推奨 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                2. 推奨される保管場所
              </CardTitle>
              <CardDescription>
                複数の場所に分散して保管することをおすすめします。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">銀行の貸金庫</h3>
                    <p className="text-sm text-muted-foreground">
                      最も安全な方法。PDFを印刷して保管します。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">遺言書や重要書類と一緒に保管</h3>
                    <p className="text-sm text-muted-foreground">
                      弁護士や司法書士に預ける遺言書に同封する方法。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">信頼できる第三者に預ける</h3>
                    <p className="text-sm text-muted-foreground">
                      配偶者や親族など、信頼できる人に「開封日まで開けないこと」を条件に預ける。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">パスワード管理ツール</h3>
                    <p className="text-sm text-muted-foreground">
                      1Password、Bitwarden、LastPassなどのパスワード管理ツールに保存。
                      緊急アクセス機能を設定しておくと安心です。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. 配偶者・家族への説明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                3. 配偶者・家族への説明文（コピー可）
              </CardTitle>
              <CardDescription>
                以下の文章をコピーして、大切な人に渡してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md space-y-3 text-sm">
                <p className="font-semibold">【未来便 アカウント引き継ぎ情報】</p>
                
                <p>
                  私は「未来便」というサービスを使って、あなた（または子ども）に手紙を残しています。
                  開封日が来たら、以下の手順で手紙を読むことができます。
                </p>

                <div className="space-y-2">
                  <p className="font-semibold">■ 必要な情報</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>共有リンク（URL）</li>
                    <li>解錠コード（12文字の英数字）</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">■ 開封手順</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>開封日が来たら、共有リンクをブラウザで開く</li>
                    <li>解錠コードを入力する</li>
                    <li>手紙が表示されます</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">■ 保管場所</p>
                  <p>
                    共有リンクと解錠コードは、以下の場所に保管しています：<br />
                    <span className="text-muted-foreground">（例: 銀行の貸金庫、遺言書と一緒、パスワード管理ツールなど）</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">■ 注意事項</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>解錠コードは運営者も知りません（ゼロ知識設計）</li>
                    <li>解錠コードを紛失すると、永久に開封できなくなります</li>
                    <li>開封日前は、サーバー側の制限により開封できません</li>
                  </ul>
                </div>

                <p className="text-muted-foreground">
                  ※ このメッセージは未来便の「アカウント引き継ぎ・復旧ガイド」から作成されました。
                </p>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = document.querySelector('.bg-muted')?.textContent || '';
                    navigator.clipboard.writeText(text);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  説明文をコピー
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4. アカウント喪失時の対処法 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                4. アカウントを失った場合
              </CardTitle>
              <CardDescription>
                ログインできなくなった場合の対処法です。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">Q. ログインできなくなりました</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    A. 設定画面からアカウントメールを変更できます。
                    ログインできる状態で、新しいメールアドレスに変更してください。
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Q. 解錠コードを紛失しました</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    A. 残念ながら、運営者も解錠コードを知らないため、復旧できません。
                    これがゼロ知識設計の特徴です。PDFを必ず複数箇所に保管してください。
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Q. 共有リンクを忘れました</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    A. ログイン後、「マイレター」画面から確認できます。
                    手紙の詳細ページに共有リンクが表示されています。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 関連リンク */}
          <Card>
            <CardHeader>
              <CardTitle>関連リンク</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  設定画面（メール変更）
                </Button>
              </Link>
              <Link href="/my-letters">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  マイレター（共有リンク確認）
                </Button>
              </Link>
              <Link href="/faq">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  よくある質問
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
