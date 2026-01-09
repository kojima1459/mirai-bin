import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

import { motion } from "framer-motion";
import { 
  Cake, GraduationCap, Heart, Mail, Loader2, PenLine, 
  School, BookOpen, Star, Briefcase, Baby, HandHeart, FileEdit,
  Shield, Lock, FileCheck, Settings, ChevronDown, Sparkles,
  Sun, Wallet, Map, CloudRain, Frown, Angry, Users, ThumbsDown,
  BatteryLow, DoorOpen, Compass, Search
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

// カテゴリの色設定
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  emotion: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "parent-truth": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  ritual: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  milestone: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
};

const categoryLabels: Record<string, string> = {
  emotion: "感情サポート",
  "parent-truth": "親の本音",
  ritual: "未来の儀式",
  milestone: "人生の節目",
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

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
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

  // カテゴリ別にグループ化
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, typeof filteredTemplates> = {};
    filteredTemplates.forEach(t => {
      const cat = t.category || "milestone";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [filteredTemplates]);

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

  // 録音ガイドをパース
  const parseRecordingGuide = (guide: string | null | undefined): string[] => {
    if (!guide) return [];
    try {
      return JSON.parse(guide);
    } catch {
      return [];
    }
  };

  // テンプレートアコーディオンアイテム
  const TemplateAccordionItem = ({ template, isRecommended = false }: { 
    template: NonNullable<typeof templates>[number]; 
    isRecommended?: boolean;
  }) => {
    const colors = categoryColors[template.category || "milestone"] || categoryColors.milestone;
    const recordingGuide = parseRecordingGuide(template.recordingGuide);

    return (
      <AccordionItem 
        value={template.name} 
        className={`border rounded-lg mb-3 ${colors.border} ${colors.bg} overflow-hidden`}
      >
        {/* モバイル最適化: タップ領域で44px以上、パディング拡大 */}
        <AccordionTrigger className="px-4 py-4 md:py-3 hover:no-underline hover:bg-white/50 transition-colors min-h-[56px] md:min-h-[48px]">
          <div className="flex items-center gap-3 flex-1 text-left">
            {/* アイコン: モバイルで少し大きく */}
            <div className={`w-11 h-11 md:w-10 md:h-10 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center shrink-0 border ${colors.border}`}>
              {iconMap[template.icon || ""] || <Mail className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* タイトル: モバイルで読みやすいサイズ */}
                <span className="font-semibold text-foreground text-base md:text-sm">{template.displayName}</span>
                {isRecommended && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                    おすすめ
                  </Badge>
                )}
              </div>
              {/* 説明: モバイルでは2行まで表示 */}
              <p className="text-sm text-muted-foreground line-clamp-2 md:truncate">
                {template.subtitle || template.description}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {/* モバイル最適化: パディング調整 */}
          <div className="bg-white/70 rounded-lg p-4 md:p-4 space-y-4">
            {/* 録音ガイド（90秒で話す順番） */}
            {recordingGuide.length > 0 && (
              <div>
                {/* モバイル最適化: 見出しサイズ調整 */}
                <h4 className="text-base md:text-sm font-semibold text-foreground mb-3 md:mb-2">
                  📝 90秒で話す順番
                </h4>
                {/* モバイル最適化: ステップ間隔拡大 */}
                <ol className="space-y-2.5 md:space-y-1.5">
                  {recordingGuide.map((step, i) => (
                    <li key={i} className="text-sm md:text-sm text-muted-foreground flex items-start gap-2.5 md:gap-2">
                      {/* モバイル最適化: 番号バッジ少し大きく */}
                      <span className={`w-6 h-6 md:w-5 md:h-5 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center shrink-0 text-xs font-medium`}>
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 一言例 */}
            {template.exampleOneLiner && (
              <div className="border-l-2 border-amber-300 pl-3 py-2 md:py-1">
                {/* モバイル最適化: 読みやすいサイズ */}
                <p className="text-sm md:text-sm italic text-muted-foreground leading-relaxed">
                  「{template.exampleOneLiner}」
                </p>
              </div>
            )}

            {/* CTAボタン - モバイル最適化: タップしやすいサイズ */}
            <div className="pt-3 md:pt-2">
              {isAuthenticated ? (
                <Link href={`/create?template=${template.name}`}>
                  <Button className="w-full h-12 md:h-10 text-base md:text-sm">
                    <PenLine className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                    このテンプレートで手紙を書く
                  </Button>
                </Link>
              ) : (
                <a href={"/login"}>
                  <Button className="w-full h-12 md:h-10 text-base md:text-sm">
                    ログインして手紙を書く
                  </Button>
                </a>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      {user?.name || "ゲスト"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        設定
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-muted-foreground text-xs" disabled>
                      {user?.email}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <a href={"/login"}>
                <Button>ログイン</Button>
              </a>
            )}
          </div>
        </div>
      </motion.header>

      {/* ヒーローセクション */}
      <section className="py-20 md:py-32 relative overflow-hidden">
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
                <a href={"/login"}>
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

      {/* テンプレートセクション（アコーディオン形式） */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              テンプレートを選ぶ
            </h2>
            <p className="text-muted-foreground">
              子どもの人生の節目に届ける、親からの想い
            </p>
          </motion.div>

          {templatesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* おすすめ3選 */}
              {recommendedTemplates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-lg">おすすめ</h3>
                  </div>
                  <Accordion type="single" collapsible className="space-y-0">
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

              {/* 検索・フィルター */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-semibold text-lg">すべてのテンプレート</span>
                  <Badge variant="outline">{filteredTemplates.length}件</Badge>
                </div>

                {/* 検索ボックス - モバイル最適化: タップしやすい高さ */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
                  <Input
                    placeholder="テンプレートを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 md:pl-10 h-12 md:h-10 text-base md:text-sm"
                  />
                </div>

                {/* カテゴリフィルター - モバイル最適化: 横スクロール可能 */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible scrollbar-hide">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="shrink-0 h-10 md:h-8 px-4 md:px-3 text-sm"
                  >
                    すべて
                  </Button>
                  {Object.entries(categoryLabels).map(([key, label]) => {
                    const colors = categoryColors[key];
                    return (
                      <Button
                        key={key}
                        variant={selectedCategory === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                        className={`shrink-0 h-10 md:h-8 px-4 md:px-3 text-sm ${selectedCategory !== key ? `${colors.bg} ${colors.text} border ${colors.border} hover:${colors.bg}` : ""}`}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </motion.div>

              {/* カテゴリ別テンプレート一覧 */}
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${categoryColors[category]?.bg} ${categoryColors[category]?.text} border ${categoryColors[category]?.border}`}>
                      {categoryLabels[category] || category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{categoryTemplates.length}件</span>
                  </div>
                  <Accordion type="single" collapsible className="space-y-0">
                    {categoryTemplates.map(template => (
                      <TemplateAccordionItem 
                        key={template.id} 
                        template={template}
                      />
                    ))}
                  </Accordion>
                </motion.div>
              ))}

              {/* 検索結果なし */}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>該当するテンプレートが見つかりませんでした</p>
                </div>
              )}
            </div>
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
              <a href={"/login"}>
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
            <div className="mt-4 flex justify-center gap-4 flex-wrap">
              <Link href="/how-to-use" className="hover:text-primary transition-colors">
                使い方
              </Link>
              <span>・</span>
              <Link href="/faq" className="hover:text-primary transition-colors">
                注意点・FAQ
              </Link>
              <span>・</span>
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
