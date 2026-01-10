
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2, Calendar, Bell, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReviewStepProps {
    isRawMode: boolean;
    transcription: string;
    finalContent: string;
    onFinalContentChange: (value: string) => void;
    recipientName: string;
    onRecipientNameChange: (value: string) => void;
    unlockDate: Date | undefined;
    onUnlockDateSelect: (date: Date | undefined) => void;
    unlockTime: string;
    onUnlockTimeChange: (value: string) => void;
    reminderEnabled: boolean;
    onReminderEnabledChange: (enabled: boolean) => void;
    reminderDays: number[];
    onReminderDaysChange: (days: number[]) => void;
    isEncrypting: boolean;
    onSave: () => void;
}

export function ReviewStep({
    isRawMode,
    transcription,
    finalContent,
    onFinalContentChange,
    recipientName,
    onRecipientNameChange,
    unlockDate,
    onUnlockDateSelect,
    unlockTime,
    onUnlockTimeChange,
    reminderEnabled,
    onReminderEnabledChange,
    reminderDays,
    onReminderDaysChange,
    isEncrypting,
    onSave,
}: ReviewStepProps) {

    const toggleReminderDay = (day: number) => {
        if (reminderDays.includes(day)) {
            onReminderDaysChange(reminderDays.filter(d => d !== day));
        } else {
            onReminderDaysChange([...reminderDays, day]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold tracking-tight text-white">内容の最終確認</h3>
                    <span className="text-[10px] bg-white/10 text-white/40 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                        {isRawMode ? "Stream" : "Draft"}
                    </span>
                </div>

                {/* 文字起こし結果 */}
                {transcription && (
                    <div className="space-y-2">
                        <Label className="text-xs text-white/40 uppercase tracking-widest">Original Audio Text</Label>
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-sm text-white/60 leading-relaxed max-h-32 overflow-y-auto">
                            {transcription}
                        </div>
                    </div>
                )}

                {/* 手紙の内容 */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="finalContent" className="text-xs text-white/40 uppercase tracking-widest">Letter Content</Label>
                    </div>
                    <Textarea
                        id="finalContent"
                        value={finalContent}
                        onChange={(e) => onFinalContentChange(e.target.value)}
                        rows={12}
                        className="resize-none bg-transparent border-white/10 text-white text-base leading-loose p-6 focus:ring-1 focus:ring-white/20 focus:border-white/20 rounded-xl"
                        placeholder="ここに手紙の内容が表示されます..."
                    />
                </div>
            </div>

            {/* 送信先・日付設定 */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-bold tracking-tight text-white border-b border-white/5 pb-4">お届け先の設定</h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-sm text-white/60">宛先の名前</Label>
                        <Input
                            value={recipientName}
                            onChange={(e) => onRecipientNameChange(e.target.value)}
                            className="bg-black/20 border-white/10 text-white h-11"
                            placeholder="例：未来の○○へ"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm text-white/60">開封可能になる日時</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="time"
                                value={unlockTime}
                                onChange={(e) => onUnlockTimeChange(e.target.value)}
                                className="w-24 bg-black/20 border-white/10 text-white"
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] pl-3 text-left font-normal bg-black/20 border-white/10 text-white hover:bg-white/5 hover:text-white",
                                            !unlockDate && "text-muted-foreground"
                                        )}
                                    >
                                        {unlockDate ? (
                                            format(unlockDate, "yyyy/MM/dd", { locale: ja })
                                        ) : (
                                            <span>日付を選択</span>
                                        )}
                                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-[#1a1a1a] border-white/10 text-white" align="start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={unlockDate}
                                        onSelect={onUnlockDateSelect}
                                        initialFocus
                                        locale={ja}
                                        className="bg-[#1a1a1a] text-white"
                                        classNames={{
                                            day_selected: "bg-white text-black hover:bg-white hover:text-black focus:bg-white focus:text-black",
                                            day_today: "bg-white/10 text-white",
                                        }}
                                        disabled={(date) => date < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <Bell className="h-5 w-5 text-indigo-300 mt-0.5" />
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="reminder" className="text-sm font-medium text-indigo-200 cursor-pointer">
                                    開封日にお知らせ通知を受け取る
                                </Label>
                                <Checkbox
                                    id="reminder"
                                    checked={reminderEnabled}
                                    onCheckedChange={(checked) => onReminderEnabledChange(!!checked)}
                                    className="border-indigo-400 data-[state=checked]:bg-indigo-500 data-[state=checked]:text-white"
                                />
                            </div>

                            {reminderEnabled && (
                                <div className="pl-0 animate-in slide-in-from-top-2">
                                    <p className="text-xs text-indigo-200/60 mb-2">通知するタイミング:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                            <button
                                                key={day}
                                                onClick={() => toggleReminderDay(day)}
                                                className={cn(
                                                    "text-xs px-3 py-1.5 rounded-full border transition-all",
                                                    reminderDays.includes(day)
                                                        ? "bg-indigo-500 text-white border-indigo-500"
                                                        : "bg-transparent text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                                                )}
                                            >
                                                {day}日前
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 flex justify-center pb-20">
                <Button
                    size="lg"
                    onClick={onSave}
                    disabled={!finalContent.trim() || !unlockDate || isEncrypting}
                    className="w-full max-w-sm h-14 text-lg font-bold rounded-full bg-white text-black hover:bg-white/90 shadow-[0_0_50px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:shadow-none transition-all"
                >
                    {isEncrypting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            封印中...
                        </>
                    ) : (
                        <>
                            未来へ封印する
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>        </div>
    );
}
