import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-[100]",
            "bg-red-900/90 text-white px-4 py-3 rounded-xl shadow-lg border border-red-500/20",
            "flex items-center gap-3 text-sm font-medium backdrop-blur-md",
            "animate-in slide-in-from-bottom-4 fade-in duration-300"
        )}>
            <div className="p-1.5 bg-red-500/20 rounded-full">
                <WifiOff className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-0.5">
                <span>オフラインです</span>
                <span className="text-xs text-white/50">再接続時に自動的に同期されます</span>
            </div>
        </div>
    );
}
