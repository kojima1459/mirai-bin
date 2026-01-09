
import { Mic, FileText, Sparkles, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateCatalogDialog } from "@/components/TemplateCatalogDialog";
import { RouterOutput } from "@/lib/trpc";

type TemplateList = RouterOutput["template"]["list"];

interface TemplateSelectStepProps {
    recipientName: string;
    onRecipientNameChange: (value: string) => void;
    selectedTemplate: string;
    templates: TemplateList | undefined;
    isCatalogOpen: boolean;
    onCatalogOpenChange: (open: boolean) => void;
    onSelectFree: () => void;
    onSelectRaw: () => void;
    onSelectInterview: () => void;
    onSelectFromCatalog: (name: string) => void;
    onNext: () => void;
}

export function TemplateSelectStep({
    recipientName,
    onRecipientNameChange,
    selectedTemplate,
    templates,
    isCatalogOpen,
    onCatalogOpenChange,
    onSelectFree,
    onSelectRaw,
    onSelectInterview,
    onSelectFromCatalog,
    onNext,
}: TemplateSelectStepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tighter text-white">誰に手紙を送りますか？</h2>
                    <p className="text-white/50 text-sm mt-2">受取人の名前を入力してください</p>
                </div>
                <div className="max-w-sm mx-auto">
                    <Input
                        value={recipientName}
                        onChange={(e) => onRecipientNameChange(e.target.value)}
                        placeholder="例：未来の太郎へ、10年後の自分へ"
                        className="bg-white/5 border-white/10 text-white text-center h-12 text-lg focus:bg-white/10"
                    />
                </div>
            </div>

            <div className="border-t border-white/5 pt-8">
                <div className="text-center space-y-2 mb-6">
                    <h2 className="text-xl font-bold tracking-tighter text-white">作成方法を選ぶ</h2>
                    <p className="text-white/50 text-sm">シチュエーションに合わせて選んでください</p>
                </div>

                <div className={`grid gap-4 ${!recipientName.trim() ? "opacity-50 pointer-events-none" : ""}`}>
                    {/* 1. 自由形式 */}
                    <button
                        onClick={onSelectFree}
                        className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 p-6 text-left transition-all hover:bg-white/10 hover:border-white/10 hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-white/10 p-3 text-white group-hover:bg-white/20 transition-colors">
                                <Mic className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white tracking-tight text-lg mb-1">自由に話す</h3>
                                <p className="text-sm text-white/50 leading-relaxed">
                                    テーマを決めずに、想いのままに話しかけます。<br />
                                    AIが良い感じに手紙として整えます。
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* 2. そのまま文字起こし */}
                    <button
                        onClick={onSelectRaw}
                        className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 p-6 text-left transition-all hover:bg-white/10 hover:border-white/10 hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-white/10 p-3 text-white group-hover:bg-white/20 transition-colors">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white tracking-tight text-lg mb-1">話したまま記録</h3>
                                <p className="text-sm text-white/50 leading-relaxed">
                                    AIによる修正を行わず、あなたの言葉を<br />
                                    そのまま「書き起こし」として残します。
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* 3. AIインタビュー */}
                    <button
                        onClick={onSelectInterview}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6 text-left transition-all hover:from-indigo-500/20 hover:to-purple-500/20 hover:border-indigo-500/30 hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-indigo-500/20 p-3 text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-indigo-200 tracking-tight text-lg">AIと話しながら</h3>
                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                        おすすめ
                                    </span>
                                </div>
                                <p className="text-sm text-indigo-200/50 leading-relaxed">
                                    何を書けばいいかわからない時は、<br />
                                    AIからの質問に答えるだけで作れます。
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                <div className={`pt-4 border-t border-white/5 mt-4 ${!recipientName.trim() ? "opacity-50 pointer-events-none" : ""}`}>
                    <Button
                        variant="outline"
                        onClick={() => onCatalogOpenChange(true)}
                        className="w-full h-12 rounded-xl border-white/10 bg-transparent text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all font-normal"
                    >
                        <BookOpen className="mr-2 h-4 w-4" />
                        その他のテンプレートから選ぶ
                    </Button>
                </div>

                {!recipientName.trim() && (
                    <p className="text-center text-red-400 text-xs mt-4 animate-pulse">
                        ※ 先に宛名を入力してください
                    </p>
                )}
            </div>

            {/* 選択中の情報（カタログから選んだ場合など） */}
            {selectedTemplate && selectedTemplate !== "__free__" && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between animate-in fade-in">
                    <div>
                        <p className="text-xs text-white/40 mb-1">選択中のテンプレート</p>
                        <p className="font-semibold text-white">
                            {templates?.find(t => t.name === selectedTemplate)?.displayName || selectedTemplate}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={onNext}
                        className="bg-white text-black hover:bg-white/90 rounded-full font-semibold"
                    >
                        次へ <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </div>
            )}

            <TemplateCatalogDialog
                isOpen={isCatalogOpen}
                onClose={() => onCatalogOpenChange(false)}
                templates={templates || []}
                onSelect={onSelectFromCatalog}
            />
        </div>
    );
}
