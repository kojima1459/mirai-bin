import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertTriangle, Lock, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareChecklistGateProps {
    checkedItems: Set<string>;
    onCheckItem: (item: string, checked: boolean) => void;
    className?: string;
}

const CHECKLIST_ITEMS = [
    {
        id: "separate-screenshot",
        label: "リンクとコードを同じスクショに入れません",
        description: "リンクとコードが一緒だと、第三者が開封できてしまいます",
        icon: Eye,
    },
    {
        id: "separate-channel",
        label: "コードはリンクとは別経路で渡します",
        description: "例: リンクはLINE、コードは電話や紙で伝える",
        icon: Lock,
    },
    {
        id: "backup-secure",
        label: "バックアップは自分だけで保管します",
        description: "緊急復号用のバックアップコードは他人に渡しません",
        icon: Download,
    },
] as const;

export const REQUIRED_CHECKLIST_ITEMS = CHECKLIST_ITEMS.map((item) => item.id);

export function ShareChecklistGate({
    checkedItems,
    onCheckItem,
    className,
}: ShareChecklistGateProps) {
    const allChecked = REQUIRED_CHECKLIST_ITEMS.every((id) => checkedItems.has(id));

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">共有前の確認</span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-4">
                <p className="text-xs text-amber-200/80">
                    共有事故を防ぐため、以下を確認してください。
                    すべてチェックすると共有機能が有効になります。
                </p>

                <div className="space-y-3">
                    {CHECKLIST_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isChecked = checkedItems.has(item.id);

                        return (
                            <label
                                key={item.id}
                                htmlFor={item.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    isChecked
                                        ? "bg-green-500/10 border-green-500/30"
                                        : "bg-white/5 border-white/10 hover:border-white/20"
                                )}
                            >
                                <Checkbox
                                    id={item.id}
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                        onCheckItem(item.id, checked === true)
                                    }
                                    className="mt-0.5 border-white/30 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            className={cn(
                                                "h-4 w-4",
                                                isChecked ? "text-green-400" : "text-white/50"
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                "text-sm font-medium",
                                                isChecked ? "text-green-300" : "text-white/80"
                                            )}
                                        >
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/40">{item.description}</p>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            {allChecked && (
                <div className="flex items-center gap-2 text-green-400 text-sm animate-in fade-in slide-in-from-bottom-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>確認完了 - 共有機能が有効になりました</span>
                </div>
            )}
        </div>
    );
}

export function useShareChecklist() {
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

    const handleCheckItem = (item: string, checked: boolean) => {
        setCheckedItems((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(item);
            } else {
                next.delete(item);
            }
            return next;
        });
    };

    const isGatePassed = REQUIRED_CHECKLIST_ITEMS.every((id) =>
        checkedItems.has(id)
    );

    return {
        checkedItems,
        handleCheckItem,
        isGatePassed,
    };
}

import { useState } from "react";
