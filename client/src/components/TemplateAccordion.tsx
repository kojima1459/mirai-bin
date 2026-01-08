import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  Search,
  Moon,
  TrendingDown,
  Flame,
  Users,
  HeartCrack,
  BatteryLow,
  DoorOpen,
  Compass,
  HandHeart,
  Heart,
  Sparkles,
  Map,
  Wallet,
  Shield,
  Sun,
  Baby,
  Star,
  Mail,
  GraduationCap,
  Cake,
  School,
  BookOpen,
  Briefcase,
  Edit3,
  Mic2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Template {
  id: number;
  name: string;
  displayName: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  isRecommended: boolean | null;
  recordingGuide: string | null;
  exampleOneLiner: string | null;
  sortOrder: number | null;
}

interface TemplateAccordionProps {
  templates: Template[];
  selectedTemplate: string;
  onSelect: (name: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  moon: <Moon className="h-5 w-5" />,
  "trending-down": <TrendingDown className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  "heart-crack": <HeartCrack className="h-5 w-5" />,
  "battery-low": <BatteryLow className="h-5 w-5" />,
  "door-open": <DoorOpen className="h-5 w-5" />,
  compass: <Compass className="h-5 w-5" />,
  "hand-heart": <HandHeart className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  map: <Map className="h-5 w-5" />,
  wallet: <Wallet className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
  baby: <Baby className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  cake: <Cake className="h-5 w-5" />,
  "graduation-cap": <GraduationCap className="h-5 w-5" />,
  school: <School className="h-5 w-5" />,
  "book-open": <BookOpen className="h-5 w-5" />,
  briefcase: <Briefcase className="h-5 w-5" />,
  "edit-3": <Edit3 className="h-5 w-5" />,
  "mic-2": <Mic2 className="h-5 w-5" />,
};

const categoryLabels: Record<string, { label: string; color: string }> = {
  emotion: { label: "感情サポート", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  "parent-truth": { label: "親の本音", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  ritual: { label: "未来の儀式", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  milestone: { label: "人生の節目", color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
};

// カテゴリの表示順序
const categoryOrder = ["milestone", "emotion", "parent-truth", "ritual"];

export function TemplateAccordion({ templates, selectedTemplate, onSelect }: TemplateAccordionProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // おすすめテンプレート（上位5つ）
  const recommendedTemplates = useMemo(() => {
    return templates
      .filter(t => t.isRecommended)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .slice(0, 5);
  }, [templates]);

  // 検索・カテゴリフィルタ
  const filteredTemplates = useMemo(() => {
    let result = templates;
    
    // カテゴリフィルタ
    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory);
    }
    
    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.displayName.toLowerCase().includes(query) ||
        t.subtitle?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [templates, searchQuery, selectedCategory]);

  // カテゴリごとにグループ化
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    filteredTemplates.forEach(t => {
      const category = t.category || "other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(t);
    });
    // ソート
    Object.values(groups).forEach(group => {
      group.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
    return groups;
  }, [filteredTemplates]);

  // カテゴリを順序通りに並べる
  const sortedCategories = useMemo(() => {
    const categories = Object.keys(groupedTemplates);
    return categories.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [groupedTemplates]);

  const handleToggle = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSelect = (template: Template) => {
    onSelect(template.name);
    setExpandedId(null);
  };

  const renderTemplateItem = (template: Template, isRecommended = false) => {
    const isExpanded = expandedId === template.id;
    const isSelected = selectedTemplate === template.name;
    const category = categoryLabels[template.category || ""] || { label: "", color: "" };
    
    let recordingGuide: string[] = [];
    try {
      if (template.recordingGuide) {
        recordingGuide = JSON.parse(template.recordingGuide);
      }
    } catch {
      // ignore
    }

    return (
      <motion.div
        key={template.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`border rounded-lg overflow-hidden transition-all ${
          isSelected 
            ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
            : "border-border hover:border-primary/30"
        }`}
      >
        {/* アコーディオンヘッダー（行全体がクリック可能）- モバイル最適化 */}
        <button
          type="button"
          onClick={() => handleToggle(template.id)}
          className="w-full p-4 md:p-4 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors min-h-[56px] md:min-h-[48px]"
        >
          {/* アイコン - モバイルで少し大きく */}
          <div className={`w-11 h-11 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {iconMap[template.icon || ""] || <Mail className="h-5 w-5" />}
          </div>
          
          {/* タイトルとサブタイトル */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* タイトル - モバイルで読みやすいサイズ */}
              <h3 className="font-semibold text-foreground text-base md:text-sm truncate">{template.displayName}</h3>
              {isRecommended && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                  おすすめ
                </Badge>
              )}
              {category.label && !isRecommended && (
                <Badge variant="outline" className={`text-xs ${category.color}`}>
                  {category.label}
                </Badge>
              )}
            </div>
            {/* 説明 - モバイルでは2行まで表示 */}
            <p className="text-sm text-muted-foreground line-clamp-2 md:truncate">
              {template.subtitle || template.description}
            </p>
          </div>
          
          {/* 展開アイコン - スムーズなアニメーション */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          </motion.div>
        </button>

        {/* アコーディオンコンテンツ - スムーズなアニメーション */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: "auto", 
                opacity: 1,
                transition: {
                  height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.25, delay: 0.1 }
                }
              }}
              exit={{ 
                height: 0, 
                opacity: 0,
                transition: {
                  height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.15 }
                }
              }}
              className="overflow-hidden"
            >
              <motion.div 
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10 }}
                transition={{ duration: 0.2 }}
                className="px-4 pb-4 pt-2 border-t bg-muted/30"
              >
                {/* 録音ガイド - モバイル最適化 */}
                {recordingGuide.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-base md:text-sm font-medium text-foreground mb-3 md:mb-2">
                      📝 90秒で話すポイント
                    </h4>
                    <ul className="space-y-2.5 md:space-y-1.5">
                      {recordingGuide.map((guide, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5 md:gap-2">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-medium">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{guide}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 例文 - モバイル最適化 */}
                {template.exampleOneLiner && (
                  <div className="mb-4 p-3 bg-background rounded-md border border-amber-200">
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      「{template.exampleOneLiner}」
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      ↑ こんな感じで話し始めると良いです
                    </p>
                  </div>
                )}

                {/* 選択ボタン - モバイル最適化 */}
                <button
                  type="button"
                  onClick={() => handleSelect(template)}
                  className={`w-full py-3 md:py-2 px-4 rounded-md font-medium transition-all duration-200 text-base md:text-sm ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-sm"
                  }`}
                >
                  {isSelected ? "✓ 選択中" : "このテンプレートを選ぶ"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* おすすめセクション */}
      {recommendedTemplates.length > 0 && !searchQuery && !selectedCategory && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            あなたにおすすめ
          </h3>
          <div className="space-y-2">
            {recommendedTemplates.map(t => renderTemplateItem(t, true))}
          </div>
        </motion.div>
      )}

      {/* 検索・フィルター */}
      <div className="space-y-4">
        {/* 検索ボックス - モバイル最適化 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="テンプレートを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 md:pl-10 h-12 md:h-10 text-base md:text-sm"
          />
        </div>

        {/* カテゴリフィルター - モバイル最適化（横スクロール） */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible scrollbar-hide">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="shrink-0 h-10 md:h-8 px-4 md:px-3 text-sm"
          >
            すべて
          </Button>
          {categoryOrder.map(key => {
            const info = categoryLabels[key];
            if (!info) return null;
            return (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className={`shrink-0 h-10 md:h-8 px-4 md:px-3 text-sm ${
                  selectedCategory !== key ? info.color : ""
                }`}
              >
                {info.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 全テンプレート（カテゴリ別） */}
      <div className="space-y-6">
        {sortedCategories.map(category => {
          const categoryTemplates = groupedTemplates[category];
          const categoryInfo = categoryLabels[category] || { label: category, color: "" };
          
          return (
            <motion.div 
              key={category} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className={`${categoryInfo.color}`}>
                  {categoryInfo.label || "その他"}
                </Badge>
                <span className="text-xs">({categoryTemplates.length})</span>
              </h3>
              <div className="space-y-2">
                {categoryTemplates.map(t => renderTemplateItem(t))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 検索結果なし */}
      {filteredTemplates.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-muted-foreground"
        >
          <p>「{searchQuery}」に一致するテンプレートが見つかりません</p>
        </motion.div>
      )}
    </div>
  );
}
