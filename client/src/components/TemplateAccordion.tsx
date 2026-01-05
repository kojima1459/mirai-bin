import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Mail
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
};

const categoryLabels: Record<string, { label: string; color: string }> = {
  emotion: { label: "感情", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  "parent-truth": { label: "親の本音", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  ritual: { label: "儀式", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
};

export function TemplateAccordion({ templates, selectedTemplate, onSelect }: TemplateAccordionProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // おすすめテンプレート（上位3つ）
  const recommendedTemplates = useMemo(() => {
    return templates
      .filter(t => t.isRecommended)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .slice(0, 3);
  }, [templates]);

  // 検索フィルタ
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.displayName.toLowerCase().includes(query) ||
      t.subtitle?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

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
      <div
        key={template.id}
        className={`border rounded-lg overflow-hidden transition-all ${
          isSelected 
            ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
            : "border-border hover:border-primary/30"
        }`}
      >
        {/* アコーディオンヘッダー（行全体がクリック可能） */}
        <button
          type="button"
          onClick={() => handleToggle(template.id)}
          className="w-full p-4 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          {/* アイコン */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {iconMap[template.icon || ""] || <Mail className="h-5 w-5" />}
          </div>
          
          {/* タイトルとサブタイトル */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{template.displayName}</h3>
              {isRecommended && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  おすすめ
                </Badge>
              )}
              {category.label && !isRecommended && (
                <Badge variant="outline" className={`text-xs ${category.color}`}>
                  {category.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {template.subtitle || template.description}
            </p>
          </div>
          
          {/* 展開アイコン */}
          <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`} />
        </button>

        {/* アコーディオンコンテンツ */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
                {/* 録音ガイド */}
                {recordingGuide.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      📝 90秒で話すポイント
                    </h4>
                    <ul className="space-y-1">
                      {recordingGuide.map((guide, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-4 relative">
                          <span className="absolute left-0">•</span>
                          {guide}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 例文 */}
                {template.exampleOneLiner && (
                  <div className="mb-4 p-3 bg-background rounded-md border">
                    <p className="text-sm text-muted-foreground italic">
                      「{template.exampleOneLiner}」
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      ↑ こんな感じで話し始めると良いです
                    </p>
                  </div>
                )}

                {/* 選択ボタン */}
                <button
                  type="button"
                  onClick={() => handleSelect(template)}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {isSelected ? "✓ 選択中" : "このテンプレートを選ぶ"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* おすすめセクション */}
      {recommendedTemplates.length > 0 && !searchQuery && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            あなたにおすすめ
          </h3>
          <div className="space-y-2">
            {recommendedTemplates.map(t => renderTemplateItem(t, true))}
          </div>
        </div>
      )}

      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="テンプレートを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 全テンプレート（カテゴリ別） */}
      <div className="space-y-6">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
          const categoryInfo = categoryLabels[category] || { label: category, color: "" };
          
          return (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className={`${categoryInfo.color}`}>
                  {categoryInfo.label || "その他"}
                </Badge>
                <span className="text-xs">({categoryTemplates.length})</span>
              </h3>
              <div className="space-y-2">
                {categoryTemplates.map(t => renderTemplateItem(t))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 検索結果なし */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>「{searchQuery}」に一致するテンプレートが見つかりません</p>
        </div>
      )}
    </div>
  );
}
