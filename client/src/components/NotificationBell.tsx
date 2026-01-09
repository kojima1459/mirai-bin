import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function NotificationBell() {
    const [, navigate] = useLocation();

    const { data } = trpc.notification.unreadCount.useQuery(undefined, {
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const unreadCount = data?.count ?? 0;

    return (
        <button
            onClick={() => navigate("/notifications")}
            className={cn(
                "relative p-2 rounded-full transition-colors",
                "text-white/60 hover:text-white hover:bg-white/5"
            )}
            aria-label="通知"
        >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </button>
    );
}
