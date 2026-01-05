import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { 
  Cake, GraduationCap, Heart, Mail, Loader2, PenLine, 
  School, BookOpen, Star, Briefcase, Baby, HandHeart, FileEdit,
  Shield, Lock, FileCheck
} from "lucide-react";
import { Link } from "wouter";

const iconMap: Record<string, React.ReactNode> = {
  cake: <Cake className="h-8 w-8" />,
  "graduation-cap": <GraduationCap className="h-8 w-8" />,
  heart: <Heart className="h-8 w-8" />,
  school: <School className="h-8 w-8" />,
  "book-open": <BookOpen className="h-8 w-8" />,
  star: <Star className="h-8 w-8" />,
  briefcase: <Briefcase className="h-8 w-8" />,
  baby: <Baby className="h-8 w-8" />,
  "hand-heart": <HandHeart className="h-8 w-8" />,
  mail: <Mail className="h-8 w-8" />,
};

// テンプレートをカテゴリ別に分類
const templateCategories: Record<string, { title: string; templates: string[] }> = {
  childhood: {
    title: "幼少期〜小学校",
    templates: ["10years", "elementary-graduation"],
  },
  junior: {
    title: "中学校",
    templates: ["junior-high-entrance", "junior-high-graduation"],
  },
  senior: {
    title: "高校〜大学",
    templates: ["high-school-entrance", "high-school-graduation", "university-entrance"],
  },
  adult: {
    title: "成人〜社会人",
    templates: ["coming-of-age", "first-job"],
  },
  life: {
    title: "人生の節目",
    templates: ["first-love", "wedding-day", "becoming-parent"],
  },
  special: {
    title: "特別な日",
    templates: ["difficult-times", "someday"],
  },
};

// アニメーション設定
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 }
};

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: templates, isLoading: templatesLoading } = trpc.template.list.useQuery();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </motion.div>
      </div>
    );
  }

  // テンプレートをカテゴリ別にグループ化
  const getTemplatesByCategory = (categoryKey: string) => {
    if (!templates) return [];
    const category = templateCategories[categoryKey];
    if (!category) return [];
    return templates.filter(t => category.templates.includes(t.name));
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <motion.div 
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                未来便
              </span>
            </motion.div>
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/drafts">
                  <Button variant="ghost" size="sm">
                    <FileEdit className="h-4 w-4 mr-1" />
                    下書き
                  </Button>
                </Link>
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
      </motion.header>

      {/* ヒーローセクション */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* 背景のグラデーションアニメーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />
        <motion.div 
          className="absolute inset-0 opacity-30"
          animate={{ 
            background: [
              "radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="container text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block mb-6"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-orange-200">
                <Mail className="h-10 w-10 text-white" />
              </div>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <motion.span 
                className="text-primary inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                未来
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                の大切な人へ
              </motion.span>
              <br />
              <motion.span 
                className="text-primary inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                今
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                の想いを届ける
              </motion.span>
            </h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              90秒の音声録音から、AIが温かい手紙を作成。
              <br />
              暗号化して安全に保管し、未来の特別な日に届けます。
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              {isAuthenticated ? (
                <Link href="/create">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-shadow">
                      <PenLine className="mr-2 h-5 w-5" />
                      手紙を書く
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-shadow">
                      はじめる
                    </Button>
                  </motion.div>
                </a>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="py-16 bg-card">
        <div className="container">
          <motion.h2 
            className="text-2xl md:text-3xl font-bold text-center mb-12"
            {...fadeInUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
          >
            3分で想いを残す
          </motion.h2>
          <motion.div 
            className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { step: "1", title: "テンプレートを選ぶ", desc: "人生の節目に合わせて", icon: "📋" },
              { step: "2", title: "90秒で話す", desc: "思いつくままに", icon: "🎤" },
              { step: "3", title: "AIが手紙に", desc: "温かい文章に変換", icon: "✨" },
              { step: "4", title: "暗号化して保存", desc: "安全に未来へ届ける", icon: "🔐" },
            ].map((item, index) => (
              <motion.div 
                key={item.step} 
                className="text-center"
                variants={fadeInUp}
                custom={index}
              >
                <motion.div 
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-md"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {item.icon}
                </motion.div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* テンプレートセクション */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              テンプレート
            </h2>
            <p className="text-muted-foreground mb-4">
              子どもの人生の節目に届ける、親からの想い
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              たとえ自分がいなくなっても、大切な想いは確実に届きます。
              <br />
              子どもの成長の節目に、あなたの言葉を届けましょう。
            </p>
          </motion.div>
          
          {templatesLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="childhood" className="max-w-6xl mx-auto">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-8 h-auto">
                {Object.entries(templateCategories).map(([key, category]) => (
                  <TabsTrigger key={key} value={key} className="text-xs md:text-sm py-2">
                    {category.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Object.keys(templateCategories).map((categoryKey) => (
                <TabsContent key={categoryKey} value={categoryKey}>
                  <motion.div 
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {getTemplatesByCategory(categoryKey).map((template, index) => (
                      <motion.div
                        key={template.id}
                        variants={scaleIn}
                        custom={index}
                      >
                        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                          <CardHeader className="text-center">
                            <motion.div 
                              className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4"
                              whileHover={{ scale: 1.1, rotate: 10 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              {iconMap[template.icon || ""] || <Mail className="h-8 w-8" />}
                            </motion.div>
                            <CardTitle className="text-lg">{template.displayName}</CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="text-center">
                            <p className="text-sm text-muted-foreground italic mb-4">
                              「{template.exampleOneLiner}」
                            </p>
                            {isAuthenticated ? (
                              <Link href={`/create?template=${template.name}`}>
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                  <Button variant="outline" className="w-full">
                                    このテンプレートで書く
                                  </Button>
                                </motion.div>
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
                      </motion.div>
                    ))}
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </section>

      {/* メッセージセクション */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{ 
            background: [
              "radial-gradient(circle at 30% 70%, rgba(251, 191, 36, 0.4) 0%, transparent 50%)",
              "radial-gradient(circle at 70% 30%, rgba(251, 191, 36, 0.4) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 70%, rgba(251, 191, 36, 0.4) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="container max-w-3xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              想いは、時を超えて届く
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              子どもの成長を見届けられない日が来るかもしれない。
              <br />
              でも、あなたの想いは永遠に残ります。
              <br />
              <br />
              10歳の誕生日に、卒業式の朝に、結婚する日に。
              <br />
              子どもが人生の節目を迎えるとき、
              <br />
              あなたの声が、あなたの言葉が、そばにいます。
            </p>
            {isAuthenticated ? (
              <Link href="/create">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="shadow-lg shadow-orange-200">
                    <PenLine className="mr-2 h-5 w-5" />
                    想いを残す
                  </Button>
                </motion.div>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="shadow-lg shadow-orange-200">
                    はじめる
                  </Button>
                </motion.div>
              </a>
            )}
          </motion.div>
        </div>
      </section>

      {/* セキュリティセクション */}
      <section className="py-16 bg-card">
        <div className="container max-w-4xl">
          <motion.h2 
            className="text-2xl md:text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            安全に、確実に届ける
          </motion.h2>
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { 
                icon: <Shield className="h-8 w-8" />, 
                title: "AES-256暗号化", 
                desc: "軍事レベルの暗号化であなたの想いを守ります" 
              },
              { 
                icon: <Lock className="h-8 w-8" />, 
                title: "クライアント側暗号化", 
                desc: "サーバーでも読めない完全なプライバシー" 
              },
              { 
                icon: <FileCheck className="h-8 w-8" />, 
                title: "SHA-256証跡", 
                desc: "改ざん検知で真正性を保証" 
              },
            ].map((item, index) => (
              <motion.div 
                key={item.title}
                className="text-center p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50"
                variants={fadeInUp}
                custom={index}
                whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(251, 191, 36, 0.2)" }}
              >
                <motion.div 
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center mx-auto mb-4"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {item.icon}
                </motion.div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 border-t bg-card/50">
        <div className="container text-center text-sm text-muted-foreground">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p>© 2025 未来便（Mirai-bin）</p>
            <p className="mt-2">大切な想いを、未来へ届ける</p>
            <div className="mt-4 flex justify-center gap-4">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                プライバシーポリシー
              </Link>
              <span>・</span>
              <Link href="/terms" className="hover:text-primary transition-colors">
                利用規約
              </Link>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
