import { Badge } from "@/components/ui/badge";
import { getLetterStatus, type LetterStatusInfo } from "@/lib/letterStatus";
import {
    FileEdit,
    Lock,
    Clock,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LetterStatusBadgeProps {
    letter: {
        status: string;
        shareToken?: string | null;
        unlockAt?: string | null;
        unlockedAt?: string | null;
    };
    showTooltip?: boolean;
}

const statusIcons = {
    draft: FileEdit,
    sealed_not_shared: Lock,
    awaiting_unlock: Clock,
    ready_to_unlock: Sparkles,
    unlocked: CheckCircle2,
};

export function LetterStatusBadge({ letter, showTooltip = true }: LetterStatusBadgeProps) {
    const statusInfo: LetterStatusInfo = getLetterStatus(letter);
    const Icon = statusIcons[statusInfo.status];

    const badge = (
        <Badge
            variant={statusInfo.badge.variant as any}
            className={`${statusInfo.badge.className} flex items-center gap-1`}
        >
            <Icon className="h-3 w-3" />
            <span>{statusInfo.badge.text}</span>
        </Badge>
    );

    if (!showTooltip) {
        return badge;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {badge}
            </TooltipTrigger>
            <TooltipContent>
                <p className="text-sm">{statusInfo.description}</p>
            </TooltipContent>
        </Tooltip>
    );
}
