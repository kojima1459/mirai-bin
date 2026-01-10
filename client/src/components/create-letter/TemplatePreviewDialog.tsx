import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Check, Mic, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
    id: number;
    name: string;
    displayName: string;
    subtitle: string | null;
    description: string | null;
    category: string | null;
    icon?: string | null;
    recordingGuide?: string | null; // JSON string
    exampleOneLiner?: string | null;
}

interface TemplatePreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (name: string) => void;
    template: Template | null;
}

export function TemplatePreviewDialog({
    isOpen,
    onClose,
    onSelect,
    template
}: TemplatePreviewDialogProps) {
    if (!template) return null;

    const parseGuide = (json: string | null | undefined) => {
        if (!json) return [];
        try {
            return JSON.parse(json) as string[];
        } catch {
            return [];
        }
    };

    const guides = parseGuide(template.recordingGuide);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl w-full bg-[#0a0a0a] border-white/10 p-0 overflow-hidden sm:rounded-3xl flex flex-col md:flex-row h-[85vh] md:h-[600px]">

                {/* Left: Preview Visual (Mock Letter) */}
                <div className="relative flex-1 bg-[#151515] p-8 flex flex-col items-center justify-center overflow-hidden">
                    {/* Background Texture mock */}
                    <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                    <div className="relative z-10 w-full max-w-sm bg-white text-black p-6 shadow-2xl rotate-1 transition-transform duration-500 hover:rotate-0">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/20 blur-xl rounded-full" />

                        {/* Decor */}
                        <div className="w-full border-b border-black/10 pb-4 mb-4 flex justify-between items-center opacity-50">
                            <span className="text-[10px] font-mono tracking-widest">{new Date().getFullYear()}.XX.XX</span>
                            <span className="text-[10px] font-serif">SilentMemo</span>
                        </div>

                        {/* Content Mock */}
                        <div className="space-y-4 font-serif">
                            <p className="text-xl font-bold text-gray-900 mb-6">
                                {template.displayName}
                            </p>

                            <div className="space-y-3 opacity-80">
                                {template.exampleOneLiner ? (
                                    <p className="text-sm leading-8 border-l-2 border-indigo-300 pl-3 italic text-gray-600">
                                        「{template.exampleOneLiner}」
                                    </p>
                                ) : (
                                    <p className="text-sm leading-8 text-gray-400 italic">
                                        ここにあなたの想いが綴られます...
                                    </p>
                                )}

                                <div className="h-px w-12 bg-gray-200 my-4" />

                                <p className="text-xs text-gray-500 leading-relaxed">
                                    {template.subtitle || template.description}
                                </p>
                            </div>
                        </div>

                        {/* Stamp Mock */}
                        <div className="absolute bottom-6 right-6 w-16 h-16 border-2 border-red-900/20 rounded-full flex items-center justify-center rotate-12 opacity-30">
                            <span className="text-[10px] font-mono text-red-900">SEALED</span>
                        </div>
                    </div>
                </div>

                {/* Right: Details & Action */}
                <div className="flex-1 bg-[#0a0a0a] flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">{template.displayName}</h2>
                            <p className="text-sm text-white/50">{template.category || "General"}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mt-2 -mr-2 text-white/30 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {/* Description */}
                        <div className="text-sm text-white/70 leading-relaxed">
                            {template.description}
                        </div>

                        {/* Guides */}
                        {guides.length > 0 && (
                            <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                                <div className="flex items-center gap-2 mb-4 text-indigo-300">
                                    <Mic className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Talking Points</span>
                                </div>
                                <ul className="space-y-3">
                                    {guides.map((g, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-white/80">
                                            <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50">{i + 1}</span>
                                            <span className="leading-tight">{g}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Footer Action */}
                    <div className="p-6 border-t border-white/5 bg-[#050505]">
                        <Button
                            onClick={() => {
                                onSelect(template.name);
                                onClose();
                            }}
                            className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-bold text-base"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            このテンプレートで書く
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
