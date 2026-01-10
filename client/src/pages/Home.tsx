import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

import { motion } from "framer-motion";
import {
  Cake, GraduationCap, Heart, Mail, Loader2, PenLine,
  School, BookOpen, Star, Briefcase, Baby, HandHeart, FileEdit,
  Shield, Lock, FileCheck, Settings, ChevronDown, Sparkles,
  Sun, Wallet, Map, CloudRain, Frown, Angry, Users, ThumbsDown,
  BatteryLow, DoorOpen, Compass, Search, Mic, Send
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useAuth as useClientAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { OnboardingDialog } from "@/components/OnboardingDialog";

// アイコンマップ（拡張版）
const iconMap: Record<string, React.ReactNode> = {
  cake: <Cake className="h-5 w-5" />,
  "graduation-cap": <GraduationCap className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  school: <School className="h-5 w-5" />,
  "book-open": <BookOpen className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  briefcase: <Briefcase className="h-5 w-5" />,
  baby: <Baby className="h-5 w-5" />,
  "hand-heart": <HandHeart className="h-5 w-5" />,
  mail: <Mail className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
  wallet: <Wallet className="h-5 w-5" />,
  map: <Map className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
  "cloud-rain": <CloudRain className="h-5 w-5" />,
  frown: <Frown className="h-5 w-5" />,
  angry: <Angry className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  "thumbs-down": <ThumbsDown className="h-5 w-5" />,
  "battery-low": <BatteryLow className="h-5 w-5" />,
  "door-open": <DoorOpen className="h-5 w-5" />,
  compass: <Compass className="h-5 w-5" />,
};

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { signIn } = useClientAuth();
  const handleLogin = async () => {
    try {
      await signIn();
    } catch (e) {
      console.error("Login trigger failed:", e);
      alert("ログインに失敗しました。もう一度お試しください。");
    }
  };
  const { data: templates, isLoading: templatesLoading } = trpc.template.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // おすすめテンプレート（isRecommended=true）
  const recommendedTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => t.isRecommended).slice(0, 3);
  }, [templates]);

  // フィルタリングされたテンプレート
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => {
      const matchesSearch = searchQuery === "" ||
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === null || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-white/20 mx-auto mb-4" />
        </motion.div>
      </div>
    );
  }

  // 録音ガイドをパース
  const parseRecordingGuide = (guide: string | null | undefined): string[] => {
    if (!guide) return [];
    try {
      return JSON.parse(guide);
    } catch {
      return [];
    }
  };

  // テンプレートアコーディオンアイテム - LPスタイル
  const TemplateAccordionItem = ({ template, isRecommended = false }: {
    template: NonNullable<typeof templates>[number];
    isRecommended?: boolean;
  }) => {
    const recordingGuide = parseRecordingGuide(template.recordingGuide);

    return (
      <AccordionItem
        value={template.name}
        className="border-b border-white/5 py-2 last:border-0"
      >
        <AccordionTrigger className="px-0 py-4 hover:no-underline group">
          <div className="flex items-center gap-4 flex-1 text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 group-hover:bg-white/10 transition-colors">
              {iconMap[template.icon || ""] || <Mail className="h-5 w-5 text-white/80" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-white tracking-tight">{template.displayName}</span>
                {isRecommended && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 uppercase tracking-wider font-medium">
                    おすすめ
                  </span>
                )}
              </div>
              <p className="text-sm text-white/50 line-clamp-1">
                {template.subtitle || template.description}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-6">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-5">
            {/* 録音ガイド */}
            {recordingGuide.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase mb-4">
                  録音ガイド
                </h4>
                <ol className="space-y-3">
                  {recordingGuide.map((step, i) => (
                    <li key={i} className="text-sm text-white/70 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center shrink-0 text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 一言例 */}
            {template.exampleOneLiner && (
              <div className="border-l-2 border-white/20 pl-4 py-1">
                <p className="text-sm italic text-white/50 leading-relaxed">
                  「{template.exampleOneLiner}」
                </p>
              </div>
            )}

            {/* CTAボタン */}
            <div className="pt-2">
              {isAuthenticated ? (
                <Link href={`/create?template=${template.name}`}>
                  <Button className="w-full bg-white text-black hover:bg-white/90 rounded-full h-12 font-semibold">
                    <PenLine className="mr-2 h-4 w-4" />
                    このテーマで手紙を書く
                  </Button>
                </Link>
              ) : (
                <Button onClick={handleLogin} className="w-full bg-white text-black hover:bg-white/90 rounded-full h-12 font-semibold">
                  ログインして手紙を書く
                </Button>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/30 selection:text-white font-sans antialiased">
      {/* Background Grain Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <OnboardingDialog />

      {/* ヘッダー - LP style */}
      <header className="fixed top-0 w-full z-50 mix-blend-difference px-6 py-6 md:px-12 flex justify-between items-center">
        <Link href="/">
          <div className="text-xl font-bold tracking-tighter cursor-pointer">mirai-bin</div>
        </Link>
        <nav className="flex gap-6 items-center text-sm font-medium">
          {isAuthenticated ? (
            <>
              <Link href="/drafts">
                <span className="cursor-pointer hover:opacity-70 transition-opacity hidden md:inline">下書き</span>
              </Link>
              <Link href="/my-letters">
                <span className="cursor-pointer hover:opacity-70 transition-opacity">マイレター</span>
              </Link>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10">
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer text-white hover:bg-white/5">
                      設定
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="text-white/50 text-xs" disabled>
                    {user?.email}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <span className="cursor-pointer hover:opacity-70 transition-opacity">Login</span>
              </Link>
              <Link href="/create">
                <span className="cursor-pointer bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-colors">今すぐ作成</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ヒーローセクション - LP style */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-6">
        {/* Background Ambience */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              未来へ、封をする。
            </h1>
            <p className="text-lg md:text-xl text-white/60 font-medium tracking-wide max-w-xl mx-auto leading-relaxed">
              今の声と想いを、デジタルな手紙に。<br className="hidden md:block" />
              誰にも読まれない、あなたと大切な人だけのタイムカプセル。
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {isAuthenticated ? (
              <Link href="/create">
                <Button
                  size="lg"
                  className="px-8 py-6 text-base rounded-full bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  今すぐ手紙を作る
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleLogin}
                size="lg"
                className="px-8 py-6 text-base rounded-full bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                今すぐ手紙を作る
              </Button>
            )}
          </motion.div>

          {/* Abstract Visual (CSS Audio Wave) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="pt-16 flex items-center justify-center gap-1.5 h-16"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-white/10 to-white/50 rounded-full"
                animate={{
                  height: [16, Math.random() * 48 + 16, 16],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
                style={{ width: '2px' }}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* 使い方セクション - LP style */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-24"
          >
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase mb-4 block">Process</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">想いを届ける、<br />最もシンプルな方法。</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {[
              { icon: Mic, title: "声を吹き込む", desc: "最大90秒のメッセージと、\nテキストで想いを綴ります。" },
              { icon: Lock, title: "未来を指定して封緘", desc: "明日でも、10年後でも。\nその時が来るまで、誰も開けません。" },
              { icon: Send, title: "URLを共有", desc: "発行されたリンクと解錠コードを\n大切な人に渡すだけ。" }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2, duration: 0.6 }}
                className="relative flex flex-col items-center text-center space-y-6 group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 group-hover:bg-white/10 transition-colors duration-500">
                  <step.icon strokeWidth={1} className="w-8 h-8 text-white/80" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-loose whitespace-pre-wrap">{step.desc}</p>
                </div>

                {idx !== 2 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* テンプレートセクション（アコーディオン形式） - LP style */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase mb-4 block">Templates</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              テーマを選ぶ
            </h2>
            <p className="text-white/50">
              人生の節目に届ける、想いのきっかけ
            </p>
          </motion.div>

          {templatesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/20" />
            </div>
          ) : (
            <div className="space-y-12">
              {/* おすすめ */}
              {recommendedTemplates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="h-4 w-4 text-white/40" />
                    <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">Recommended</span>
                  </div>
                  <Accordion type="single" collapsible>
                    {recommendedTemplates.map(template => (
                      <TemplateAccordionItem
                        key={template.id}
                        template={template}
                        isRecommended={true}
                      />
                    ))}
                  </Accordion>
                </motion.div>
              )}

              {/* 検索 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="テンプレートを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/20 rounded-xl"
                  />
                </div>

                <Accordion type="single" collapsible>
                  {filteredTemplates.filter(t => !t.isRecommended).map(template => (
                    <TemplateAccordionItem
                      key={template.id}
                      template={template}
                    />
                  ))}
                </Accordion>

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    <p>該当するテンプレートが見つかりませんでした</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* セキュリティセクション - LP style */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block">Security</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              誰も読めない。<br />
              だから、<br />
              本当のことが書ける。
            </h2>
            <p className="text-lg text-white/60 leading-relaxed font-light">
              封緘（暗号化）された手紙は、運営者であっても内容を見ることはできません。
              未来のその瞬間に、解錠コードを持つ受取人だけが開封できます。
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              { icon: Shield, title: "ゼロ知識証明", desc: "本文は端末内で暗号化され、サーバーには乱数として保存されます。" },
              { icon: FileCheck, title: "鍵の分散管理", desc: "開封には「共有リンク」と「解錠コード」の両方が必要です。" },
              { icon: Lock, title: "厳格な時限ロック", desc: "指定された日時より1秒でも早い開封は、システム的に不可能です。" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-5">
                  <div className="mt-1">
                    <item.icon className="w-5 h-5 text-white/70" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - LP style */}
      <section className="py-32 text-center px-6 border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto space-y-8"
        >
          <p className="text-2xl md:text-3xl font-semibold tracking-tight leading-relaxed">
            今日、あなたの声を残しませんか。
          </p>
          <p className="text-white/50 leading-relaxed">
            封印した言葉は、未来のその瞬間まで静かに待ちます。<br />
            開けられる日が来たとき、きっとあなたの想いが届きます。
          </p>
          {isAuthenticated ? (
            <Link href="/create">
              <Button
                size="lg"
                className="px-8 py-6 text-base rounded-full bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                手紙を書き始める
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleLogin}
              size="lg"
              className="px-8 py-6 text-base rounded-full bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              はじめる
            </Button>
          )}
        </motion.div>
      </section>

      {/* フッター - LP style */}
      <footer className="py-12 text-center border-t border-white/5 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-sm text-white/40 space-y-4">
            <div className="flex justify-center gap-6 flex-wrap">
              <Link href="/lp" className="hover:text-white transition-colors">未来便について</Link>
              <Link href="/how-to-use" className="hover:text-white transition-colors">使い方</Link>
              <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
            <p className="text-white/20">© 2025 mirai-bin</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
