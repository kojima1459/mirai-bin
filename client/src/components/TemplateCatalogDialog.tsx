
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplatePreviewDialog } from "@/components/create-letter/TemplatePreviewDialog";

interface Template {
    id: number;
    name: string;
    displayName: string;
    subtitle: string | null;
    description: string | null;
    category: string | null;
    sortOrder: number | null;
}

interface TemplateCatalogDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (name: string) => void;
    templates: Template[];
}

// Manual mapping to ensure all templates are categorized correctly
const TEMPLATE_CATEGORY_MAP: Record<string, string> = {
    // Milestone
    "birthday": "milestone",
    "middle-school-graduation": "milestone",
    "high-school-entrance": "milestone",
    "high-school-graduation": "milestone",
    "university-entrance": "milestone",
    "first-job": "milestone",
    "wedding-day": "milestone",
    "becoming-parent": "milestone",
    "coming-of-age": "milestone",

    // Emotion
    "first-love": "emotion",

    // Parent Truth
    "difficult-times": "parent-truth",

    // Ritual
    "someday": "ritual",
};

const CATEGORIES = [
    { id: "all", label: "すべて" },
    { id: "milestone", label: "人生の節目" },
    { id: "emotion", label: "感情サポート" },
    { id: "parent-truth", label: "親の本音" },
    { id: "ritual", label: "未来の儀式" },
];

export function TemplateCatalogDialog({
    isOpen,
    onClose,
    onSelect,
    templates = []
}: TemplateCatalogDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

    const filteredTemplates = useMemo(() => {
        let filtered = templates;

        // 1. Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.displayName.toLowerCase().includes(query) ||
                (t.subtitle && t.subtitle.toLowerCase().includes(query)) ||
                (t.description && t.description.toLowerCase().includes(query))
            );
        }

        // 2. Category Filter
        if (selectedCategory !== "all") {
            filtered = filtered.filter(t => {
                const cat = TEMPLATE_CATEGORY_MAP[t.name] || "other";
                return cat === selectedCategory;
            });
        }

        // 3. Sort
        return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [templates, searchQuery, selectedCategory]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md w-full bg-[#0a0a0a] border-white/10 p-0 gap-0 text-white sm:rounded-2xl h-[90vh] sm:h-[80vh] flex flex-col overflow-hidden outline-none">
                <DialogTitle className="sr-only">テンプレートを探す</DialogTitle>
                <DialogDescription className="sr-only">カテゴリやキーワードから最適な手紙のテンプレートを選択できます</DialogDescription>

                {/* Header Section */}
                <div className="flex flex-col border-b border-white/10 bg-[#0a0a0a] z-10 shrink-0">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between p-4 pb-2">
                        <h2 className="text-lg font-bold tracking-tight">テンプレートを探す</h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/5"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="px-4 pb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="キーワードで検索..."
                                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-10 rounded-xl focus:bg-white/10 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Category Pills (Horizontal Scroll) */}
                    <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
                        <div className="flex items-center gap-2 min-w-max">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                                        selectedCategory === cat.id
                                            ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                            : "bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#050505] p-4">
                    {filteredTemplates.length > 0 ? (
                        <div className="space-y-3 pb-20">
                            {filteredTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => setPreviewTemplate(template)}
                                    className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 transition-all group flex items-center gap-4 active:scale-[0.98]"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-white/90 text-base">
                                                {template.displayName}
                                            </span>
                                            {/* Optional Category Tag if "All" is selected */}
                                            {selectedCategory === "all" && TEMPLATE_CATEGORY_MAP[template.name] && (
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full border border-white/10",
                                                    TEMPLATE_CATEGORY_MAP[template.name] === "milestone" ? "bg-blue-500/10 text-blue-300 border-blue-500/20" :
                                                        TEMPLATE_CATEGORY_MAP[template.name] === "emotion" ? "bg-pink-500/10 text-pink-300 border-pink-500/20" :
                                                            TEMPLATE_CATEGORY_MAP[template.name] === "parent-truth" ? "bg-purple-500/10 text-purple-300 border-purple-500/20" :
                                                                "bg-white/10 text-white/50"
                                                )}>
                                                    {CATEGORIES.find(c => c.id === TEMPLATE_CATEGORY_MAP[template.name])?.label}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">
                                            {template.subtitle || template.description}
                                        </p>
                                    </div>
                                    <Eye className="h-5 w-5 text-white/20 group-hover:text-white/60 transition-colors" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-white/30 gap-3 pb-20">
                            <Search className="h-10 w-10 opacity-20" />
                            <p>条件に一致するテンプレートがありません</p>
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedCategory("all");
                                }}
                                className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
                            >
                                条件をクリア
                            </button>
                        </div>
                    )}
                </div>
            </DialogContent>

            <TemplatePreviewDialog
                isOpen={!!previewTemplate}
                onClose={() => setPreviewTemplate(null)}
                template={previewTemplate}
                onSelect={onSelect}
            />
        </Dialog>
    );
}
