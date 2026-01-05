import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Cake, GraduationCap, Heart, Mail, Loader2, PenLine } from "lucide-react";
import { Link } from "wouter";

const iconMap: Record<string, React.ReactNode> = {
  cake: <Cake className="h-8 w-8" />,
  "graduation-cap": <GraduationCap className="h-8 w-8" />,
  heart: <Heart className="h-8 w-8" />,
};

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: templates, isLoading: templatesLoading } = trpc.template.list.useQuery();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">未来便</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/my-letters">
                  <Button variant="ghost">マイレター</Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  {user?.name || "ゲスト"}
                </span>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button>ログイン</Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="py-20 md:py-32">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="text-primary">未来</span>の大切な人へ
            <br />
            <span className="text-primary">今</span>の想いを届ける
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            90秒の音声録音から、AIが温かい手紙を作成。
            <br />
            暗号化して安全に保管し、未来の特別な日に届けます。
          </p>
          {isAuthenticated ? (
            <Link href="/create">
              <Button size="lg" className="text-lg px-8 py-6">
                <PenLine className="mr-2 h-5 w-5" />
                手紙を書く
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="lg" className="text-lg px-8 py-6">
                はじめる
              </Button>
            </a>
          )}
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="py-16 bg-card">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            3分で想いを残す
          </h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "テンプレートを選ぶ", desc: "シーンに合わせた3種類" },
              { step: "2", title: "90秒で話す", desc: "思いつくままに" },
              { step: "3", title: "AIが手紙に", desc: "温かい文章に変換" },
              { step: "4", title: "暗号化して保存", desc: "安全に未来へ届ける" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* テンプレートセクション */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            テンプレート
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            大切な瞬間に届ける、3つのシーン
          </p>
          
          {templatesLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {templates?.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                      {iconMap[template.icon || ""] || <Mail className="h-8 w-8" />}
                    </div>
                    <CardTitle>{template.displayName}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground italic mb-4">
                      「{template.exampleOneLiner}」
                    </p>
                    {isAuthenticated ? (
                      <Link href={`/create?template=${template.name}`}>
                        <Button variant="outline" className="w-full">
                          このテンプレートで書く
                        </Button>
                      </Link>
                    ) : (
                      <a href={getLoginUrl()}>
                        <Button variant="outline" className="w-full">
                          ログインして書く
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* セキュリティセクション */}
      <section className="py-16 bg-card">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            安全に、確実に届ける
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="font-semibold mb-2">AES-256暗号化</h3>
              <p className="text-sm text-muted-foreground">
                軍事レベルの暗号化で
                <br />
                あなたの想いを守ります
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold mb-2">クライアント側暗号化</h3>
              <p className="text-sm text-muted-foreground">
                サーバーでも読めない
                <br />
                完全なプライバシー
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">📜</div>
              <h3 className="font-semibold mb-2">SHA-256証跡</h3>
              <p className="text-sm text-muted-foreground">
                改ざん検知で
                <br />
                真正性を保証
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2025 未来便（Mirai-bin）</p>
          <p className="mt-2">大切な想いを、未来へ届ける</p>
        </div>
      </footer>
    </div>
  );
}
